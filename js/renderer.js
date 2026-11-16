/**
 * renderer.js - フルスクリーン運行ダイヤグラム (スジ引き) 描画エンジン
 * 41駅・単線複線インジケータ・スムーズ縦＆横スクロール対応
 * ドラッグ方向制限 (前倒し禁止)、出発点以降遅延、最小停車時間30秒回復プレビュー、衝突箇所赤色警告描画
 */
window.TrainGame = window.TrainGame || {};

(function(TG) {
  'use strict';

  class DiagramRenderer {
    constructor(canvas, sim) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.sim = sim;

      // ビューポート (カメラ・ズーム・パン)
      this.zoomX = 1.0; // 時間軸ズーム
      this.zoomY = 1.0; // 駅距離軸ズーム
      this.panX = 0;    // 水平スクロールオフセット (px)
      this.panY = 0;    // 垂直スクロールオフセット (px)

      // インタラクション状態
      this.selectedTrainId = null;
      this.hoveredNode = null;
      this.hoveredStation = null;
      this.hoveredTrainHit = null;

      // スジのドラッグ操作用
      this.isDraggingTrain = false;
      this.draggedTrain = null;
      this.dragFromStopIdx = null; // 改善点2: カーソルが合わせられた線の出発点インデックス
      this.dragStartX = 0;
      this.dragCurrentShiftSec = 0; // 改善点1: 常に >= 0 (前倒し禁止)

      // パン操作用 (キャンバス背景ドラッグ)
      this.isPanning = false;
      this.panStartX = 0;
      this.panStartY = 0;

      // 縦スクロールバードラッグ用
      this.isDraggingVScrollBar = false;
      this.vScrollBarDragStartY = 0;
      this.vScrollBarDragStartPanY = 0;

      // 横スクロールバードラッグ用
      this.isDraggingHScrollBar = false;
      this.hScrollBarDragStartX = 0;
      this.hScrollBarDragStartPanX = 0;

      // アニメーション用タイマー
      this.pulseTime = 0;

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      // マウス & キーボード操作のバインド
      this.initInteractions();
    }

    resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width > 0 ? rect.width : (this.canvas.parentElement?.clientWidth || 1200);
      this.height = rect.height > 0 ? rect.height : (this.canvas.parentElement?.clientHeight || 800);

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.clampPan();
    }

    // 縦全高（41駅をゆったりスジ引きできるベース高さ）
    getBaseHeight() {
      return Math.max(2200, (this.height - 80) * 2.4 * this.zoomY);
    }

    // 1時間あたりの基本ピクセル幅 (ズーム対応)
    getPxPerHour() {
      return 700 * this.zoomX;
    }

    // パン範囲のクランプ（はみ出し防止）
    clampPan() {
      const baseH = this.getBaseHeight();
      const minPanY = Math.min(0, this.height - baseH - 80);
      const maxPanY = 30;
      this.panY = Math.max(minPanY, Math.min(maxPanY, this.panY));

      const maxPanX = 20;
      const hoursAhead = Math.max(12, (this.sim.currentTime - TG.CONFIG.START_TIME) / 3600 + 6);
      const minPanX = -hoursAhead * this.getPxPerHour();
      this.panX = Math.max(minPanX, Math.min(maxPanX, this.panX));
    }

    // 指定駅へ縦スクロールジャンプ
    scrollToStation(stationId) {
      const st = TG.getStation(stationId);
      if (!st) return;

      const totalKm = 170.2;
      const topMargin = 40;
      const baseHeight = this.getBaseHeight();

      const targetYWithoutPan = topMargin + (st.distance / totalKm) * baseHeight;
      this.panY = 120 - targetYWithoutPan;
      this.clampPan();
    }

    // 指定時刻へ横スクロールジャンプ
    scrollToTime(sec) {
      const tStart = TG.CONFIG.START_TIME;
      const leftMargin = 120;
      const pxPerHour = this.getPxPerHour();

      const targetXWithoutPan = ((sec - tStart) / 3600) * pxPerHour;
      const viewCenter = (this.width - leftMargin) / 2;
      this.panX = viewCenter - targetXWithoutPan;
      this.clampPan();
    }

    scrollByTime(deltaSec) {
      const pxPerHour = this.getPxPerHour();
      const deltaX = (deltaSec / 3600) * pxPerHour;
      this.panX -= deltaX;
      this.clampPan();
    }

    scrollToCurrentTime() {
      this.scrollToTime(this.sim.currentTime);
    }

    // 座標変換ヘルパー
    timeToX(sec) {
      const tStart = TG.CONFIG.START_TIME;
      const leftMargin = 120;
      const pxPerHour = this.getPxPerHour();

      return leftMargin + this.panX + ((sec - tStart) / 3600) * pxPerHour;
    }

    xToTime(x) {
      const tStart = TG.CONFIG.START_TIME;
      const leftMargin = 120;
      const pxPerHour = this.getPxPerHour();

      const hours = (x - leftMargin - this.panX) / pxPerHour;
      return tStart + hours * 3600;
    }

    distToY(dist) {
      const totalKm = 170.2;
      const topMargin = 40;
      const baseHeight = this.getBaseHeight();

      return topMargin + this.panY + (dist / totalKm) * baseHeight;
    }

    yToDist(y) {
      const totalKm = 170.2;
      const topMargin = 40;
      const baseHeight = this.getBaseHeight();

      return ((y - topMargin - this.panY) / baseHeight) * totalKm;
    }

    // メイン描画ループ
    render() {
      this.pulseTime = (this.pulseTime + 0.05) % (Math.PI * 2);

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;

      ctx.clearRect(0, 0, w, h);

      // 背景 (CTCダイヤ盤・深海ネイビー)
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // 1. グリッド線描画
      this.renderGrid(ctx, w, h);

      // 2. 単線・複線インジケータ描画
      this.renderTrackTypeIndicators(ctx, w, h);

      // 3. 計画ダイヤ（薄い点線）描画
      this.renderPlannedTimetable(ctx);

      // 4. 運行実績・見込みダイヤ（実線）＆衝突赤色ハイライト描画
      this.renderActualTimetable(ctx);

      // 5. 衝突交差マーカー描画 (改善点4)
      this.renderConflictMarkers(ctx);

      // 6. ドラッグ中の仮スジプレビュー描画 (改善点1, 2, 3)
      if (this.isDraggingTrain && this.draggedTrain) {
        this.renderGhostTrain(ctx, this.draggedTrain);
      }

      // 7. 現在時刻ライン（赤縦線）
      this.renderCurrentTimeLine(ctx, h);

      // 8. 駅名ヘッダーカラム（左側固定オーバーレイ）
      this.renderStationColumn(ctx, h);

      // 9. スクロールバー描画 (縦＆横)
      this.renderScrollBars(ctx, w, h);
    }

    // --- 1. グリッド描画 ---
    renderGrid(ctx, w, h) {
      const tMin = Math.max(TG.CONFIG.START_TIME, Math.floor(this.xToTime(120) / 300) * 300);
      const tMax = Math.ceil(this.xToTime(w) / 300) * 300;

      for (let sec = tMin; sec <= tMax; sec += 300) {
        const x = this.timeToX(sec);
        if (x < 120 || x > w) continue;

        const is30Min = (sec % 1800) === 0;
        const is15Min = (sec % 900) === 0;

        ctx.strokeStyle = is30Min ? '#334155' : is15Min ? '#1e293b' : '#0f172a';
        ctx.lineWidth = is30Min ? 1.5 : is15Min ? 1 : 0.5;

        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 14);
        ctx.stroke();

        if (is15Min) {
          ctx.fillStyle = is30Min ? '#cbd5e1' : '#64748b';
          ctx.font = is30Min ? 'bold 11px monospace' : '10px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(TG.formatTimeShort(sec), x, 6);
        }
      }

      TG.CONFIG.STATIONS.forEach(st => {
        const y = this.distToY(st.distance);
        if (y < 0 || y > h - 14) return;

        const isAtamiBoundary = st.id === 'atami';

        if (isAtamiBoundary) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(120, y);
          ctx.lineTo(w, y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = st.isMajor ? '#1e293b' : '#0f172a';
          ctx.lineWidth = st.isMajor ? 1 : 0.5;
          ctx.beginPath();
          ctx.moveTo(120, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      });
    }

    // --- 2. 単線・複線インジケータ ---
    renderTrackTypeIndicators(ctx, w, h) {
      const yAtami = this.distToY(104.6);
      const yTokyo = this.distToY(0.0);
      const yShimoda = this.distToY(170.2);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.02)';
      ctx.fillRect(120, Math.max(0, yTokyo), w - 120, Math.max(0, yAtami - yTokyo));

      ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
      ctx.fillRect(120, Math.max(0, yAtami), w - 120, Math.max(0, yShimoda - yAtami));
    }

    // --- 3. 計画ダイヤ（点線）描画 ---
    renderPlannedTimetable(ctx) {
      ctx.setLineDash([3, 4]);

      const tMin = this.xToTime(120);
      const tMax = this.xToTime(this.width);
      const minCycle = Math.max(0, Math.floor((tMin - TG.CONFIG.START_TIME) / 3600));
      const maxCycle = Math.max(minCycle, Math.ceil((tMax - TG.CONFIG.START_TIME) / 3600) + 1);

      for (let c = minCycle; c <= maxCycle; c++) {
        const cycleTrains = TG.CONFIG.generateCycleTrains(c);
        cycleTrains.forEach(tDef => {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
          ctx.lineWidth = 1;
          ctx.beginPath();

          tDef.stops.forEach((stop, idx) => {
            const st = TG.getStation(stop.stationId);
            if (!st) return;
            const y = this.distToY(st.distance);
            const xArr = stop.arr > 0 ? this.timeToX(stop.arr) : this.timeToX(stop.dep);
            const xDep = stop.dep > 0 ? this.timeToX(stop.dep) : xArr;

            if (idx === 0) {
              ctx.moveTo(xDep, y);
            } else {
              ctx.lineTo(xArr, y);
              if (xDep !== xArr) {
                ctx.lineTo(xDep, y);
              }
            }
          });
          ctx.stroke();
        });
      }

      ctx.setLineDash([]);
    }

    // --- 4. 運行実績・見込みダイヤ（実線）＆ 衝突赤色ハイライト (改善点4) ---
    renderActualTimetable(ctx) {
      const pulse = Math.sin(this.pulseTime) * 0.5 + 0.5; // 0.0〜1.0

      this.sim.trains.forEach(train => {
        const isSelected = this.selectedTrainId === train.id;
        const baseColor = train.typeConfig.color;
        const stops = train.stops;

        // 各駅間セグメントごとに衝突判定を行い描画
        for (let idx = 0; idx < stops.length - 1; idx++) {
          const s1 = stops[idx];
          const s2 = stops[idx + 1];
          const st1 = TG.getStation(s1.stationId);
          const st2 = TG.getStation(s2.stationId);
          if (!st1 || !st2) continue;

          const y1 = this.distToY(st1.distance);
          const y2 = this.distToY(st2.distance);

          const tDep1 = s1.dep > 0 ? s1.dep : s1.arr;
          const tArr2 = s2.arr > 0 ? s2.arr : s2.dep;

          const xDep1 = this.timeToX(tDep1);
          const xArr2 = this.timeToX(tArr2);

          // 改善点4: 列車の衝突が起こるような事態が発生していたら、そこの線の色を変えわかりやすくすること
          const isConflict = this.sim.isSegmentConflict(train.id, idx);

          ctx.beginPath();
          ctx.moveTo(xDep1, y1);
          ctx.lineTo(xArr2, y2);

          if (isConflict) {
            // 衝突スジ: 警告ネオンレッド + 太線 + パルス光彩
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.75 + pulse * 0.25})`;
            ctx.lineWidth = isSelected ? 5.5 : 4.0;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
            ctx.shadowBlur = 8 + pulse * 6;
          } else {
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = isSelected ? 3.5 : 2.0;
            ctx.shadowBlur = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // リセット

          // 駅停車中の水平線 (s1駅での停車)
          if (s1.arr > 0 && s1.dep > 0 && s1.dep > s1.arr) {
            const xArr1 = this.timeToX(s1.arr);
            ctx.beginPath();
            ctx.moveTo(xArr1, y1);
            ctx.lineTo(xDep1, y1);
            ctx.strokeStyle = baseColor;
            ctx.lineWidth = isSelected ? 3.0 : 1.5;
            ctx.stroke();
          }
        }

        // 列車名ラベル
        const firstStop = stops[0];
        const st0 = TG.getStation(firstStop.stationId);
        if (st0) {
          const y0 = this.distToY(st0.distance);
          const x0 = this.timeToX(firstStop.dep > 0 ? firstStop.dep : firstStop.arr);

          ctx.fillStyle = baseColor;
          ctx.font = isSelected ? 'bold 12px sans-serif' : '10px sans-serif';
          ctx.textAlign = train.direction === 'down' ? 'left' : 'right';
          ctx.fillText(train.name, x0 + (train.direction === 'down' ? 6 : -6), y0 + (train.direction === 'down' ? -6 : 14));
        }

        // 各駅の交点ノード（丸印）描画
        stops.forEach(stop => {
          const st = TG.getStation(stop.stationId);
          if (!st) return;
          const y = this.distToY(st.distance);
          const tNode = stop.arr > 0 ? stop.arr : stop.dep;
          const xNode = this.timeToX(tNode);

          const isHovered = this.hoveredNode && 
            this.hoveredNode.trainId === train.id && 
            this.hoveredNode.stationId === stop.stationId;

          // 改善点4: ノードの衝突チェック
          const isNodeConflict = this.sim.isNodeConflict(train.id, stop.stationId);

          let radius = isHovered ? 6.5 : 3.5;
          let nodeColor = isHovered ? '#ffffff' : baseColor;

          if (isNodeConflict) {
            radius = 6.0;
            nodeColor = '#ef4444'; // 警告赤色
            ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
            ctx.shadowBlur = 10;
          }

          ctx.fillStyle = nodeColor;
          ctx.beginPath();
          ctx.arc(xNode, y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          if (isHovered) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (isNodeConflict) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      });
    }

    // --- 5. 衝突交差マーカー描画 (改善点4) ---
    renderConflictMarkers(ctx) {
      if (!this.sim.conflicts || this.sim.conflicts.length === 0) return;

      const pulse = Math.sin(this.pulseTime) * 4;

      this.sim.conflicts.forEach(c => {
        const cx = this.timeToX(c.time);
        const cy = this.distToY(c.dist);

        if (cx < 120 || cx > this.width || cy < 0 || cy > this.height) return;

        // 赤色光彩波紋リング
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 10 + pulse, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();

        // 警告バッジテキスト
        ctx.font = 'bold 10px sans-serif';
        const label = '⚠️ 衝突危機';
        const tw = ctx.measureText(label).width + 8;
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(cx - tw / 2, cy - 22, tw, 16);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(cx - tw / 2, cy - 22, tw, 16);

        ctx.fillStyle = '#fecaca';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy - 14);
      });
    }

    // --- 6. ドラッグ中の仮スジプレビュー (改善点1, 2, 3) ---
    renderGhostTrain(ctx, train) {
      const fromIdx = this.dragFromStopIdx !== null ? this.dragFromStopIdx : 0;
      const shiftSec = this.dragCurrentShiftSec; // 常に >= 0 (前倒し禁止)

      // 改善点2 & 3: 出発点以降のみ遅延＋最小停車時間30秒＆自動遅延回復ロジック適用
      const ghostStops = train.calculateDelayedSchedule(fromIdx, shiftSec);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2.8;
      ctx.setLineDash([5, 3]);

      ctx.beginPath();
      let plotted = false;

      ghostStops.forEach(stop => {
        const st = TG.getStation(stop.stationId);
        if (!st) return;
        const y = this.distToY(st.distance);

        const depTime = stop.dep > 0 ? stop.dep : null;
        const arrTime = stop.arr > 0 ? stop.arr : depTime;

        const xArr = this.timeToX(arrTime);
        const xDep = depTime ? this.timeToX(depTime) : xArr;

        if (!plotted) {
          ctx.moveTo(xDep, y);
          plotted = true;
        } else {
          ctx.lineTo(xArr, y);
          if (xDep !== xArr) {
            ctx.lineTo(xDep, y);
          }
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // 出発点ノード (ドラッグ対象駅) に強調リング
      const startStop = ghostStops[fromIdx];
      const stFrom = TG.getStation(startStop.stationId);
      if (stFrom) {
        const yFrom = this.distToY(stFrom.distance);
        const xFrom = this.timeToX(startStop.dep > 0 ? startStop.dep : startStop.arr);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(xFrom, yFrom, 9, 0, Math.PI * 2);
        ctx.stroke();

        // 情報バッジ
        const shiftMin = Math.round(shiftSec / 60);
        const badgeText = `[${stFrom.name}発] +${shiftMin}分遅延 (最小停車30秒で自動回復)`;

        ctx.font = 'bold 11px sans-serif';
        const bw = ctx.measureText(badgeText).width + 16;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(xFrom - bw / 2, yFrom - 28, bw, 22);
        ctx.strokeStyle = '#facc15';
        ctx.strokeRect(xFrom - bw / 2, yFrom - 28, bw, 22);

        ctx.fillStyle = '#facc15';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, xFrom, yFrom - 17);
      }
    }

    // --- 7. 現在時刻バー ---
    renderCurrentTimeLine(ctx, h) {
      const nowX = this.timeToX(this.sim.currentTime);
      if (nowX >= 120 && nowX <= this.width) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nowX, 0);
        ctx.lineTo(nowX, h - 14);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(nowX, 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- 8. 駅名ヘッダーカラム（左側固定パネル） ---
    renderStationColumn(ctx, h) {
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, 120, h);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(120, 0);
      ctx.lineTo(120, h);
      ctx.stroke();

      const yAtami = this.distToY(104.6);
      const yTokyo = this.distToY(0.0);
      const yShimoda = this.distToY(170.2);

      // 複線帯 (青 ║)
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(112, Math.max(0, yTokyo), 6, Math.max(0, yAtami - yTokyo));

      // 単線帯 (橙 │)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(114, Math.max(0, yAtami), 2, Math.max(0, yShimoda - yAtami));

      // ラベル
      ctx.fillStyle = '#38bdf8';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('║ 複線区間', 6, 22);

      if (yAtami >= 0 && yAtami <= h) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('│ 単線区間', 6, yAtami + 14);
      }

      // 各駅名
      TG.CONFIG.STATIONS.forEach(st => {
        const y = this.distToY(st.distance);
        if (y < 10 || y > h - 20) return;

        const isHovered = this.hoveredStation && this.hoveredStation.id === st.id;

        if (st.isMajor || isHovered) {
          ctx.fillStyle = isHovered ? '#1e293b' : 'rgba(30, 41, 59, 0.6)';
          ctx.fillRect(14, y - 9, 94, 18);
          ctx.strokeStyle = isHovered ? '#38bdf8' : '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(14, y - 9, 94, 18);
        }

        ctx.fillStyle = isHovered ? '#38bdf8' : st.isMajor ? '#f8fafc' : '#94a3b8';
        ctx.font = st.isMajor ? 'bold 11px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.name, 60, y);
      });
    }

    // --- 9. スクロールバー描画 (縦＆横) ---
    renderScrollBars(ctx, w, h) {
      const baseH = this.getBaseHeight();
      if (baseH > h) {
        const barWidth = 8;
        const barX = w - barWidth - 4;
        const trackHeight = h - 24;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)';
        ctx.fillRect(barX, 10, barWidth, trackHeight);

        const thumbHeight = Math.max(30, (h / baseH) * trackHeight);
        const scrollableDist = baseH - h;
        const currentScrollRatio = Math.max(0, Math.min(1, (-this.panY) / (scrollableDist + 60)));
        const thumbY = 10 + currentScrollRatio * (trackHeight - thumbHeight);

        ctx.fillStyle = this.isDraggingVScrollBar ? '#38bdf8' : 'rgba(148, 163, 184, 0.5)';
        ctx.beginPath();
        ctx.roundRect(barX, thumbY, barWidth, thumbHeight, 4);
        ctx.fill();
      }

      const maxHours = Math.max(12, (this.sim.currentTime - TG.CONFIG.START_TIME) / 3600 + 6);
      const totalWidthX = maxHours * this.getPxPerHour();
      const visibleW = w - 120;
      if (totalWidthX > visibleW) {
        const barHeight = 8;
        const barY = h - barHeight - 3;
        const trackStartX = 124;
        const trackWidth = w - trackStartX - 16;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
        ctx.fillRect(trackStartX, barY, trackWidth, barHeight);

        const thumbWidth = Math.max(40, (visibleW / totalWidthX) * trackWidth);
        const scrollableDistX = totalWidthX - visibleW;
        const currentScrollRatioX = Math.max(0, Math.min(1, (-this.panX) / (scrollableDistX + 40)));
        const thumbX = trackStartX + currentScrollRatioX * (trackWidth - thumbWidth);

        ctx.fillStyle = this.isDraggingHScrollBar ? '#38bdf8' : 'rgba(148, 163, 184, 0.5)';
        ctx.beginPath();
        ctx.roundRect(thumbX, barY, thumbWidth, barHeight, 4);
        ctx.fill();
      }
    }

    // --- インタラクション (マウス・ズーム・縦横スクロール・ドラッグ) ---
    initInteractions() {
      // マウスホイール (縦スクロール & 横スクロール)
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey) {
          const factor = e.deltaY < 0 ? 1.15 : 0.85;
          this.zoomX = Math.max(0.6, Math.min(4.0, this.zoomX * factor));
        } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          const dx = e.deltaX !== 0 ? e.deltaX : e.deltaY;
          this.panX -= dx * 1.1;
        } else {
          this.panY -= e.deltaY * 0.85;
        }

        this.clampPan();
      }, { passive: false });

      // キーボード操作
      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        if (e.key === 'ArrowUp') {
          this.panY += 60;
          this.clampPan();
        } else if (e.key === 'ArrowDown') {
          this.panY -= 60;
          this.clampPan();
        } else if (e.key === 'ArrowLeft') {
          this.panX += 80;
          this.clampPan();
        } else if (e.key === 'ArrowRight') {
          this.panX -= 80;
          this.clampPan();
        }
      });

      // マウスダウン
      this.canvas.addEventListener('mousedown', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 1. 縦スクロールバー
        if (mx >= this.width - 20) {
          this.isDraggingVScrollBar = true;
          this.vScrollBarDragStartY = my;
          this.vScrollBarDragStartPanY = this.panY;
          return;
        }

        // 2. 横スクロールバー
        if (my >= this.height - 16 && mx >= 120) {
          this.isDraggingHScrollBar = true;
          this.hScrollBarDragStartX = mx;
          this.hScrollBarDragStartPanX = this.panX;
          return;
        }

        // 3. 左カラム（駅名）クリック
        if (mx <= 120) {
          const clickedSt = this.findStationAt(my);
          if (clickedSt && TG.UI && TG.UI.openStationYardModal) {
            TG.UI.openStationYardModal(clickedSt);
          }
          return;
        }

        // 4. ノード（駅・スジ交点）クリック
        const node = this.findNodeAt(mx, my);
        if (node) {
          if (TG.UI && TG.UI.openNodeEditModal) {
            TG.UI.openNodeEditModal(node.trainId, node.stationId);
          }
          return;
        }

        // 5. スジのクリック＆ドラッグ開始判定 (改善点1 & 2)
        const hit = this.findTrainLineAt(mx, my);
        if (hit) {
          this.isDraggingTrain = true;
          this.draggedTrain = hit.train;
          this.dragFromStopIdx = hit.fromStopIdx; // 改善点2: カーソルが合わされた線の出発点
          this.selectedTrainId = hit.train.id;
          this.dragStartX = mx;
          this.dragCurrentShiftSec = 0;
          this.canvas.style.cursor = 'ew-resize';
          return;
        }

        // 6. 背景ドラッグ
        this.isPanning = true;
        this.panStartX = mx - this.panX;
        this.panStartY = my - this.panY;
        this.canvas.style.cursor = 'grab';
      });

      // マウス移動
      window.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (this.isDraggingVScrollBar) {
          const baseH = this.getBaseHeight();
          const trackHeight = this.height - 24;
          const deltaY = my - this.vScrollBarDragStartY;
          const scrollableDist = baseH - this.height;
          const scrollRatioDelta = deltaY / trackHeight;

          this.panY = this.vScrollBarDragStartPanY - scrollRatioDelta * scrollableDist;
          this.clampPan();
          return;
        }

        if (this.isDraggingHScrollBar) {
          const maxHours = Math.max(12, (this.sim.currentTime - TG.CONFIG.START_TIME) / 3600 + 6);
          const totalWidthX = maxHours * this.getPxPerHour();
          const visibleW = this.width - 120;
          const trackWidth = this.width - 124 - 16;
          const deltaX = mx - this.hScrollBarDragStartX;
          const scrollableDistX = totalWidthX - visibleW;
          const scrollRatioDeltaX = deltaX / trackWidth;

          this.panX = this.hScrollBarDragStartPanX - scrollRatioDeltaX * scrollableDistX;
          this.clampPan();
          return;
        }

        // スジドラッグ中 (改善点1, 2, 3)
        if (this.isDraggingTrain && this.draggedTrain) {
          const tStart = this.xToTime(this.dragStartX);
          const tCur = this.xToTime(mx);
          let shiftSec = Math.round((tCur - tStart) / 30) * 30;

          // 改善点1: 前（過去方向）にはずらせないようにすること！
          shiftSec = Math.max(0, shiftSec);

          this.dragCurrentShiftSec = shiftSec;
          // 改善点2 & 3: 出発点以降のみ遅延＋最小停車時間30秒＆自動遅延回復
          this.draggedTrain.setPendingShift(this.dragFromStopIdx, shiftSec);
          return;
        }

        if (this.isPanning) {
          this.panX = mx - this.panStartX;
          this.panY = my - this.panStartY;
          this.clampPan();
          return;
        }

        // ホバー更新
        if (mx <= 120) {
          this.hoveredStation = this.findStationAt(my);
          this.hoveredNode = null;
          this.canvas.style.cursor = this.hoveredStation ? 'pointer' : 'default';
        } else if (mx >= this.width - 20) {
          this.canvas.style.cursor = 'pointer';
        } else if (my >= this.height - 16 && mx >= 120) {
          this.canvas.style.cursor = 'pointer';
        } else {
          this.hoveredStation = null;
          this.hoveredNode = this.findNodeAt(mx, my);
          if (this.hoveredNode) {
            this.canvas.style.cursor = 'pointer';
          } else {
            const hit = this.findTrainLineAt(mx, my);
            this.canvas.style.cursor = hit ? 'ew-resize' : 'default';
          }
        }
      });

      // マウスアップ
      window.addEventListener('mouseup', () => {
        if (this.isDraggingVScrollBar) {
          this.isDraggingVScrollBar = false;
        }
        if (this.isDraggingHScrollBar) {
          this.isDraggingHScrollBar = false;
        }

        if (this.isDraggingTrain && this.draggedTrain) {
          this.isDraggingTrain = false;
          this.canvas.style.cursor = 'default';

          if (this.dragCurrentShiftSec > 0) {
            if (TG.UI && TG.UI.showConfirmBar) {
              TG.UI.showConfirmBar(this.draggedTrain, this.dragFromStopIdx, this.dragCurrentShiftSec);
            }
          } else {
            this.draggedTrain.rollbackPendingShift();
          }
          this.draggedTrain = null;
        }

        if (this.isPanning) {
          this.isPanning = false;
          this.canvas.style.cursor = 'default';
        }
      });
    }

    findStationAt(y) {
      for (const st of TG.CONFIG.STATIONS) {
        const sy = this.distToY(st.distance);
        if (Math.abs(y - sy) <= 12) return st;
      }
      return null;
    }

    findNodeAt(mx, my) {
      for (const train of this.sim.trains) {
        const stops = train.stops;
        for (const stop of stops) {
          const st = TG.getStation(stop.stationId);
          if (!st) continue;
          const y = this.distToY(st.distance);
          const tArr = stop.arr > 0 ? stop.arr : stop.dep;
          const x = this.timeToX(tArr);

          if (Math.hypot(mx - x, my - y) <= 10) {
            return { trainId: train.id, stationId: stop.stationId, x, y };
          }
        }
      }
      return null;
    }

    // 改善点2: スジをクリックしたとき、対象列車と始点駅インデックス (fromStopIdx) を返す
    findTrainLineAt(mx, my) {
      for (const train of this.sim.trains) {
        const stops = train.stops;
        for (let i = 0; i < stops.length - 1; i++) {
          const s1 = stops[i];
          const s2 = stops[i + 1];

          const st1 = TG.getStation(s1.stationId);
          const st2 = TG.getStation(s2.stationId);
          if (!st1 || !st2) continue;

          const y1 = this.distToY(st1.distance);
          const y2 = this.distToY(st2.distance);

          const t1 = s1.dep > 0 ? s1.dep : s1.arr;
          const t2 = s2.arr > 0 ? s2.arr : s2.dep;

          const x1 = this.timeToX(t1);
          const x2 = this.timeToX(t2);

          if (this.distToSegment(mx, my, x1, y1, x2, y2) <= 8) {
            return { train: train, fromStopIdx: i };
          }
        }
      }
      return null;
    }

    distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }
  }

  TG.Renderer = DiagramRenderer;

})(window.TrainGame);

/**
 * ui.js - ダイヤグラム主軸の指令UI
 * スジドラッグ確定バー、交点時刻手入力＆番線変更モーダル、駅構内配線図ポップアップ
 */
window.TrainGame = window.TrainGame || {};

(function(TG) {
  'use strict';

  class UI {
    constructor(sim, renderer) {
      this.sim = sim;
      this.renderer = renderer;

      this.pendingTrain = null;

      this.initElements();
      this.bindEvents();
    }

    initElements() {
      // ステータスヘッダー
      this.clockEl = document.getElementById('digitalClock');
      this.totalDelayEl = document.getElementById('totalDelayDisplay');
      this.incidentCountEl = document.getElementById('incidentCountDisplay');
      this.scoreRankEl = document.getElementById('scoreRankDisplay');

      // 難易度ボタン (改善点5)
      this.diffBtns = document.querySelectorAll('.diff-btn');

      // 衝突警告バナー (改善点4)
      this.conflictAlertBanner = document.getElementById('conflictAlertBanner');
      this.conflictAlertMsg = document.getElementById('conflictAlertMsg');

      // 速度ボタン
      this.speedBtns = document.querySelectorAll('.speed-btn');

      // スジ確定フローティングバー
      this.confirmBar = document.getElementById('confirmBar');
      this.confirmMsg = document.getElementById('confirmMsg');
      this.btnCommitShift = document.getElementById('btnCommitShift');
      this.btnCancelShift = document.getElementById('btnCancelShift');

      // ノード時刻編集モーダル
      this.nodeModal = document.getElementById('nodeModal');
      this.nodeTrainName = document.getElementById('nodeTrainName');
      this.nodeStationName = document.getElementById('nodeStationName');
      this.nodeArrInput = document.getElementById('nodeArrInput');
      this.nodeDepInput = document.getElementById('nodeDepInput');
      this.nodeTrackSelect = document.getElementById('nodeTrackSelect');
      this.nodeHoldCheck = document.getElementById('nodeHoldCheck');
      this.btnSaveNode = document.getElementById('btnSaveNode');
      this.btnCloseNode = document.getElementById('btnCloseNode');

      // 駅配線略図モーダル
      this.yardModal = document.getElementById('yardModal');
      this.yardStationName = document.getElementById('yardStationName');
      this.yardCanvas = document.getElementById('yardCanvas');
      this.yardCtx = this.yardCanvas.getContext('2d');
      this.yardInfoText = document.getElementById('yardInfoText');
      this.btnCloseYard = document.getElementById('btnCloseYard');

      // 列車一覧モーダル
      this.trainListModal = document.getElementById('trainListModal');
      this.trainTableBody = document.getElementById('trainTableBody');
      this.btnOpenTrainList = document.getElementById('btnOpenTrainList');
      this.btnCloseTrainList = document.getElementById('btnCloseTrainList');

      // 操作ヘルプモーダル
      this.helpModal = document.getElementById('helpModal');
      this.btnOpenHelp = document.getElementById('btnOpenHelp');
      this.btnCloseHelp = document.getElementById('btnCloseHelp');

      // ログコンテナ
      this.logContainer = document.getElementById('eventLogList');
      this.toastArea = document.getElementById('toastArea');

      // リザルトモーダル
      this.resultModal = document.getElementById('resultModal');
      this.finalScoreEl = document.getElementById('finalScore');
      this.finalRankEl = document.getElementById('finalRank');
      this.finalDelayEl = document.getElementById('finalDelay');
      this.finalIncidentsEl = document.getElementById('finalIncidents');
      this.restartBtn = document.getElementById('restartBtn');
    }

    bindEvents() {
      // 難易度切り替え (改善点5)
      this.diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const diff = btn.dataset.diff;
          if (this.sim.currentDifficulty === diff) return;
          this.diffBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.sim.changeDifficulty(diff);
        });
      });

      // 速度コントロール
      this.speedBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const speed = parseInt(btn.dataset.speed, 10);
          this.sim.timeScale = speed;
          this.speedBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.sim.addLog('info', `倍速変更: ${speed === 0 ? '一時停止' : speed + '倍速'}`);
        });
      });

      // スジ確定・取消ボタン
      this.btnCommitShift.addEventListener('click', () => this.commitPendingShift());
      this.btnCancelShift.addEventListener('click', () => this.cancelPendingShift());

      // ノード編集保存
      this.btnSaveNode.addEventListener('click', () => this.saveNodeEdit());
      this.btnCloseNode.addEventListener('click', () => this.nodeModal.classList.add('hidden'));

      // 駅配線図クローズ
      this.btnCloseYard.addEventListener('click', () => this.yardModal.classList.add('hidden'));

      // 現在時刻へスクロールボタン
      const btnScrollNow = document.getElementById('btnScrollNow');
      if (btnScrollNow) {
        btnScrollNow.addEventListener('click', () => {
          if (this.renderer.scrollToCurrentTime) this.renderer.scrollToCurrentTime();
        });
      }

      // 列車一覧モーダル開閉
      this.btnOpenTrainList.addEventListener('click', () => {
        this.updateTrainListModal();
        this.trainListModal.classList.remove('hidden');
      });
      this.btnCloseTrainList.addEventListener('click', () => {
        this.trainListModal.classList.add('hidden');
      });

      // ヘルプモーダル開閉
      this.btnOpenHelp.addEventListener('click', () => this.helpModal.classList.remove('hidden'));
      this.btnCloseHelp.addEventListener('click', () => this.helpModal.classList.add('hidden'));

      // 訓練用トラブル発生
      const btnTrouble = document.getElementById('btnTriggerTrouble');
      if (btnTrouble) {
        btnTrouble.addEventListener('click', () => {
          const runningTrains = this.sim.trains.filter(t => !t.isFinished() && t.status !== 'scheduled');
          if (runningTrains.length === 0) {
            alert('現在走行中・停車中の列車がありません。');
            return;
          }
          const tr = runningTrains[Math.floor(Math.random() * runningTrains.length)];
          const tpl = TG.CONFIG.DELAY_EVENTS[0];
          tr.activeIncident = { title: tpl.title, remaining: 150, total: 150 };
          tr.delaySeconds += 150;
          this.sim.addLog('danger', `🚨 訓練警報: ${tr.name} にて [${tpl.title}] を発動 (+2.5分遅延)`);
        });
      }

      // リスタート
      this.restartBtn.addEventListener('click', () => {
        this.resultModal.classList.add('hidden');
        this.sim.reset();
      });

      // キーボードショートカット (Enter: 確定, Esc: 取消・閉じる)
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!this.confirmBar.classList.contains('hidden')) {
            this.cancelPendingShift();
          }
          this.nodeModal.classList.add('hidden');
          this.yardModal.classList.add('hidden');
          this.trainListModal.classList.add('hidden');
          this.helpModal.classList.add('hidden');
        } else if (e.key === 'Enter') {
          if (!this.confirmBar.classList.contains('hidden')) {
            this.commitPendingShift();
          }
        }
      });
    }

    // ===============================================
    // 1. スジドラッグ確定フローティングバー (改善点1・2・3)
    // ===============================================
    showConfirmBar(train, fromStopIdx, shiftSec) {
      if (typeof shiftSec === 'undefined') {
        shiftSec = fromStopIdx;
        fromStopIdx = 0;
      }
      this.pendingTrain = train;
      this.pendingFromStopIdx = fromStopIdx;
      this.pendingShiftSec = shiftSec;

      const st = (train.stops && train.stops[fromStopIdx]) ? TG.getStation(train.stops[fromStopIdx].stationId) : null;
      const stName = st ? st.name : '指定駅';
      const shiftMin = Math.floor(shiftSec / 60);
      const remSec = shiftSec % 60;
      const timeStr = shiftMin > 0 ? `${shiftMin}分${remSec > 0 ? remSec + '秒' : ''}` : `${remSec}秒`;

      this.confirmMsg.innerHTML = `<strong>${train.name}</strong>: <strong>${stName} 発車以降を +${timeStr} 繰り下げ</strong> (各駅最短30秒停車・自動回復適用)。このダイヤ修正を確定しますか？`;
      this.confirmBar.classList.remove('hidden');
    }

    commitPendingShift() {
      if (!this.pendingTrain) return;
      const train = this.pendingTrain;
      const shift = (train.pendingDragShiftSec !== undefined && train.pendingDragShiftSec > 0)
        ? train.pendingDragShiftSec
        : (this.pendingShiftSec || 0);
      const fromIdx = (train.pendingDragFromStopIdx !== null && train.pendingDragFromStopIdx !== undefined)
        ? train.pendingDragFromStopIdx
        : (this.pendingFromStopIdx || 0);

      train.commitPendingShift();

      const st = (train.stops && train.stops[fromIdx]) ? TG.getStation(train.stops[fromIdx].stationId) : null;
      const stName = st ? st.name : '';
      const shiftMin = Math.round(shift / 60);
      this.sim.addLog('warn', `スジ修正確定: ${train.name} [${stName}発以降 +${shiftMin}分 (停車30秒回復適用)] を確定しました`);
      this.confirmBar.classList.add('hidden');
      this.pendingTrain = null;
    }

    cancelPendingShift() {
      if (!this.pendingTrain) return;
      this.pendingTrain.rollbackPendingShift();
      this.confirmBar.classList.add('hidden');
      this.pendingTrain = null;
    }

    // ===============================================
    // 2. 駅・スジ交点（ノード）時刻入力＆番線変更
    // ===============================================
    openNodeEditModal(trainId, stationId) {
      const train = this.sim.trains.find(t => t.id === trainId);
      const station = TG.getStation(stationId);
      if (!train || !station) return;

      this.editingTrain = train;
      this.editingStation = station;

      const stop = train.stops.find(s => s.stationId === stationId);
      if (!stop) return;

      this.nodeTrainName.textContent = `${train.name} (${train.typeConfig.name})`;
      this.nodeStationName.textContent = station.name;

      // 到着・出発時刻
      this.nodeArrInput.value = stop.arr > 0 ? TG.formatTime(stop.arr + train.delaySeconds) : '--:--:--';
      this.nodeDepInput.value = stop.dep > 0 ? TG.formatTime(stop.dep + train.delaySeconds) : '--:--:--';

      // 番線選択プルダウン
      this.nodeTrackSelect.innerHTML = '';
      const currentTrack = train.getTargetTrack(stationId);
      station.platforms.forEach(plat => {
        const opt = document.createElement('option');
        opt.value = plat.id;
        opt.textContent = `${plat.name} [${plat.direction === 'down' ? '下り' : plat.direction === 'up' ? '上り' : '上下'}]`;
        if (plat.id === currentTrack) opt.selected = true;
        this.nodeTrackSelect.appendChild(opt);
      });

      // 抑止チェックボックス
      this.nodeHoldCheck.checked = train.holdDeparture;

      this.nodeModal.classList.remove('hidden');
    }

    saveNodeEdit() {
      if (!this.editingTrain || !this.editingStation) return;
      const train = this.editingTrain;
      const stId = this.editingStation.id;

      const newArr = TG.parseTime(this.nodeArrInput.value);
      const newDep = TG.parseTime(this.nodeDepInput.value);
      const newTrack = this.nodeTrackSelect.value;
      const isHold = this.nodeHoldCheck.checked;

      // 抑止更新
      train.holdDeparture = isHold;

      // 時刻・番線更新 (30秒回復ロジック内包)
      train.updateStopSchedule(stId, newArr, newDep, newTrack);

      if (newDep) {
        this.sim.addLog('info', `時刻手動変更: ${train.name} ${this.editingStation.name} 発車を ${TG.formatTime(newDep)} に変更 (以降各駅30秒停車回復適用)`);
      }
      if (newTrack) {
        const plat = TG.getPlatform(newTrack);
        this.sim.addLog('info', `番線変更: ${train.name} ${this.editingStation.name} を ${plat ? plat.name : newTrack} に指定`);
      }
      this.nodeModal.classList.add('hidden');
    }

    // ===============================================
    // 3. 駅構内配線略図ポップアップ
    // ===============================================
    openStationYardModal(station) {
      this.yardStationName.textContent = `${station.name} 駅 構内配線略図 (${station.trackType === 'single' ? '単線区間' : '複線区間'})`;

      const ctx = this.yardCtx;
      const w = this.yardCanvas.width;
      const h = this.yardCanvas.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // 配線図描画
      const numPlats = station.platforms.length;
      const startY = 40;
      const stepY = (h - 80) / Math.max(1, numPlats - 1);

      station.platforms.forEach((plat, idx) => {
        const y = numPlats === 1 ? h / 2 : startY + idx * stepY;

        // 線路レール
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(w - 60, y);
        ctx.stroke();

        // ホーム台座
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.fillRect(w / 2 - 80, y - 12, 160, 24);
        ctx.strokeRect(w / 2 - 80, y - 12, 160, 24);

        // 番線名ラベル
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(plat.name, w / 2, y);

        // 在線列車チェック
        const occupier = this.sim.getOccupiedPlatform(plat.id);
        if (occupier) {
          // 列車アイコン
          ctx.fillStyle = occupier.typeConfig.color;
          ctx.beginPath();
          ctx.roundRect(w / 2 - 60, y - 10, 120, 20, 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`[${occupier.name}] ${occupier.getStatusLabel()}`, w / 2, y);
        } else {
          // 信号機 (青)
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(w - 80, y - 14, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 単線・複線の解説テキスト
      let desc = `■ キロ程: ${station.distance.toFixed(1)} km / 線路構造: ${station.trackType === 'single' ? '単線 (熱海以南)' : '複線 (東海道本線)'}\n`;
      if (station.trackType === 'single') {
        desc += station.canPass ? '【行き違い(交換)可能駅】上下列車がこの駅ですれ違い可能です。' : '【交換不能(棒線駅)】上下列車のすれ違いはできません。';
      } else {
        desc += station.isMajor ? '【主要待避可能駅】優等列車の追い越し待避が可能です。' : '【中間駅】本線通過・停車のみ。';
      }
      this.yardInfoText.textContent = desc;

      this.yardModal.classList.remove('hidden');
    }

    // ===============================================
    // 4. 列車一覧モーダル
    // ===============================================
    updateTrainListModal() {
      this.trainTableBody.innerHTML = '';
      this.sim.trains.forEach(t => {
        const tr = document.createElement('tr');
        const curStop = t.getCurrentStop();
        const st = TG.getStation(curStop.stationId);
        const targetTrack = t.getTargetTrack(curStop.stationId);
        const plat = TG.getPlatform(targetTrack);

        tr.innerHTML = `
          <td><strong style="color: ${t.typeConfig.color}">${t.name}</strong></td>
          <td><span class="badge" style="background:${t.typeConfig.badgeBg}; color:${t.typeConfig.color}">${t.typeConfig.name}</span></td>
          <td>${t.direction === 'down' ? '下り (下田行)' : '上り (東京行)'}</td>
          <td>${st.name} <span class="text-muted">(${plat ? plat.name : ''})</span></td>
          <td>${t.getStatusLabel()}</td>
          <td class="${t.delaySeconds > 60 ? 'text-warn' : 'text-good'}">${t.getDelayDisplay()}</td>
        `;

        tr.addEventListener('click', () => {
          this.renderer.selectedTrainId = t.id;
          this.trainListModal.classList.add('hidden');
        });

        this.trainTableBody.appendChild(tr);
      });
    }

    // ===============================================
    // 5. ログ・トースト・毎フレーム更新
    // ===============================================
    onNewLog(logEntry) {
      const item = document.createElement('div');
      item.className = `log-item log-${logEntry.type}`;
      item.innerHTML = `<span class="log-time">[${logEntry.time}]</span> ${logEntry.message}`;
      this.logContainer.prepend(item);

      if (logEntry.type !== 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${logEntry.type}`;
        toast.innerHTML = `<strong>${logEntry.time}</strong> ${logEntry.message}`;
        this.toastArea.appendChild(toast);

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 4000);
      }
    }

    update() {
      this.clockEl.textContent = TG.formatTime(this.sim.currentTime);
      const totalMin = Math.floor(this.sim.totalDelaySeconds / 60);
      const totalSec = Math.round(this.sim.totalDelaySeconds % 60);
      this.totalDelayEl.textContent = `+${totalMin}分${totalSec}秒`;
      this.incidentCountEl.textContent = `${this.sim.incidentsCount} 件`;

      const scoreInfo = this.sim.calculateScore();
      this.scoreRankEl.textContent = `${scoreInfo.score} 点 (${scoreInfo.rank}ランク)`;

      // 改善点4: 衝突警告バナーのリアルタイム表示制御
      if (this.conflictAlertBanner) {
        if (this.sim.conflicts && this.sim.conflicts.length > 0) {
          this.conflictAlertBanner.classList.remove('hidden');
          const first = this.sim.conflicts[0];
          let detail = '';
          if (first.type === 'opposite_single_block' || first.type === 'head_on') {
            const stA = TG.getStation(first.stationA || first.stationAId);
            const stB = TG.getStation(first.stationB || first.stationBId);
            const aName = stA ? stA.name : (first.stationAName || '');
            const bName = stB ? stB.name : (first.stationBName || '');
            detail = `単線衝突警報 [${aName}〜${bName}]: ${first.train1Name || first.trainAName} と ${first.train2Name || first.trainBName} が同区間に進入予測！`;
          } else if (first.type === 'track_occupancy' || first.type === 'platform') {
            const st = TG.getStation(first.stationId);
            const plat = TG.getPlatform(first.trackId || first.platformId);
            detail = `番線競合警報 [${st ? st.name : ''} ${plat ? plat.name : ''}]: ${first.train1Name || first.trainAName} と ${first.train2Name || first.trainBName} が同時進入予測！`;
          } else {
            detail = `閉塞競合警報: ${first.train1Name || first.trainAName} と ${first.train2Name || first.trainBName} が同一区間に進入予測！`;
          }
          if (this.conflictAlertMsg) {
            this.conflictAlertMsg.textContent = `${detail} (合計${this.sim.conflicts.length}箇所の支障)`;
          }
        } else {
          this.conflictAlertBanner.classList.add('hidden');
        }
      }
    }

    onGameOver() {
      const res = this.sim.calculateScore();
      this.finalScoreEl.textContent = res.score;
      this.finalRankEl.textContent = res.rank;
      this.finalDelayEl.textContent = `${Math.floor(this.sim.totalDelaySeconds / 60)}分`;
      this.finalIncidentsEl.textContent = `${this.sim.incidentsCount}件`;
      this.resultModal.classList.remove('hidden');
    }
  }

  TG.UI = UI;

})(window.TrainGame);

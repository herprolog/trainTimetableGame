/**
 * models.js - 列車・駅・単線複線閉塞・スジ編集モデル
 * 出発点以降の部分遅延・最小停車時間30秒＆自動遅延回復ロジック対応
 */
window.TrainGame = window.TrainGame || {};

(function(TG) {
  'use strict';

  class Train {
    constructor(def) {
      this.id = def.id;
      this.name = def.name || def.id;
      this.type = def.type; // 'local', 'rapid', 'express'
      this.typeConfig = TG.CONFIG.TRAIN_TYPES[this.type];
      this.direction = def.direction; // 'down' (下り: 東京->下田) | 'up' (上り: 下田->東京)

      // 元々の基本計画時刻 (遅延回復の基準)
      this.origStops = JSON.parse(JSON.stringify(def.stops));
      // 現在有効な運行時刻
      this.stops = JSON.parse(JSON.stringify(def.stops));

      // 状態管理
      this.status = 'scheduled'; // 'scheduled', 'running', 'waiting_signal', 'stopped', 'arrived', 'incident'
      this.currentStopIdx = 0;
      this.isAtStation = true;
      this.currentStationId = this.stops[0].stationId;

      // 距離初期化 (km)
      const initStation = TG.getStation(this.currentStationId);
      this.distance = initStation ? initStation.distance : 0.0;
      this.speed = 0;

      // プレイヤー指令
      this.holdDeparture = false; // 発車抑止
      this.assignedTracks = {}; // { stationId: platformId }
      this.stops.forEach(s => {
        this.assignedTracks[s.stationId] = s.trackId;
      });

      // 遅延・ドラッグ管理
      this.delaySeconds = 0; // 現在位置での遅延（秒）
      this.pendingDragFromStopIdx = null; // ドラッグ操作中の始点駅インデックス
      this.pendingDragShiftSec = 0;       // ドラッグ操作中の仮スライド量（秒, 常に >= 0）

      this.dwellTimer = 0;
      this.activeIncident = null;
      this.signalAspect = 'G'; // 信号現示 'G', 'Y', 'R'
      this.waitingReason = ''; // 信号待ち理由 (例: '単線区間 対向列車待ち')

      // 折り返し運用管理
      this.turnaroundTrainId = def.turnaroundTrainId || null;
      this.previousTrainId = def.previousTrainId || null;
      this.minTurnaroundTime = def.minTurnaroundTime !== undefined ? def.minTurnaroundTime : 300;
    }

    // ================================================================
    // ダイヤドラッグ＆遅延回復エンジン
    // ① 前（過去方向）にはずらせない（addedDelaySec >= 0）
    // ② カーソルが合わせられた線の出発点（fromStopIndex）より前はそのまま
    // ③ 駅での停車時間が必ず30秒以上になるようにし、可能な限り遅延を回復
    // ================================================================
    calculateDelayedSchedule(fromStopIndex, addedDelaySec) {
      // 改善点1: 前（過去方向）にはずらせない
      addedDelaySec = Math.max(0, addedDelaySec || 0);

      // stops のコピーを作成
      const newStops = this.stops.map(s => ({ ...s }));

      if (fromStopIndex === null || fromStopIndex === undefined || fromStopIndex < 0 || fromStopIndex >= newStops.length) {
        return newStops;
      }

      // 改善点2: fromStopIndex より前の駅 (0 〜 fromStopIndex-1) はそのままであること
      // (newStops[0 ... fromStopIndex-1] は変更なし)

      // 出発駅 (fromStopIndex) の出発時刻を遅らせる
      const startStop = newStops[fromStopIndex];
      const origDep = startStop.dep > 0 ? startStop.dep : startStop.arr;
      const newStartDep = origDep + addedDelaySec;
      startStop.dep = newStartDep;

      if (startStop.pass) {
        startStop.arr = newStartDep;
      }

      // 改善点3: 出発点以降の各駅について、最小停車時間30秒を保証しつつ遅延を自動回復
      const MIN_DWELL = 30; // 最小停車時間 30秒

      for (let idx = fromStopIndex + 1; idx < newStops.length; idx++) {
        const prevStop = newStops[idx - 1];
        const currStop = newStops[idx];

        // 基準となる駅間標準所要時間 (origStops から算出)
        const basePrevDep = this.origStops[idx - 1].dep > 0 ? this.origStops[idx - 1].dep : this.origStops[idx - 1].arr;
        const baseCurrArr = this.origStops[idx].arr > 0 ? this.origStops[idx].arr : this.origStops[idx].dep;
        const standardTravelTime = Math.max(30, baseCurrArr - basePrevDep);

        // 新しい到着時刻 = 前駅の新しい出発時刻 + 所要時間
        const prevDepTime = prevStop.dep > 0 ? prevStop.dep : prevStop.arr;
        const newArrTime = prevDepTime + standardTravelTime;
        currStop.arr = newArrTime;

        // 終着駅の場合
        if (idx === newStops.length - 1) {
          currStop.dep = 0;
          break;
        }

        // 途中駅の場合
        if (currStop.pass) {
          // 通過駅は arr = dep
          currStop.dep = newArrTime;
        } else {
          // 停車駅:
          // 元々の計画出発時刻
          const planDep = this.origStops[idx].dep > 0 ? this.origStops[idx].dep : this.origStops[idx].arr;

          // 最低でも newArrTime + 30秒 の停車時間を確保
          const minRequiredDep = newArrTime + MIN_DWELL;

          // もし元々の計画出発時刻までに30秒以上あれば計画通り出発 (遅延回復！)
          // もし間に合わなければ、最低30秒停車して即発車 (遅延を最小限に抑制)
          currStop.dep = Math.max(planDep, minRequiredDep);
        }
      }

      return newStops;
    }

    // ドラッグ中または通常時の実効スケジュールを取得
    getEffectiveStops() {
      if (this.pendingDragFromStopIdx !== null && this.pendingDragShiftSec > 0) {
        return this.calculateDelayedSchedule(this.pendingDragFromStopIdx, this.pendingDragShiftSec);
      }
      return this.stops;
    }

    // スジのドラッグ操作 (仮スライド設定)
    setPendingShift(fromStopIndex, seconds) {
      this.pendingDragFromStopIdx = fromStopIndex;
      // 改善点1: 前（過去方向）にはずらせない
      this.pendingDragShiftSec = Math.max(0, seconds);
    }

    // スジ移動の確定
    commitPendingShift() {
      if (this.pendingDragFromStopIdx !== null && this.pendingDragShiftSec > 0) {
        this.stops = this.calculateDelayedSchedule(this.pendingDragFromStopIdx, this.pendingDragShiftSec);

        // 現在駅以降の遅れを delaySeconds に反映
        const curStop = this.getCurrentStop();
        if (curStop) {
          const origStop = this.origStops.find(s => s.stationId === curStop.stationId);
          if (origStop) {
            const planTime = origStop.dep > 0 ? origStop.dep : origStop.arr;
            const curTime = curStop.dep > 0 ? curStop.dep : curStop.arr;
            this.delaySeconds = Math.max(0, curTime - planTime);
          }
        }
      }
      this.pendingDragFromStopIdx = null;
      this.pendingDragShiftSec = 0;
    }

    // スジ移動の取消
    rollbackPendingShift() {
      this.pendingDragFromStopIdx = null;
      this.pendingDragShiftSec = 0;
    }

    // 指定駅の推定到着・出発時刻
    getEstimatedStopTimes(stopIdx) {
      const effStops = this.getEffectiveStops();
      const stop = effStops[stopIdx];
      if (!stop) return null;
      return {
        stationId: stop.stationId,
        arr: stop.arr > 0 ? stop.arr : stop.dep,
        dep: stop.dep > 0 ? stop.dep : null,
        trackId: this.getTargetTrack(stop.stationId),
        pass: !!stop.pass
      };
    }

    // 駅での在線時間帯 [start, end] を取得 (番線重複判定用)
    getPlatformOccupancyInterval(stationId) {
      const effStops = this.getEffectiveStops();
      const stopIdx = effStops.findIndex(s => s.stationId === stationId);
      if (stopIdx < 0) return null;
      const stop = effStops[stopIdx];
      const isFirst = stopIdx === 0;
      const isLast = stopIdx === effStops.length - 1;

      let start = stop.arr > 0 ? stop.arr : stop.dep;
      let end = stop.dep > 0 ? stop.dep : stop.arr;

      if (isFirst) {
        start = (stop.dep || stop.arr) - 180; // 始発駅は出発3分前からホーム在線
        end = stop.dep || stop.arr;
      } else if (isLast) {
        start = stop.arr;
        end = stop.arr + 300; // 終着駅は到着後5分間在線
      } else if (stop.pass) {
        start = stop.arr - 30;
        end = stop.arr + 30;
      } else {
        start = stop.arr - 15;
        end = (stop.dep || stop.arr) + 15;
      }

      return {
        start: start,
        end: end,
        trackId: this.getTargetTrack(stationId),
        trainId: this.id,
        trainName: this.name
      };
    }

    // 予定番線
    getPlannedTrack(stationId) {
      const stop = this.stops.find(s => s.stationId === stationId);
      return stop ? stop.trackId : null;
    }

    // 指示された番線
    getTargetTrack(stationId) {
      return this.assignedTracks[stationId] || this.getPlannedTrack(stationId);
    }

    // 番線変更
    assignTrack(stationId, trackId) {
      this.assignedTracks[stationId] = trackId;
      const stop = this.stops.find(s => s.stationId === stationId);
      if (stop) stop.trackId = trackId;
    }

    // 駅ごとの時刻・番線手動編集 (交点クリック用)
    updateStopSchedule(stationId, newArr, newDep, newTrackId) {
      const stopIdx = this.stops.findIndex(s => s.stationId === stationId);
      if (stopIdx < 0) return;
      const stop = this.stops[stopIdx];

      if (newTrackId) this.assignTrack(stationId, newTrackId);

      if (newDep !== undefined && newDep !== null) {
        const curDep = stop.dep > 0 ? stop.dep : stop.arr;
        const diff = newDep - curDep;
        if (diff > 0) {
          this.stops = this.calculateDelayedSchedule(stopIdx, diff);
        } else if (diff < 0) {
          // 手入力での前倒しは計画時刻以上なら許可
          const origStop = this.origStops[stopIdx];
          const minDep = origStop.dep > 0 ? origStop.dep : origStop.arr;
          stop.dep = Math.max(minDep, newDep);
        }
      } else if (newArr !== undefined && newArr !== null) {
        stop.arr = newArr;
      }
    }

    // 発車抑止切り替え
    toggleHold() {
      this.holdDeparture = !this.holdDeparture;
      return this.holdDeparture;
    }

    getCurrentStop() {
      return this.stops[this.currentStopIdx];
    }

    getNextStop() {
      if (this.currentStopIdx + 1 < this.stops.length) {
        return this.stops[this.currentStopIdx + 1];
      }
      return null;
    }

    isFinished() {
      return this.status === 'arrived';
    }

    // 遅延表示
    getDelayDisplay() {
      // 始発駅または現在駅の計画時刻からの差分
      const curStop = this.getCurrentStop();
      if (!curStop) return '定時';
      const origStop = this.origStops.find(s => s.stationId === curStop.stationId);
      if (!origStop) return '定時';

      const planTime = origStop.dep > 0 ? origStop.dep : origStop.arr;
      const actualTime = curStop.dep > 0 ? curStop.dep : curStop.arr;
      const totalDelay = Math.max(0, actualTime - planTime) + this.pendingDragShiftSec;

      if (totalDelay <= 30) return '定時';
      const m = Math.floor(totalDelay / 60);
      const s = Math.round(totalDelay % 60);
      if (m > 0 && s > 0) return `+${m}分${s}秒`;
      if (m > 0) return `+${m}分`;
      return `+${s}秒`;
    }

    // 状態の日本語名
    getStatusLabel() {
      switch (this.status) {
        case 'scheduled': return '待機中';
        case 'running': return '走行中';
        case 'waiting_signal':
          return this.waitingReason ? `信号待ち(${this.waitingReason})` : '信号待ち(赤)';
        case 'stopped':
          return this.holdDeparture ? '抑止中(指令)' : '停車中';
        case 'arrived': return '終着';
        case 'incident': return '支障停車';
        default: return this.status;
      }
    }
  }

  // 駅検索ヘルパー
  TG.getStation = function(id) {
    return TG.CONFIG.STATIONS.find(s => s.id === id);
  };

  // 駅インデックス検索
  TG.getStationIndex = function(id) {
    return TG.CONFIG.STATIONS.findIndex(s => s.id === id);
  };

  // 番線検索ヘルパー
  TG.getPlatform = function(platformId) {
    for (const st of TG.CONFIG.STATIONS) {
      const p = st.platforms.find(plat => plat.id === platformId);
      if (p) return { ...p, station: st };
    }
    return null;
  };

  // 指定キロ程が単線区間かどうか判定
  TG.isSingleTrackDistance = function(distance) {
    // 熱海駅 (104.6km) 以南は単線区間
    return distance >= 104.6;
  };

  // 時刻フォーマット HH:MM:SS
  TG.formatTime = function(sec) {
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sc = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sc).padStart(2, '0')}`;
  };

  // 時刻フォーマット HH:MM
  TG.formatTimeShort = function(sec) {
    if (!sec) return '--:--';
    const s = Math.floor(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  // 時刻パース "09:30" or "09:30:00" -> 秒
  TG.parseTime = function(str) {
    if (!str) return null;
    const parts = str.trim().split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 3600 + parts[1] * 60;
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  };

  TG.Train = Train;

})(window.TrainGame);

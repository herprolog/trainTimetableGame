/**
 * simulation.js - 41駅・単線複線ハイブリッド運行シミュレーション
 * 物理ブロック区間ベースの単線正面衝突検知・赤色警告連携・ゲームループ
 */
window.TrainGame = window.TrainGame || {};

(function(TG) {
  'use strict';

  class Simulation {
    get currentDifficulty() {
      return TG.CONFIG.currentDifficulty;
    }

    constructor() {
      this.reset();
    }

    reset() {
      this.currentTime = TG.CONFIG.START_TIME;
      this.timeScale = 1;
      this.trains = [];
      this.generatedCycles = new Set();
      this.eventLogs = [];
      this.incidentsCount = 0;
      this.totalDelaySeconds = 0;
      this.nextEventTime = this.currentTime + 150;
      this.isGameOver = false;

      // 衝突・支障検知リスト
      this.conflicts = [];
      this.lastConflictCount = 0;

      // ゲームミッション時間: 10:00 (開始から2時間)
      this.missionEndTime = TG.CONFIG.START_TIME + 2 * 3600;

      // 初期サイクル (0, 1, 2 = 3時間分) を生成
      for (let c = 0; c <= 2; c++) {
        this.spawnCycleTrains(c);
      }
    }

    // 難易度変更＆リスタート
    changeDifficulty(diff) {
      if (TG.CONFIG.setDifficulty(diff)) {
        this.reset();
        this.addLog('info', `難易度を [${TG.CONFIG.DIFFICULTIES[diff].name}] に変更しました (列車数: ${TG.CONFIG.BASE_CYCLE_TRAINS.length}本/時)`);
        return true;
      }
      return false;
    }

    addLog(type, message) {
      const timeStr = TG.formatTime(this.currentTime);
      const logEntry = {
        time: timeStr,
        type: type,
        message: message,
        id: Date.now() + Math.random()
      };
      this.eventLogs.unshift(logEntry);
      if (this.eventLogs.length > 60) this.eventLogs.pop();

      if (TG.UI && TG.UI.onNewLog) {
        TG.UI.onNewLog(logEntry);
      }
    }

    // 番線の占有チェック
    getOccupiedPlatform(platformId, excludingTrainId = null) {
      return this.trains.find(t =>
        t.id !== excludingTrainId &&
        !t.isFinished() &&
        t.isAtStation &&
        t.getCurrentStop() &&
        t.getTargetTrack(t.getCurrentStop().stationId) === platformId
      );
    }

    // 2駅間の単線区間に在線している列車を取得
    getTrainInSingleTrackSection(stA_dist, stB_dist, excludingTrainId = null) {
      const minD = Math.min(stA_dist, stB_dist);
      const maxD = Math.max(stA_dist, stB_dist);

      return this.trains.find(t =>
        t.id !== excludingTrainId &&
        !t.isFinished() &&
        !t.isAtStation &&
        t.distance > minD + 0.05 &&
        t.distance < maxD - 0.05
      );
    }

    // 指定サイクルの列車を生成して追加
    spawnCycleTrains(cycleIndex) {
      if (this.generatedCycles.has(cycleIndex)) return;
      this.generatedCycles.add(cycleIndex);

      const cycleDefs = TG.CONFIG.generateCycleTrains(cycleIndex);
      cycleDefs.forEach(def => {
        this.trains.push(new TG.Train(def));
      });
    }

    // 時間進行に応じた次サイクルの自動先行生成
    ensureUpcomingCycles() {
      const currentCycle = Math.floor((this.currentTime - TG.CONFIG.START_TIME) / TG.CONFIG.CYCLE_DURATION);
      const targetCycle = currentCycle + 2; // 2時間先まで常に生成

      for (let c = 0; c <= targetCycle; c++) {
        if (!this.generatedCycles.has(c)) {
          this.spawnCycleTrains(c);
        }
      }
    }

    // ================================================================
    // 改善点4: 物理ブロック区間ベースの単線正面衝突検知アルゴリズム
    // ================================================================
    getSectionRunInterval(train, distA, distB) {
      const stops = train.getEffectiveStops();
      const minD = Math.min(distA, distB);
      const maxD = Math.max(distA, distB);

      for (let i = 0; i < stops.length - 1; i++) {
        const s1 = stops[i];
        const s2 = stops[i + 1];
        const st1 = TG.getStation(s1.stationId);
        const st2 = TG.getStation(s2.stationId);
        if (!st1 || !st2) continue;

        const d1 = st1.distance;
        const d2 = st2.distance;

        // この駅間 (d1 -> d2) の中に [minD, maxD] が含まれるか？
        if (Math.min(d1, d2) <= minD + 0.01 && Math.max(d1, d2) >= maxD - 0.01) {
          const tDep1 = s1.dep > 0 ? s1.dep : s1.arr;
          const tArr2 = s2.arr > 0 ? s2.arr : s2.dep;

          if (tArr2 === tDep1) continue;

          // 線形補間
          const rA = (distA - d1) / (d2 - d1);
          const rB = (distB - d1) / (d2 - d1);
          const tA = tDep1 + rA * (tArr2 - tDep1);
          const tB = tDep1 + rB * (tArr2 - tDep1);

          return {
            start: Math.min(tA, tB),
            end: Math.max(tA, tB),
            segmentIdx: i
          };
        }
      }
      return null;
    }

    detectConflicts() {
      const conflicts = [];
      const activeTrains = this.trains.filter(t => !t.isFinished());

      // 1. 単線区間の物理ブロック正面衝突チェック (熱海 index 20 〜 下田 index 40)
      const singleStations = TG.CONFIG.STATIONS.slice(20);

      for (let sIdx = 0; sIdx < singleStations.length - 1; sIdx++) {
        const stA = singleStations[sIdx];
        const stB = singleStations[sIdx + 1];
        const downs = [];
        const ups = [];

        activeTrains.forEach(t => {
          const iv = this.getSectionRunInterval(t, stA.distance, stB.distance);
          if (iv) {
            if (t.direction === 'down') downs.push({ t, iv });
            else ups.push({ t, iv });
          }
        });

        downs.forEach(d => {
          ups.forEach(u => {
            // 単線駅間での時間重複判定
            if (Math.max(d.iv.start, u.iv.start) < Math.min(d.iv.end, u.iv.end)) {
              conflicts.push({
                type: 'head_on',
                severity: 'critical',
                title: `単線正面衝突警告: ${stA.name}〜${stB.name}間`,
                desc: `${d.t.name} と ${u.t.name} が単線駅間で正面衝突する進路です！`,
                trainAId: d.t.id,
                trainBId: u.t.id,
                trainAName: d.t.name,
                trainBName: u.t.name,
                train1Name: d.t.name,
                train2Name: u.t.name,
                stationAId: stA.id,
                stationBId: stB.id,
                stationA: stA.id,
                stationB: stB.id,
                stationAName: stA.name,
                stationBName: stB.name,
                time: (Math.max(d.iv.start, u.iv.start) + Math.min(d.iv.end, u.iv.end)) / 2,
                dist: (stA.distance + stB.distance) / 2,
                segmentA: { trainId: d.t.id, stopIdx: d.iv.segmentIdx },
                segmentB: { trainId: u.t.id, stopIdx: u.iv.segmentIdx }
              });
            }
          });
        });
      }

      // 2. 同一方向の追突・追い抜き違反チェック
      for (let i = 0; i < activeTrains.length; i++) {
        const tA = activeTrains[i];
        const stopsA = tA.getEffectiveStops();

        for (let j = i + 1; j < activeTrains.length; j++) {
          const tB = activeTrains[j];
          if (tA.direction !== tB.direction) continue;
          const stopsB = tB.getEffectiveStops();

          for (let sa = 0; sa < stopsA.length - 1; sa++) {
            const a1 = stopsA[sa];
            const a2 = stopsA[sa + 1];

            for (let sb = 0; sb < stopsB.length - 1; sb++) {
              const b1 = stopsB[sb];
              const b2 = stopsB[sb + 1];

              if (a1.stationId === b1.stationId && a2.stationId === b2.stationId) {
                const depA = a1.dep > 0 ? a1.dep : a1.arr;
                const arrA = a2.arr > 0 ? a2.arr : a2.dep;
                const depB = b1.dep > 0 ? b1.dep : b1.arr;
                const arrB = b2.arr > 0 ? b2.arr : b2.dep;

                const isOvertake = (depA < depB && arrA > arrB) || (depA > depB && arrA < arrB);
                const isTooClose = Math.abs(arrA - arrB) < 20 || Math.abs(depA - depB) < 20;

                if (isOvertake || isTooClose) {
                  const st1 = TG.getStation(a1.stationId);
                  const st2 = TG.getStation(a2.stationId);
                  conflicts.push({
                    type: 'rear_end',
                    severity: 'warning',
                    title: `駅間追突・異常接近警告: ${st1.name}〜${st2.name}間`,
                    desc: `${tA.name} と ${tB.name} が同一区間で異常接近！`,
                    trainAId: tA.id,
                    trainBId: tB.id,
                    trainAName: tA.name,
                    trainBName: tB.name,
                    stationAId: a1.stationId,
                    stationBId: a2.stationId,
                    time: (Math.max(depA, depB) + Math.min(arrA, arrB)) / 2,
                    dist: (st1.distance + st2.distance) / 2,
                    segmentA: { trainId: tA.id, stopIdx: sa },
                    segmentB: { trainId: tB.id, stopIdx: sb }
                  });
                }
              }
            }
          }
        }
      }

      // 3. 駅番線重複 (同一駅・同一番線に2列車滞留)
      TG.CONFIG.STATIONS.forEach(st => {
        st.platforms.forEach(plat => {
          const occs = [];
          activeTrains.forEach(t => {
            const effStops = t.getEffectiveStops();
            effStops.forEach((s, idx) => {
              if (s.stationId === st.id && t.getTargetTrack(st.id) === plat.id) {
                const arr = s.arr > 0 ? s.arr : s.dep;
                const dep = s.dep > 0 ? s.dep : s.arr;
                occs.push({ train: t, stopIdx: idx, start: arr - 15, end: dep + 15 });
              }
            });
          });

          for (let i = 0; i < occs.length; i++) {
            for (let j = i + 1; j < occs.length; j++) {
              const o1 = occs[i];
              const o2 = occs[j];
              if (o1.train.id === o2.train.id) continue;

              if (Math.max(o1.start, o2.start) < Math.min(o1.end, o2.end)) {
                conflicts.push({
                  type: 'platform',
                  severity: 'warning',
                  title: `番線重複支障: ${st.name} ${plat.name}`,
                  desc: `${o1.train.name} と ${o2.train.name} が同一番線で重複滞留！`,
                  trainAId: o1.train.id,
                  trainBId: o2.train.id,
                  trainAName: o1.train.name,
                  trainBName: o2.train.name,
                  train1Name: o1.train.name,
                  train2Name: o2.train.name,
                  stationId: st.id,
                  platformId: plat.id,
                  trackId: plat.id,
                  nodeA: { trainId: o1.train.id, stationId: st.id },
                  nodeB: { trainId: o2.train.id, stationId: st.id },
                  time: (Math.max(o1.start, o2.start) + Math.min(o1.end, o2.end)) / 2,
                  dist: st.distance
                });
              }
            }
          }
        });
      });

      this.conflicts = conflicts;
      return conflicts;
    }

    // 指定セグメントが衝突に関与しているか判定
    isSegmentConflict(trainId, fromStopIdx) {
      return this.conflicts.some(c =>
        (c.segmentA && c.segmentA.trainId === trainId && c.segmentA.stopIdx === fromStopIdx) ||
        (c.segmentB && c.segmentB.trainId === trainId && c.segmentB.stopIdx === fromStopIdx)
      );
    }

    // 指定ノードが衝突に関与しているか判定
    isNodeConflict(trainId, stationId) {
      return this.conflicts.some(c =>
        (c.nodeA && c.nodeA.trainId === trainId && c.nodeA.stationId === stationId) ||
        (c.nodeB && c.nodeB.trainId === trainId && c.nodeB.stationId === stationId)
      );
    }

    // シミュレーション更新
    update(dtReal) {
      if (this.timeScale === 0) return;

      const simDt = dtReal * this.timeScale;
      this.currentTime += simDt;

      // 未来サイクルの自動補充
      this.ensureUpcomingCycles();

      // 衝突・支障のリアルタイム検出
      this.conflicts = this.detectConflicts();

      // 衝突の増減ログ通知
      if (this.conflicts.length > 0 && this.lastConflictCount === 0) {
        const first = this.conflicts[0];
        this.addLog('danger', `🚨 ${first.title}: ${first.desc}`);
      } else if (this.conflicts.length === 0 && this.lastConflictCount > 0) {
        this.addLog('success', '✓ すべてのスジ衝突・支障が解消されました！安全運行が確保されています。');
      }
      this.lastConflictCount = this.conflicts.length;

      // ランダムトラブルイベント
      this.checkRandomEvents();

      let activeCount = 0;
      let sumDelay = 0;

      for (const train of this.trains) {
        this.updateTrain(train, simDt);
        if (!train.isFinished()) {
          sumDelay += train.delaySeconds;
          activeCount++;
        }
      }

      this.totalDelaySeconds = sumDelay;

      // ゲーム終了ミッション判定 (10:00 到達時)
      if (this.currentTime >= this.missionEndTime && !this.isGameOver) {
        this.isGameOver = true;
        this.addLog('success', '🏁 10:00 朝ラッシュ運行管理ミッション完了！総括評価を表示します。');
        if (TG.UI && TG.UI.onGameOver) {
          TG.UI.onGameOver();
        }
      }
    }

    updateTrain(train, dt) {
      if (train.isFinished()) return;

      const isDown = train.direction === 'down';
      const currentStop = train.getCurrentStop();
      const nextStop = train.getNextStop();
      const currentStation = TG.getStation(currentStop.stationId);
      const nextStation = nextStop ? TG.getStation(nextStop.stationId) : null;

      // 支障停車からの救済タイマー
      if (train.status === 'incident') {
        train.incidentRecoverTimer = (train.incidentRecoverTimer || 0) + dt;
        train.delaySeconds += dt;
        // 90秒で徐行復旧
        if (train.incidentRecoverTimer >= 90) {
          train.status = 'running';
          train.incidentRecoverTimer = 0;
          train.speed = 25; // 徐行
          train.signalAspect = 'Y';
          this.addLog('warn', `⚠️ ${train.name} 防護解除・徐行にて運転再開`);
        }
        return;
      }

      // 1. 待機中 (scheduled)
      if (train.status === 'scheduled') {
        const depTime = currentStop.dep > 0 ? currentStop.dep : currentStop.arr;
        if (this.currentTime >= depTime) {
          if (train.holdDeparture) {
            train.status = 'stopped';
            return;
          }

          // 単線区間での出発可否チェック
          if (nextStation && (TG.isSingleTrackDistance(currentStation.distance) || TG.isSingleTrackDistance(nextStation.distance))) {
            const oppTrain = this.getTrainInSingleTrackSection(currentStation.distance, nextStation.distance, train.id);
            if (oppTrain) {
              train.status = 'waiting_signal';
              train.signalAspect = 'R';
              train.waitingReason = `単線対向 ${oppTrain.name} 接近中`;
              train.delaySeconds += dt;
              return;
            }
          }

          // 発車
          train.status = 'running';
          train.isAtStation = false;
          train.signalAspect = 'G';
          train.waitingReason = '';
          this.addLog('info', `${train.name} (${train.typeConfig.name}) ${currentStation.name} を発車`);
        }
        return;
      }

      // 2. 駅停車中 (stopped)
      if (train.status === 'stopped') {
        if (train.activeIncident) {
          train.activeIncident.remaining -= dt;
          train.delaySeconds += dt;
          if (train.activeIncident.remaining <= 0) {
            this.addLog('success', `${train.name} [${train.activeIncident.title}] 対応完了・発車準備よし`);
            train.activeIncident = null;
          }
          return;
        }

        train.dwellTimer += dt;
        const plannedDep = currentStop.dep;
        const minDepTime = plannedDep ? Math.max(plannedDep, this.currentTime - dt) : this.currentTime;
        const requiredDwell = Math.min(train.typeConfig.stopDuration, 30); // 最小停車時間30秒で遅延回復可能

        if (train.holdDeparture) {
          train.delaySeconds += dt;
          return;
        }

        if (train.dwellTimer >= requiredDwell && this.currentTime >= minDepTime) {
          if (!nextStop) {
            // 終着
            train.status = 'arrived';
            this.addLog('success', `🏁 ${train.name} 終着 ${currentStation.name} 到着 (遅延: ${train.getDelayDisplay()})`);
            return;
          }

          // 単線区間の駅間排他チェック
          if (TG.isSingleTrackDistance(currentStation.distance) || TG.isSingleTrackDistance(nextStation.distance)) {
            const oppTrain = this.getTrainInSingleTrackSection(currentStation.distance, nextStation.distance, train.id);
            if (oppTrain) {
              train.status = 'waiting_signal';
              train.signalAspect = 'R';
              train.waitingReason = `単線対向 ${oppTrain.name} との交換待ち`;
              train.delaySeconds += dt;
              return;
            }
          }

          // 複線先行列車チェック
          const ahead = this.getAheadTrain(train);
          if (ahead && Math.abs(ahead.distance - train.distance) < 2.0) {
            train.status = 'waiting_signal';
            train.signalAspect = 'R';
            train.waitingReason = `先行 ${ahead.name} 追従待機`;
            train.delaySeconds += dt;
            return;
          }

          // 発車！
          train.status = 'running';
          train.isAtStation = false;
          train.dwellTimer = 0;
          train.signalAspect = 'G';
          train.waitingReason = '';
          this.addLog('info', `${train.name} ${currentStation.name} 発車 (次: ${nextStation.name})`);
        }
        return;
      }

      // 3. 信号待ち (waiting_signal)
      if (train.status === 'waiting_signal') {
        train.delaySeconds += dt;

        // 単線区間が空いたか再チェック
        if (nextStation && (TG.isSingleTrackDistance(currentStation.distance) || TG.isSingleTrackDistance(nextStation.distance))) {
          const oppTrain = this.getTrainInSingleTrackSection(currentStation.distance, nextStation.distance, train.id);
          if (!oppTrain) {
            train.status = 'running';
            train.signalAspect = 'G';
            train.waitingReason = '';
            this.addLog('info', `${train.name} 出発信号青: 単線区間へ進入開始`);
            return;
          }
        } else if (train.waitingStationId) {
          const targetTrack = train.getTargetTrack(train.waitingStationId);
          const occupier = this.getOccupiedPlatform(targetTrack, train.id);
          if (!occupier) {
            train.status = 'running';
            train.waitingStationId = null;
            train.signalAspect = 'G';
            train.waitingReason = '';
            return;
          }
        } else {
          const ahead = this.getAheadTrain(train);
          if (!ahead || Math.abs(ahead.distance - train.distance) >= 2.0) {
            train.status = 'running';
            train.signalAspect = 'G';
            train.waitingReason = '';
            return;
          }
        }
        return;
      }

      // 4. 駅間走行中 (running)
      if (train.status === 'running') {
        let speedLimit = train.typeConfig.speed;

        // 単線区間の正面衝突判定
        if (TG.isSingleTrackDistance(train.distance)) {
          const oppTrain = this.getOppositeTrainInSameSection(train);
          if (oppTrain) {
            this.incidentsCount++;
            train.speed = 0;
            train.status = 'incident';
            train.incidentRecoverTimer = 0;
            train.signalAspect = 'R';
            this.addLog('danger', `🚨 単線正面支障警報: ${train.name} と ${oppTrain.name} が同一単線区間に進入！緊急非常停止！`);
            return;
          }
        }

        // 同方向の先行列車との間隔チェック
        const ahead = this.getAheadTrain(train);
        if (ahead) {
          const distToAhead = Math.abs(ahead.distance - train.distance);
          if (distToAhead < 0.6) {
            train.speed = 0;
            train.status = 'waiting_signal';
            train.signalAspect = 'R';
            train.waitingReason = `先行 ${ahead.name} 接近停止`;
            train.delaySeconds += dt;
            if (distToAhead < 0.2) {
              this.incidentsCount++;
              this.addLog('danger', `⚠️ 異常接近警報: ${train.name} が ${ahead.name} に急接近！`);
            }
            return;
          } else if (distToAhead < 1.5) {
            speedLimit = Math.min(speedLimit, 35);
            train.signalAspect = 'Y';
          } else if (distToAhead < 3.0) {
            speedLimit = Math.min(speedLimit, 55);
            train.signalAspect = 'Y';
          } else {
            train.signalAspect = 'G';
          }
        }

        // 次駅接近判定
        const targetStop = currentStop.pass && currentStop.arr ? currentStop : nextStop || currentStop;
        const targetStation = TG.getStation(targetStop.stationId);
        const distToStation = Math.abs(targetStation.distance - train.distance);

        // 駅手前 1.0km
        if (distToStation < 1.0) {
          const targetTrack = train.getTargetTrack(targetStop.stationId);
          const occupier = this.getOccupiedPlatform(targetTrack, train.id);

          if (occupier) {
            train.speed = 0;
            train.status = 'waiting_signal';
            train.waitingStationId = targetStop.stationId;
            train.signalAspect = 'R';
            train.waitingReason = `${targetStation.name} ${targetTrack} 支障中`;
            train.delaySeconds += dt;
            this.addLog('warn', `⚠️ 場内停止: ${train.name} - ${targetStation.name} ${targetTrack} が ${occupier.name} で支障！番線変更を行ってください`);
            return;
          }

          if (!targetStop.pass) {
            speedLimit = Math.min(speedLimit, 40);
          }
        }

        // 駅到着判定 (0.1km 以内)
        if (distToStation <= 0.1) {
          train.distance = targetStation.distance;
          train.speed = 0;
          train.isAtStation = true;

          if (targetStop.pass) {
            train.currentStopIdx++;
            train.isAtStation = false;
            this.addLog('info', `${train.name} ${targetStation.name} を通過`);
          } else {
            train.status = 'stopped';
            train.currentStopIdx = train.stops.findIndex(s => s.stationId === targetStop.stationId);
            train.dwellTimer = 0;

            if (targetStop.arr > 0) {
              const delay = Math.max(0, this.currentTime - targetStop.arr);
              train.delaySeconds = Math.max(train.delaySeconds, delay);
            }

            this.addLog('info', `${train.name} ${targetStation.name} 到着 (遅れ: ${train.getDelayDisplay()})`);

            // 終着判定
            if (targetStop.stationId === train.stops[train.stops.length - 1].stationId) {
              train.status = 'arrived';
              this.addLog('success', `🏁 ${train.name} 終着 ${targetStation.name} 到着完了！`);
            }
          }
          return;
        }

        // 速度更新 & 距離移動
        const accel = 3.0 * dt;
        if (train.speed < speedLimit) {
          train.speed = Math.min(speedLimit, train.speed + accel);
        } else {
          train.speed = Math.max(speedLimit, train.speed - accel * 1.5);
        }

        const moveDist = (train.speed / 3600) * dt;
        if (isDown) {
          train.distance += moveDist;
        } else {
          train.distance -= moveDist;
        }
      }
    }

    // 先行列車探索
    getAheadTrain(train) {
      const isDown = train.direction === 'down';
      let closest = null;
      let minDiff = Infinity;

      for (const t of this.trains) {
        if (t.id === train.id || t.direction !== train.direction || t.isFinished()) continue;

        if (isDown && t.distance > train.distance) {
          const diff = t.distance - train.distance;
          if (diff < minDiff) {
            minDiff = diff;
            closest = t;
          }
        } else if (!isDown && t.distance < train.distance) {
          const diff = train.distance - t.distance;
          if (diff < minDiff) {
            minDiff = diff;
            closest = t;
          }
        }
      }
      return closest;
    }

    // 単線同一区間における対向列車の検出
    getOppositeTrainInSameSection(train) {
      const isDown = train.direction === 'down';
      for (const t of this.trains) {
        if (t.id === train.id || t.direction === train.direction || t.isFinished() || t.isAtStation) continue;

        const dist = Math.abs(t.distance - train.distance);
        if (dist < 3.5 && ((isDown && t.distance > train.distance) || (!isDown && t.distance < train.distance))) {
          return t;
        }
      }
      return null;
    }

    // ランダムトラブルイベント
    checkRandomEvents() {
      if (this.currentTime < this.nextEventTime) return;
      this.nextEventTime = this.currentTime + 120 + Math.random() * 120;

      const candidates = this.trains.filter(t => !t.isFinished() && t.status !== 'scheduled' && !t.activeIncident);
      if (candidates.length === 0) return;

      const train = candidates[Math.floor(Math.random() * candidates.length)];
      const eventTpl = TG.CONFIG.DELAY_EVENTS[Math.floor(Math.random() * TG.CONFIG.DELAY_EVENTS.length)];
      const delayDuration = Math.floor(eventTpl.minDelay + Math.random() * (eventTpl.maxDelay - eventTpl.minDelay));

      train.activeIncident = {
        title: eventTpl.title,
        remaining: delayDuration,
        total: delayDuration
      };

      // 現在の駅から後ろへ遅延を伝播させる
      const curStopIdx = train.currentStopIdx;
      train.stops = train.calculateDelayedSchedule(curStopIdx, delayDuration);
      train.delaySeconds += delayDuration;

      this.addLog('warn', `🚨 突発事態発生: ${train.name} [${eventTpl.title}]！(見込み遅延 +${Math.round(delayDuration / 60)}分)`);
    }

    calculateScore() {
      const delayPenalty = Math.floor(this.totalDelaySeconds / 60);
      const incidentPenalty = this.incidentsCount * 25;
      const conflictPenalty = this.conflicts.length * 10;
      const score = Math.max(0, 100 - delayPenalty - incidentPenalty - conflictPenalty);

      let rank = 'D';
      if (score >= 90) rank = 'S';
      else if (score >= 80) rank = 'A';
      else if (score >= 65) rank = 'B';
      else if (score >= 50) rank = 'C';

      return { score, rank, delayPenalty, incidentPenalty, conflictPenalty };
    }
  }

  TG.Simulation = Simulation;

})(window.TrainGame);

/**
 * main.js - エントリポイントとメインゲームループ
 */
window.TrainGame = window.TrainGame || {};

(function(TG) {
  'use strict';

  let sim = null;
  let renderer = null;
  let ui = null;
  let lastTimestamp = 0;

  function init() {
    const diagramCanvas = document.getElementById('diagramCanvas');

    // シミュレーション初期化
    sim = new TG.Simulation();

    // ダイヤグラムレンダラー初期化
    renderer = new TG.Renderer(diagramCanvas, sim);

    // UI初期化
    ui = new TG.UI(sim, renderer);
    TG.UI = ui; // 相互参照

    lastTimestamp = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function gameLoop(currentTimestamp) {
    const dtReal = (currentTimestamp - lastTimestamp) / 1000.0;
    lastTimestamp = currentTimestamp;

    // タブ非アクティブ時等のラグ制限
    const clampedDt = Math.min(dtReal, 0.25);

    // 1. シミュレーション更新
    sim.update(clampedDt);

    // 2. ダイヤグラム描画
    renderer.render();

    // 3. UI情報更新
    ui.update();

    requestAnimationFrame(gameLoop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.TrainGame);

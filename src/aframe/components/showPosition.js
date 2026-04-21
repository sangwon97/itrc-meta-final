// 디버그 좌표 + FPS 표시
import { THREE, registerOnce } from '../core.js';

registerOnce('show-position', {
  init() {
    this._frameTimes = [];
    this._lastTime = performance.now();
  },

  tick() {
    const now = performance.now();
    const delta = now - this._lastTime;
    this._lastTime = now;

    if (delta > 0) {
      this._frameTimes.push(delta);
      if (this._frameTimes.length > 60) this._frameTimes.shift();
    }

    const avgDelta = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
    const fps = Math.round(1000 / avgDelta);

    const pos = new THREE.Vector3();
    this.el.object3D.getWorldPosition(pos);
    const ui = document.getElementById('debug-ui');
    if (ui) {
      ui.innerHTML = `X: ${pos.x.toFixed(2)} <br>Y: ${pos.y.toFixed(2)} <br>Z: ${pos.z.toFixed(2)} <br>FPS: ${fps}`;
    }
  },
});

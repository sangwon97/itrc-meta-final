// NPC 클릭 감지
import { THREE, registerOnce } from '../core.js';
import { getNpcMeshes } from '../utils/npcRegistry.js';

registerOnce('npc-picker', {
  schema: {
    camera: { type: 'selector' },
    rig: { type: 'selector' },
    maxDistance: { type: 'number', default: 5 },
  },

  init() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._lastTap = null;

    this.handlePick = (event) => {
      this.pick(event.clientX, event.clientY);
    };

    this.handleDoubleTap = (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      const now = Date.now();
      const last = this._lastTap;
      if (last && now - last.time < 450 &&
          Math.abs(touch.clientX - last.x) < 35 &&
          Math.abs(touch.clientY - last.y) < 35) {
        this.pick(touch.clientX, touch.clientY);
        this._lastTap = null;
      } else {
        this._lastTap = { time: now, x: touch.clientX, y: touch.clientY };
      }
    };

    const bindCanvas = () => {
      this.canvas = this.el.sceneEl?.canvas;
      if (!this.canvas) return;
      this.canvas.addEventListener('dblclick', this.handlePick);
      this.canvas.addEventListener('touchend', this.handleDoubleTap, { passive: true });
    };

    if (this.el.sceneEl?.canvas) {
      bindCanvas();
    } else {
      this.el.sceneEl?.addEventListener('render-target-loaded', bindCanvas, { once: true });
    }
  },

  pick(clientX, clientY) {
    const canvas = this.canvas;
    const cameraObject = this.data.camera?.getObject3D('camera') || this.el.sceneEl?.camera;
    if (!canvas || !cameraObject) return;

    const rect = canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, cameraObject);

    const hits = this.raycaster.intersectObjects(getNpcMeshes(), true);
    const hit = hits.find((item) => item.object?.userData?.npcInfo);
    if (!hit) return;

    const rigPosition = this.data.rig?.object3D?.position;
    if (rigPosition && hit.point.distanceTo(rigPosition) > this.data.maxDistance) return;

    window.dispatchEvent(
      new CustomEvent('npc-select', {
        detail: hit.object.userData.npcInfo,
      }),
    );
  },

  remove() {
    if (!this.canvas) return;
    this.canvas.removeEventListener('dblclick', this.handlePick);
    this.canvas.removeEventListener('touchend', this.handleDoubleTap);
  },
});

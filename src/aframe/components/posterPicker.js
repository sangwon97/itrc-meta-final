// 포스터 클릭 감지
import { THREE, registerOnce } from '../core.js';
import { getPosterMeshes } from '../utils/posterRegistry.js';
import { getNpcMeshes } from '../utils/npcRegistry.js';
import { getTvMeshes } from '../utils/tvRegistry.js';
import { getTvBlockerMeshes } from '../utils/tvBlockerRegistry.js';
import { clearHintCandidate, updateHintCandidate } from '../utils/hintCoordinator.js';

function isTouchProfile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
}

function setPreviewPlateVisibility(mesh, visible) {
  const plate = mesh?.userData?.posterPreviewPlate;
  if (plate) {
    plate.visible = visible;
  }
}

function getClosestTaggedHit(hits, key) {
  return hits.find((item) => item.object?.userData?.[key]);
}

registerOnce('poster-picker', {
  schema: {
    camera: { type: 'selector' },
    rig: { type: 'selector' },
    maxDistance: { type: 'number', default: 8 },
  },
  init() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._isTouchProfile = isTouchProfile();
    this._touchStart = null;
    this._ignoreClickUntil = 0;
    this._feedbackResetTimer = null;
    this._previewTarget = null;
    this._lastPreviewCheck = 0;
    this._hintId = `poster:picker:${this.el.id || 'main'}`;

    this.handleCanvasClick = (event) => {
      if (Date.now() < this._ignoreClickUntil) return;
      this.pick(event.clientX, event.clientY);
    };

    this.handleMouseMove = (event) => {
      if (this._isTouchProfile) return;
      const hit = this.getHit(event.clientX, event.clientY);
      this.setPreviewTarget(hit?.object || null);
    };

    this.handleMouseLeave = () => {
      if (this._isTouchProfile) return;
      this.setPreviewTarget(null);
    };

    this.handleTouchStart = (event) => {
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      this._touchStart = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    this.handleTouchEnd = (event) => {
      const touch = event.changedTouches?.[0];
      const start = this._touchStart;
      this._touchStart = null;
      if (!touch || !start) return;

      const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
      const duration = Date.now() - start.time;
      if (moved > 18 || duration > 320) return;

      this._ignoreClickUntil = Date.now() + 450;
      this.pick(touch.clientX, touch.clientY);
    };

    // 실제 캔버스 생성 후 이벤트 바인딩
    const bindCanvas = () => {
      this.canvas = this.el.sceneEl?.canvas;
      if (!this.canvas) return;
      this.canvas.addEventListener('click', this.handleCanvasClick);
      this.canvas.addEventListener('mousemove', this.handleMouseMove);
      this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
      this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    };

    if (this.el.sceneEl?.canvas) {
      bindCanvas();
    } else {
      this.el.sceneEl?.addEventListener('render-target-loaded', bindCanvas, { once: true });
    }
  },
  // 화면 좌표 기준 클릭 포스터 탐색
  getHit(clientX, clientY) {
    const canvas = this.canvas;
    const cameraObject = this.data.camera?.getObject3D('camera') || this.el.sceneEl?.camera;
    if (!canvas || !cameraObject) return null;

    const rect = canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, cameraObject);

    const hits = this.raycaster.intersectObjects(getPosterMeshes(), true);
    const hit = getClosestTaggedHit(hits, 'posterInfo');
    if (!hit) return null;

    const npcHits = this.raycaster.intersectObjects(getNpcMeshes(), true);
    const closestNpc = getClosestTaggedHit(npcHits, 'npcInfo');
    if (closestNpc && closestNpc.distance < hit.distance) {
      return null;
    }

    const tvHits = this.raycaster.intersectObjects(getTvMeshes(), true);
    const closestTv = getClosestTaggedHit(tvHits, 'tvInfo');
    if (closestTv && closestTv.distance <= hit.distance) {
      return null;
    }

    const rigPosition = this.data.rig?.object3D?.position;
    if (rigPosition && hit.point.distanceTo(rigPosition) > this.data.maxDistance) {
      return null;
    }

    return hit;
  },

  getCenterHit() {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    const hit = this.getHit(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
    if (!hit || !this._isTouchProfile) return hit;

    const tvBodyHits = this.raycaster.intersectObjects(getTvBlockerMeshes(), true);
    const closestTvBody = tvBodyHits.find((item) => item.object?.userData?.tvBodyBlocker);
    if (closestTvBody && closestTvBody.distance <= hit.distance + 0.001) {
      return null;
    }

    return hit;
  },

  setPreviewTarget(mesh) {
    if (this._previewTarget === mesh) return;

    if (this._previewTarget) {
      setPreviewPlateVisibility(this._previewTarget, false);
      if (this._previewTarget.userData.posterBaseScale) {
        this._previewTarget.scale.copy(this._previewTarget.userData.posterBaseScale);
      }
    }

    this._previewTarget = mesh;

    if (this.canvas && !this._isTouchProfile) {
      this.canvas.style.cursor = mesh ? 'pointer' : '';
    }

    if (mesh) {
      if (!mesh.userData.posterBaseScale) {
        mesh.userData.posterBaseScale = mesh.scale.clone();
      }

      setPreviewPlateVisibility(mesh, true);
      const baseScale = mesh.userData.posterBaseScale;
      mesh.scale.set(baseScale.x * 1.025, baseScale.y * 1.025, baseScale.z * 1.025);
    }

    if (this._isTouchProfile) {
      if (mesh) {
        updateHintCandidate({ id: this._hintId, text: '탭하여 포스터 보기', distance: 0, visible: true });
      } else {
        clearHintCandidate(this._hintId);
      }
    }
  },

  // 선택 포스터 정보의 React 전달 (NPC가 더 가까우면 무시)
  pick(clientX, clientY) {
    const hit = this.getHit(clientX, clientY);
    if (!hit) return;

    this.playFeedback(hit.object);

    window.dispatchEvent(
      new CustomEvent('poster-select', {
        detail: hit.object.userData.posterInfo,
      }),
    );
  },

  playFeedback(targetMesh) {
    if (!targetMesh) return;

    if (!targetMesh.userData.posterBaseScale) {
      targetMesh.userData.posterBaseScale = targetMesh.scale.clone();
    }

    window.clearTimeout(this._feedbackResetTimer);

    const baseScale = targetMesh.userData.posterBaseScale;
    targetMesh.scale.set(baseScale.x * 1.04, baseScale.y * 1.04, baseScale.z * 1.04);

    this._feedbackResetTimer = window.setTimeout(() => {
      targetMesh.scale.copy(baseScale);
    }, 180);
  },

  tick(time) {
    if (this._isTouchProfile && time - this._lastPreviewCheck >= 120) {
      this._lastPreviewCheck = time;
      const hit = this.getCenterHit();
      this.setPreviewTarget(hit?.object || null);
    }

    const plateMaterial = this._previewTarget?.userData?.posterPreviewPlate?.material;
    if (plateMaterial) {
      const pulse = (Math.sin(time * 0.01) + 1) * 0.5;
      plateMaterial.opacity = 0.34 + pulse * 0.24;
    }
  },

  remove() {
    clearHintCandidate(this._hintId);
    this.setPreviewTarget(null);
    if (this.canvas) {
      this.canvas.removeEventListener('click', this.handleCanvasClick);
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
      this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
      this.canvas.removeEventListener('touchstart', this.handleTouchStart);
      this.canvas.removeEventListener('touchend', this.handleTouchEnd);
      this.canvas.style.cursor = '';
    }
    window.clearTimeout(this._feedbackResetTimer);
  },
});

import { THREE, registerOnce } from '../core.js';
import { registerTvMesh, unregisterTvMesh } from '../utils/tvRegistry.js';
import { createHintBubbleSprite } from '../utils/hintBubble.js';
import { clearHintCandidate, subscribeHintChanges, updateHintCandidate } from '../utils/hintCoordinator.js';

function hasPartialUvCoverage(bounds) {
  if (!bounds) return false;

  const epsilon = 0.0001;
  return (
    bounds.uMin > epsilon
    || bounds.vMin > epsilon
    || bounds.uMax < 1 - epsilon
    || bounds.vMax < 1 - epsilon
  );
}

function collectTargetMeshes(root) {
  const allMeshes = [];
  const namedScreenMeshes = [];

  root.traverse((node) => {
    if (!node.isMesh) return;

    allMeshes.push(node);

    const nodeName = String(node.name || '').toLowerCase();
    const parentName = String(node.parent?.name || '').toLowerCase();
    if (nodeName.includes('screen') || parentName.includes('screen')) {
      namedScreenMeshes.push(node);
    }
  });

  return namedScreenMeshes.length > 0 ? namedScreenMeshes : allMeshes;
}

function getUvBounds(meshes) {
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  let foundUv = false;

  meshes.forEach((mesh) => {
    const uvAttribute = mesh.geometry?.attributes?.uv;
    if (!uvAttribute) return;

    foundUv = true;
    for (let index = 0; index < uvAttribute.count; index += 1) {
      const u = uvAttribute.getX(index);
      const v = uvAttribute.getY(index);
      uMin = Math.min(uMin, u);
      uMax = Math.max(uMax, u);
      vMin = Math.min(vMin, v);
      vMax = Math.max(vMax, v);
    }
  });

  if (!foundUv) return null;
  return { uMin, uMax, vMin, vMax };
}

function loadScreenTexture(
  src,
  maxAnisotropy,
  { rotation = 0, uvBounds = null } = {},
  onLoad,
  onError = null,
) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const useQuarterTurn = Math.abs(Math.abs(rotation) - (Math.PI / 2)) < 0.0001;
    const canvas = document.createElement('canvas');
    canvas.width = useQuarterTurn ? img.naturalHeight : img.naturalWidth;
    canvas.height = useQuarterTurn ? img.naturalWidth : img.naturalHeight;
    const ctx = canvas.getContext('2d');

    if (rotation) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rotation);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    } else {
      ctx.drawImage(img, 0, 0);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;

    if (uvBounds && hasPartialUvCoverage(uvBounds)) {
      const repeatX = 1 / (uvBounds.uMax - uvBounds.uMin);
      const repeatY = 1 / (uvBounds.vMax - uvBounds.vMin);
      tex.repeat.set(repeatX, repeatY);
      tex.offset.set(-uvBounds.uMin * repeatX, -uvBounds.vMin * repeatY);
    }

    onLoad(tex);
  };
  img.onerror = () => {
    console.error('[tv-screen] image load failed:', src);
    onError?.();
  };
  img.src = src;
}

registerOnce('tv-screen', {
  schema: {
    rig: { type: 'selector' },
    boothId: { type: 'string', default: '' },
    imageSrc: { type: 'string' },
    youtubeId: { type: 'string' },
    hintText: { type: 'string', default: 'TV를 두 번 터치해서\n센터의 소개 영상을 시청하세요!' },
    hintMode: { type: 'string', default: 'bubble' },
    hintDistance: { type: 'number', default: 3 },
    checkInterval: { type: 'number', default: 500 },
  },

  init() {
    this._hasDeferredReady = false;
    this._hintId = `tv:${this.data.boothId || this.el.id || this.el.object3D?.uuid || 'unknown'}`;
    this._hintBubble = null;
    this._wantsHintVisible = false;
    this._registeredMeshes = [];
    this.lastCheck = 0;
    this.el.dataset.deferredReady = 'false';
    this._unsubscribeHintChanges = subscribeHintChanges((activeHint) => {
      const shouldRenderBubble = (
        this.data.hintMode === 'bubble'
        && this._wantsHintVisible
        && activeHint?.id === this._hintId
      );

      if (!shouldRenderBubble) {
        if (this._hintBubble) {
          this._hintBubble.visible = false;
        }
        return;
      }

      this.ensureHintBubble();
      this._hintBubble.visible = true;
    });
    this._lookDir = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._entityWorldPos = new THREE.Vector3();

    this.markDeferredReady = (ok = true) => {
      if (this._hasDeferredReady) return;
      this._hasDeferredReady = true;
      this.el.dataset.deferredReady = 'true';
      this.el.emit('tv-screen-ready', { ok });
    };

    this.handleModelLoaded = () => {
      const mesh = this.el.getObject3D('mesh');
      const renderer = this.el.sceneEl?.renderer;
      if (!mesh || !renderer) {
        this.markDeferredReady(false);
        return;
      }

      const targetMeshes = collectTargetMeshes(mesh);
      if (!targetMeshes.length) {
        this.markDeferredReady(false);
        return;
      }

      if (this.data.youtubeId) {
        targetMeshes.forEach((node) => {
          registerTvMesh(node, { youtubeId: this.data.youtubeId });
        });
        this._registeredMeshes = targetMeshes;
      }

      if (!this.data.imageSrc) {
        this.markDeferredReady(true);
        return;
      }

      const uvBounds = getUvBounds(targetMeshes);
      const useLegacyUvMapping = hasPartialUvCoverage(uvBounds);
      const textureRotation = useLegacyUvMapping ? Math.PI / 2 : -Math.PI / 2;

      this.material?.dispose?.();
      this.texture?.dispose?.();
      this.material = null;
      this.texture = null;

      loadScreenTexture(
        this.data.imageSrc,
        renderer.capabilities.getMaxAnisotropy(),
        {
          rotation: textureRotation,
          uvBounds,
        },
        (texture) => {
          const material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0xffffff,
            side: THREE.FrontSide,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4,
          });

          this.texture = texture;
          this.material = material;

          targetMeshes.forEach((node) => {
            node.material = material;
          });

          this.markDeferredReady(true);
        },
        () => this.markDeferredReady(false),
      );
    };

    this.handleModelError = () => {
      this.markDeferredReady(false);
    };

    this.el.addEventListener('model-loaded', this.handleModelLoaded);
    this.el.addEventListener('model-error', this.handleModelError);
  },

  ensureHintBubble() {
    if (this._hintBubble) return;

    this._hintBubble = createHintBubbleSprite(this.data.hintText, {
      maxLines: 3,
      scale: [0.6, 0.3, 1],
      position: [0.4, 1.7, -0.5],
    });
    this.el.setObject3D('tv-hint', this._hintBubble);
  },

  isLookingAt() {
    const camera = this.el.sceneEl?.camera;
    if (!camera) return true;

    camera.getWorldDirection(this._lookDir);
    camera.getWorldPosition(this._camPos);
    this.el.object3D.getWorldPosition(this._entityWorldPos);
    this._entityWorldPos.y = this._camPos.y;
    this._entityWorldPos.sub(this._camPos).normalize();

    return this._lookDir.dot(this._entityWorldPos) >= 0.75;
  },

  setHintVisible(visible, distance = Infinity) {
    this._wantsHintVisible = visible;
    updateHintCandidate({
      id: this._hintId,
      text: this.data.hintText,
      distance,
      visible,
    });
  },

  tick(time) {
    if (time - this.lastCheck < this.data.checkInterval) return;
    this.lastCheck = time;

    const rigPosition = this.data.rig?.object3D?.position;
    const entityPosition = this.el.object3D?.position;
    const mesh = this.el.getObject3D('mesh');
    if (!rigPosition || !entityPosition || !mesh) return;

    const hintDistanceSq = this.data.hintDistance * this.data.hintDistance;
    const distanceSq = rigPosition.distanceToSquared(entityPosition);
    const inRange = Boolean(this.data.youtubeId) && distanceSq <= hintDistanceSq;
    const shouldShowHint = inRange && (this.data.hintMode !== 'toast' || this.isLookingAt());

    this.setHintVisible(shouldShowHint, Math.sqrt(distanceSq));
  },

  remove() {
    this.el.removeEventListener('model-loaded', this.handleModelLoaded);
    this.el.removeEventListener('model-error', this.handleModelError);
    clearHintCandidate(this._hintId);
    this._unsubscribeHintChanges?.();
    if (this._hintBubble) {
      this._hintBubble.userData.dispose?.();
      this.el.removeObject3D('tv-hint');
      this._hintBubble = null;
    }
    this._registeredMeshes.forEach((node) => unregisterTvMesh(node));
    this._registeredMeshes = [];
    this.material?.dispose?.();
    this.texture?.dispose?.();
    this.material = null;
    this.texture = null;
  },
});

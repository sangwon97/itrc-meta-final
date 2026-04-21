import { THREE, registerOnce } from '../core.js';
import { registerPosterMesh, unregisterPosterMesh } from '../utils/posterRegistry.js';
import { getPosterInfo } from '../../services/api.js';

const pendingImageLoads = new Map();
const placeholderMaterial = new THREE.MeshBasicMaterial({
  color: 0x666666,
  side: THREE.FrontSide,
});
const posterPreviewPlateColor = 0x7dd3fc;

function isMobileTextureProfile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
}

function loadImage(src) {
  if (pendingImageLoads.has(src)) {
    return pendingImageLoads.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      pendingImageLoads.delete(src);
      resolve(image);
    };
    image.onerror = (error) => {
      pendingImageLoads.delete(src);
      reject(error);
    };
    image.src = src;
  });

  pendingImageLoads.set(src, promise);
  return promise;
}

function createScaledTexture(image, sceneEl, maxDimension, flipX = false) {
  const mobileProfile = isMobileTextureProfile();
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  if (flipX) {
    context.save();
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(image, 0, 0, width, height);
    context.restore();
  } else {
    context.drawImage(image, 0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(
    sceneEl.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1,
    mobileProfile || maxDimension <= 128 ? 1 : 2,
  );
  return texture;
}

function loadPosterTexture(src, sceneEl, quality, flipX = false) {
  const mobileProfile = isMobileTextureProfile();
  const maxDimension = quality === 'high'
    ? (mobileProfile ? 512 : 1024)
    : (mobileProfile ? 64 : 128);

  return loadImage(src).then((image) =>
    createScaledTexture(image, sceneEl, maxDimension, flipX),
  );
}

function ensurePosterPreviewPlate(node) {
  if (node.userData.posterPreviewPlate || !node.geometry) return;

  const plate = new THREE.Mesh(
    node.geometry,
    new THREE.MeshBasicMaterial({
      color: posterPreviewPlateColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.52,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    }),
  );

  plate.visible = false;
  plate.renderOrder = 7;
  plate.scale.setScalar(1.08);
  plate.position.z = -0.012;
  plate.userData.isPosterPreviewPlate = true;

  node.add(plate);
  node.userData.posterPreviewPlate = plate;
}

registerOnce('distance-poster', {
  schema: {
    rig: { type: 'selector' },
    model: { type: 'string' },
    texture: { type: 'string' },
    flipX: { type: 'boolean', default: false },
    anchorX: { type: 'number', default: 0 },
    anchorZ: { type: 'number', default: 0 },
    nearDistance: { type: 'number', default: 8 },
    checkInterval: { type: 'number', default: 250 },
  },

  init() {
    this.posterInfo = getPosterInfo(this.data.texture);
    this._lastCheck = 0;
    this._quality = 'placeholder';
    this._loadToken = 0;
    this._meshNodes = [];
    this._anchor = { x: this.data.anchorX, z: this.data.anchorZ };
    this._material = null;
    this._hasDeferredReady = false;
    this.el.dataset.deferredReady = 'false';
    this._onModelLoaded = this.handleModelLoaded.bind(this);
    this._onModelError = this.handleModelError.bind(this);
    this.el.addEventListener('model-loaded', this._onModelLoaded);
    this.el.addEventListener('model-error', this._onModelError);
    this.el.setAttribute('gltf-model', this.data.model);
  },

  markDeferredReady(ok = true) {
    if (this._hasDeferredReady) return;
    this._hasDeferredReady = true;
    this.el.dataset.deferredReady = 'true';
    this.el.emit('poster-ready', { ok });
  },

  handleModelError() {
    this.markDeferredReady(false);
  },

  getDesiredQuality() {
    const rig = this.data.rig?.object3D;
    if (!rig) return 'low';

    const anchor = this._anchor || { x: this.data.anchorX, z: this.data.anchorZ };
    const distance = Math.hypot(rig.position.x - anchor.x, rig.position.z - anchor.z);
    return distance <= this.data.nearDistance ? 'high' : 'low';
  },

  handleModelLoaded() {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) {
      this.markDeferredReady(false);
      return;
    }

    const posterMetadata = {
      title: this.posterInfo?.title || '포스터 안내',
      description: this.posterInfo?.description || '포스터 상세 설명입니다.',
      forumLink: this.posterInfo?.forumLink ?? null,
      imageSrc: this.data.texture,
    };

    this._meshNodes = [];
    mesh.traverse((node) => {
      if (!node.isMesh || node.userData.isPosterFrame || node.userData.isPosterPreviewPlate) return;
      node.userData.posterInfo = posterMetadata;
      registerPosterMesh(node, posterMetadata);
      ensurePosterPreviewPlate(node);
      this._meshNodes.push(node);
    });

    // Use the actual poster model position in world space so quality switches
    // based on the poster the user is standing near, not a guessed booth anchor.
    mesh.updateMatrixWorld(true);
    const worldBounds = new THREE.Box3().setFromObject(mesh);
    if (!worldBounds.isEmpty()) {
      const center = new THREE.Vector3();
      worldBounds.getCenter(center);
      this._anchor = { x: center.x, z: center.z };
    }

    this.applyQuality(this.getDesiredQuality());
  },

  ensurePosterMaterial() {
    if (this._material) return this._material;
    this._material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.FrontSide,
    });
    return this._material;
  },

  applyPlaceholder() {
    this._meshNodes.forEach((node) => {
      if (node.material !== placeholderMaterial) {
        node.material = placeholderMaterial;
      }
    });
  },

  applyTexture(texture) {
    const material = this.ensurePosterMaterial();
    const previousMap = material.map;
    material.map = texture;
    material.needsUpdate = true;

    if (previousMap && previousMap !== texture) {
      previousMap.dispose();
    }

    this._meshNodes.forEach((node) => {
      if (node.material !== material) {
        node.material = material;
      }
    });

    this.markDeferredReady(true);
  },

  applyQuality(quality) {
    this._quality = quality;
    if (!this._meshNodes.length) return;

    if (quality === 'placeholder') {
      this._loadToken += 1;
      this.applyPlaceholder();
      return;
    }

    const loadToken = ++this._loadToken;
    loadPosterTexture(this.data.texture, this.el.sceneEl, quality, this.data.flipX)
      .then((texture) => {
        if (loadToken !== this._loadToken || this._quality !== quality) {
          texture.dispose();
          return;
        }
        this.applyTexture(texture);
      })
      .catch((error) => {
        console.error('[distance-poster] 텍스처 로드 실패:', error);
        this.markDeferredReady(false);
      });
  },

  tick(time) {
    if (time - this._lastCheck < this.data.checkInterval) return;
    this._lastCheck = time;

    const rig = this.data.rig?.object3D;
    if (!rig) return;

    const anchor = this._anchor || { x: this.data.anchorX, z: this.data.anchorZ };
    const distance = Math.hypot(rig.position.x - anchor.x, rig.position.z - anchor.z);
    const nextQuality = distance <= this.data.nearDistance ? 'high' : 'low';
    if (nextQuality !== this._quality) {
      this.applyQuality(nextQuality);
    }
  },

  remove() {
    this._loadToken += 1;
    this.el.removeEventListener('model-loaded', this._onModelLoaded);
    this.el.removeEventListener('model-error', this._onModelError);
    this._meshNodes.forEach((node) => unregisterPosterMesh(node));
    this._meshNodes = [];
    if (this._material) {
      this._material.map?.dispose?.();
      this._material.dispose();
      this._material = null;
    }
  },
});

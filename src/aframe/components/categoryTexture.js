import { THREE, registerOnce } from '../core.js';

const imageCache = new Map();
const materialCache = new Map();
const placeholderMaterial = new THREE.MeshBasicMaterial({
  color: 0x6b7280,
  side: THREE.FrontSide,
});

function isMobileTextureProfile() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;
}

function loadImage(src) {
  if (imageCache.has(src)) {
    return imageCache.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

function buildTextureMaterial(image, sceneEl, maxDimension) {
  const mobileProfile = isMobileTextureProfile();
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(
    sceneEl.renderer?.capabilities?.getMaxAnisotropy?.() ?? 1,
    mobileProfile || maxDimension <= 256 ? 1 : 2,
  );

  return new THREE.MeshBasicMaterial({
    map: texture,
    color: 0xffffff,
    side: THREE.FrontSide,
  });
}

function loadMaterial(src, sceneEl, quality) {
  const cacheKey = `${src}:${quality}`;
  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey);
  }

  const mobileProfile = isMobileTextureProfile();
  const maxDimension = quality === 'high'
    ? (mobileProfile ? 384 : 1024)
    : (mobileProfile ? 96 : 192);
  const promise = loadImage(src).then((image) => buildTextureMaterial(image, sceneEl, maxDimension));
  materialCache.set(cacheKey, promise);
  return promise;
}

registerOnce('category-texture', {
  schema: {
    src: { type: 'string' },
    rig: { type: 'selector' },
    nearDistance: { type: 'number', default: 12 },
    checkInterval: { type: 'number', default: 250 },
  },

  init() {
    this._lastCheck = 0;
    this._quality = 'placeholder';
    this._loadToken = 0;
    this._meshNodes = [];
    this._anchor = new THREE.Vector3();
    this._hasAnchor = false;
    this._bounds = new THREE.Box3();
    this._onModelLoaded = this.handleModelLoaded.bind(this);
    this._onModelError = this.handleModelError.bind(this);
    this._hasDeferredReady = false;
    this.el.dataset.deferredReady = 'false';

    if (this.el.getObject3D('mesh')) {
      this.handleModelLoaded();
    } else {
      this.el.addEventListener('model-loaded', this._onModelLoaded);
      this.el.addEventListener('model-error', this._onModelError);
    }
  },

  markDeferredReady(ok = true) {
    if (this._hasDeferredReady) return;
    this._hasDeferredReady = true;
    this.el.dataset.deferredReady = 'true';
    this.el.emit('category-texture-ready', { ok });
  },

  handleModelError() {
    this.markDeferredReady(false);
  },

  getDesiredQuality() {
    const rig = this.data.rig?.object3D;
    if (!rig || !this._hasAnchor) return 'low';

    const distance = Math.hypot(rig.position.x - this._anchor.x, rig.position.z - this._anchor.z);
    return distance <= this.data.nearDistance ? 'high' : 'low';
  },

  handleModelLoaded() {
    const mesh = this.el.getObject3D('mesh');
    if (!mesh) {
      this.markDeferredReady(false);
      return;
    }

    this._meshNodes = [];
    mesh.traverse((node) => {
      if (node.isMesh) {
        this._meshNodes.push(node);
      }
    });

    this._bounds.setFromObject(mesh);
    if (!this._bounds.isEmpty()) {
      this._bounds.getCenter(this._anchor);
      this._hasAnchor = true;
    }

    this.applyQuality(this.getDesiredQuality());
  },

  applyMaterial(material) {
    this._meshNodes.forEach((node) => {
      node.material = material;
    });

    if (this._quality !== 'placeholder') {
      this.markDeferredReady(true);
    }
  },

  applyQuality(quality) {
    this._quality = quality;
    if (!this._meshNodes.length) return;

    if (quality === 'placeholder') {
      this.applyMaterial(placeholderMaterial);
      return;
    }

    const loadToken = ++this._loadToken;
    loadMaterial(this.data.src, this.el.sceneEl, quality)
      .then((material) => {
        if (this._loadToken !== loadToken || this._quality !== quality) return;
        this.applyMaterial(material);
      })
      .catch((error) => {
        console.error('[category-texture] 텍스처 로드 실패:', error);
        this.markDeferredReady(false);
      });
  },

  tick(time) {
    if (time - this._lastCheck < this.data.checkInterval) return;
    this._lastCheck = time;

    const rig = this.data.rig?.object3D;
    if (!rig || !this._hasAnchor) return;

    const distance = Math.hypot(rig.position.x - this._anchor.x, rig.position.z - this._anchor.z);
    const nextQuality = distance <= this.data.nearDistance ? 'high' : 'low';

    if (nextQuality !== this._quality) {
      this.applyQuality(nextQuality);
    }
  },

  remove() {
    this.el.removeEventListener('model-loaded', this._onModelLoaded);
    this.el.removeEventListener('model-error', this._onModelError);
  },
});

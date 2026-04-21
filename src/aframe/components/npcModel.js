// NPC 캐릭터 로더 컴포넌트
// THREE.Cache를 활성화해 동일 파일은 네트워크에서 1번만 다운로드
import { MeshoptDecoder } from 'meshoptimizer';
import { THREE, registerOnce } from '../core.js';
import { registerNpcMesh, unregisterNpcMesh } from '../utils/npcRegistry.js';

THREE.Cache.enabled = true;

const sharedModelCache = new Map();
let sharedLoader = null;

function getLoader() {
  if (sharedLoader) return sharedLoader;

  const GLTFLoader = THREE.GLTFLoader;
  if (!GLTFLoader) {
    throw new Error('[npc-model] THREE.GLTFLoader를 찾을 수 없습니다.');
  }

  const VRMLoaderPlugin = window.THREE_VRM?.VRMLoaderPlugin;
  if (!VRMLoaderPlugin) {
    throw new Error('[npc-model] window.THREE_VRM.VRMLoaderPlugin를 찾을 수 없습니다.');
  }

  sharedLoader = new GLTFLoader();
  sharedLoader.setMeshoptDecoder?.(MeshoptDecoder);
  sharedLoader.register((parser) => new VRMLoaderPlugin(parser));
  return sharedLoader;
}

function findBone(root, names) {
  let found = null;

  root?.traverse?.((node) => {
    if (found || !node?.isBone) return;
    if (names.includes(node.name)) {
      found = node;
    }
  });

  return found;
}

function applyNpcPose(sceneRoot, humanoid) {
  sceneRoot.rotation.y = Math.PI;

  const leftArm = humanoid?.getRawBoneNode?.('leftUpperArm') || findBone(sceneRoot, ['leftUpperArm']);
  const rightArm = humanoid?.getRawBoneNode?.('rightUpperArm') || findBone(sceneRoot, ['rightUpperArm']);
  const leftFore = humanoid?.getRawBoneNode?.('leftLowerArm') || findBone(sceneRoot, ['leftLowerArm']);
  const rightFore = humanoid?.getRawBoneNode?.('rightLowerArm') || findBone(sceneRoot, ['rightLowerArm']);
  const d = THREE.MathUtils.degToRad;

  if (leftArm) { leftArm.rotation.z = d(75); leftArm.rotation.x = d(6); }
  if (rightArm) { rightArm.rotation.z = -d(75); rightArm.rotation.x = d(6); }
  if (leftFore) { leftFore.rotation.x = d(8); leftFore.rotation.z = -d(4); }
  if (rightFore) { rightFore.rotation.x = d(8); rightFore.rotation.z = d(4); }
}

async function loadSharedSceneTemplate(src) {
  if (!sharedModelCache.has(src)) {
    const loaderPromise = new Promise((resolve, reject) => {
      const loader = getLoader();

      loader.load(
        src,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          const sceneRoot = vrm?.scene || gltf.scene;
          if (!sceneRoot) {
            reject(new Error('[npc-model] 로드한 씬 데이터를 찾을 수 없습니다.'));
            return;
          }

          applyNpcPose(sceneRoot, vrm?.humanoid);

          resolve({
            sceneRoot,
          });
        },
        undefined,
        reject,
      );
    });

    sharedModelCache.set(src, loaderPromise);
  }

  return sharedModelCache.get(src);
}

function cloneSharedScene(sceneRoot) {
  const skeletonUtils = THREE.SkeletonUtils;
  if (skeletonUtils?.clone) {
    return skeletonUtils.clone(sceneRoot);
  }

  return sceneRoot.clone(true);
}

registerOnce('npc-model', {
  schema: {
    src: { type: 'string' },
    headOffset: { type: 'number', default: 0 },
    npcName: { type: 'string', default: 'NPC' },
    npcGreeting: { type: 'string', default: '안녕하세요! 전시장에 오신 것을 환영합니다.' },
    boothId: { type: 'string', default: '' },
    pauseOutsideViewport: { type: 'boolean', default: false },
    nearViewportBypassDistance: { type: 'number', default: 3 },
  },

  init() {
    this._disposed = false;
    this._chest = null;
    this._worldPosition = new THREE.Vector3();
    this._cameraWorldPosition = new THREE.Vector3();
    this._clipPosition = new THREE.Vector3();
    this.loadModel();
  },

  async loadModel() {
    try {
      const { sceneRoot } = await loadSharedSceneTemplate(this.data.src);
      if (this._disposed) return;

      const sceneClone = cloneSharedScene(sceneRoot);
      if (this._disposed) return;

      const npcInfo = {
        npcName: this.data.npcName,
        npcGreeting: this.data.npcGreeting,
        boothId: this.data.boothId,
      };

      this._chest = findBone(sceneClone, ['upperChest', 'chest']);
      sceneClone.traverse((node) => {
        if (node.isMesh) registerNpcMesh(node, npcInfo);
      });

      this.el.setObject3D('npc', sceneClone);
      this.npcModel = { scene: sceneClone };
    } catch (error) {
      console.error('[npc-model] 로드 실패:', error);
    }
  },

  isInViewport() {
    if (!this.data.pauseOutsideViewport || !this.npcModel?.scene) return true;

    const camera = document.getElementById('player-camera')?.getObject3D('camera');
    if (!camera) return true;

    this.npcModel.scene.getWorldPosition(this._worldPosition);
    camera.getWorldPosition(this._cameraWorldPosition);

    if (
      this._worldPosition.distanceToSquared(this._cameraWorldPosition)
      <= this.data.nearViewportBypassDistance * this.data.nearViewportBypassDistance
    ) {
      return true;
    }

    this._clipPosition.copy(this._worldPosition).project(camera);

    return (
      this._clipPosition.z > -1 &&
      this._clipPosition.z < 1.1 &&
      Math.abs(this._clipPosition.x) <= 1.2 &&
      Math.abs(this._clipPosition.y) <= 1.2
    );
  },

  tick(time) {
    if (!this.npcModel?.scene) return;

    const visible = this.isInViewport();
    this.npcModel.scene.visible = visible;

    if (!visible || !this._chest) return;
    // 약 4초 주기의 미세한 가슴 팽창으로 호흡감 연출
    this._chest.rotation.x = Math.sin(time * 0.00157) * 0.018;
  },

  remove() {
    this._disposed = true;
    this._chest = null;
    if (this.npcModel) {
      this.npcModel.scene.traverse((node) => {
        if (node.isMesh) unregisterNpcMesh(node);
      });
      this.el.removeObject3D('npc');
      this.npcModel = null;
    }
  },
});

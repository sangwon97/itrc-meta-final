import { MeshoptDecoder } from 'meshoptimizer';
import { THREE } from './core.js';

const GLTFLoader = THREE.GLTFLoader;

if (!GLTFLoader) {
  console.warn('[meshopt] THREE.GLTFLoader를 찾을 수 없어 MeshoptDecoder를 연결하지 못했습니다.');
} else if (GLTFLoader.prototype.setMeshoptDecoder) {
  const originalLoad = GLTFLoader.prototype.load;
  const originalParse = GLTFLoader.prototype.parse;

  const attachMeshoptDecoder = (loader) => {
    if (loader.__meshoptAttached) return;
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.__meshoptAttached = true;
  };

  GLTFLoader.prototype.load = function patchedLoad(...args) {
    attachMeshoptDecoder(this);
    return originalLoad.apply(this, args);
  };

  GLTFLoader.prototype.parse = function patchedParse(...args) {
    attachMeshoptDecoder(this);
    return originalParse.apply(this, args);
  };
} else {
  console.warn('[meshopt] 현재 GLTFLoader는 MeshoptDecoder 연결 API를 지원하지 않습니다.');
}

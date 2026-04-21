import { registerOnce } from '../core.js';
import { registerTvBlockerMesh } from '../utils/tvBlockerRegistry.js';

registerOnce('tv-body-blocker', {
  init() {
    this.handleModelLoaded = () => {
      const mesh = this.el.getObject3D('mesh');
      if (!mesh) return;

      mesh.traverse((node) => {
        if (!node.isMesh) return;
        registerTvBlockerMesh(node);
      });
    };

    this.el.addEventListener('model-loaded', this.handleModelLoaded);
  },

  remove() {
    this.el.removeEventListener('model-loaded', this.handleModelLoaded);
  },
});

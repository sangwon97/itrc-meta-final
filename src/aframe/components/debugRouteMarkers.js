import { THREE, registerOnce } from '../core.js';
import { boothRouteTargetMap } from '../../features/scene/sceneData.js';

registerOnce('debug-route-markers', {
  init() {
    const group = new THREE.Group();

    const stemMat = new THREE.MeshBasicMaterial({ color: 0xffd600, depthTest: false, toneMapped: false });
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xff3d00, depthTest: false, toneMapped: false });
    const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    const coneGeo = new THREE.ConeGeometry(0.18, 0.4, 8);

    Object.entries(boothRouteTargetMap).forEach(([boothId, pos]) => {
      const pin = new THREE.Group();
      pin.position.set(pos.x, pos.y, pos.z);

      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.y = 0.6;
      stem.renderOrder = 20;
      pin.add(stem);

      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.y = 1.4;
      cone.renderOrder = 20;
      pin.add(cone);

      // 텍스트 라벨 (canvas sprite)
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.roundRect(4, 4, 248, 56, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(boothId, 128, 32);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const spriteMat = new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(0.9, 0.22, 1);
      sprite.position.y = 2.0;
      sprite.renderOrder = 21;
      pin.add(sprite);

      group.add(pin);
    });

    this.el.setObject3D('debug-markers', group);
  },

  remove() {
    this.el.removeObject3D('debug-markers');
  },
});

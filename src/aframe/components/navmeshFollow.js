// 이동 경계 보정
import { THREE, registerOnce } from '../core.js';

registerOnce('navmesh-follow', {
  schema: {
    navmesh: { type: 'selector' },
    walls: { type: 'selector' },
    height: { type: 'number', default: 1.6 },
    rayStart: { type: 'number', default: 4 },
    collisionRadius: { type: 'number', default: 0.35 },
  },
  init() {
    this.raycaster = new THREE.Raycaster();
    this.wallRaycaster = new THREE.Raycaster();
    this.down = new THREE.Vector3(0, -1, 0);
    this.origin = new THREE.Vector3();
    this.wallOrigin = new THREE.Vector3();
    this.wallDirection = new THREE.Vector3();
    this.lastValidPosition = this.el.object3D.position.clone();
    this.navmeshObject = null;
    this.wallsObject = null;

    const updateNavmesh = () => {
      this.navmeshObject = this.data.navmesh?.getObject3D('mesh') || null;
    };
    const updateWalls = () => {
      this.wallsObject = this.data.walls?.getObject3D('mesh') || null;
    };

    if (this.data.navmesh?.getObject3D('mesh')) {
      updateNavmesh();
    } else {
      this.data.navmesh?.addEventListener('model-loaded', updateNavmesh);
    }

    if (this.data.walls?.getObject3D('mesh')) {
      updateWalls();
    } else {
      this.data.walls?.addEventListener('model-loaded', updateWalls);
    }
  },
  getHit(x, y, z) {
    if (!this.navmeshObject) return null;
    this.origin.set(x, y + this.data.rayStart, z);
    this.raycaster.set(this.origin, this.down);
    const hits = this.raycaster.intersectObject(this.navmeshObject, true);
    return hits.length > 0 ? hits[0] : null;
  },
  collidesWithWall(fromX, fromY, fromZ, toX, toY, toZ) {
    if (!this.wallsObject) return false;

    this.wallDirection.set(toX - fromX, 0, toZ - fromZ);
    const distance = this.wallDirection.length();
    if (distance < 1e-4) return false;

    this.wallDirection.normalize();
    this.wallOrigin.set(fromX, toY, fromZ);
    this.wallRaycaster.set(this.wallOrigin, this.wallDirection);
    this.wallRaycaster.far = distance + this.data.collisionRadius;

    const hits = this.wallRaycaster.intersectObject(this.wallsObject, true);
    return hits.length > 0 && hits[0].distance <= distance + this.data.collisionRadius;
  },
  tick() {
    if (!this.navmeshObject) return;
    const position = this.el.object3D.position;
    const prev = this.lastValidPosition;

    const fullHit = this.getHit(position.x, position.y, position.z);
    if (
      fullHit &&
      !this.collidesWithWall(prev.x, prev.y, prev.z, position.x, fullHit.point.y + this.data.height, position.z)
    ) {
      position.y = fullHit.point.y + this.data.height;
      prev.copy(position);
      return;
    }

    const slideXHit = this.getHit(position.x, position.y, prev.z);
    if (
      slideXHit &&
      !this.collidesWithWall(prev.x, prev.y, prev.z, position.x, slideXHit.point.y + this.data.height, prev.z)
    ) {
      position.z = prev.z;
      position.y = slideXHit.point.y + this.data.height;
      prev.copy(position);
      return;
    }

    const slideZHit = this.getHit(prev.x, position.y, position.z);
    if (
      slideZHit &&
      !this.collidesWithWall(prev.x, prev.y, prev.z, prev.x, slideZHit.point.y + this.data.height, position.z)
    ) {
      position.x = prev.x;
      position.y = slideZHit.point.y + this.data.height;
      prev.copy(position);
      return;
    }

    position.copy(prev);
  },
});

// 로드맵 렌더링 유틸
import { THREE } from '../core.js';

export function clearRouteState(state) {
  state.arrowMarkers.length = 0;
  if (state.targetMarkers) state.targetMarkers.length = 0;
  while (state.routeGroup.children.length > 0) {
    state.routeGroup.remove(state.routeGroup.children[0]);
  }
  state.routeMaterials.forEach((material) => material.dispose());
  state.routeGeometries.forEach((geometry) => geometry.dispose());
  state.routeMaterials.length = 0;
  state.routeGeometries.length = 0;
}

const CONE_RADIUS = 0.22;
const CONE_HEIGHT = 0.45;
const STEM_HEIGHT = 1.2;
const CONE_CENTER_Y = STEM_HEIGHT + CONE_HEIGHT / 2;

export function renderRoute(state, options) {
  const { points, targetPoints, color, lineWidth, arrowGeometry } = options;
  clearRouteState(state);
  if (points.length < 2) return;

  const lineMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const arrowMaterial = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const markerMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  state.routeMaterials.push(lineMaterial, arrowMaterial, markerMaterial);

  const coneGeometry = new THREE.ConeGeometry(CONE_RADIUS, CONE_HEIGHT, 16);
  const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, STEM_HEIGHT, 8);
  state.routeGeometries.push(coneGeometry, stemGeometry);

  targetPoints.forEach((point, index) => {
    const group = new THREE.Group();
    group.position.set(point.x, point.y, point.z);
    group._baseY = point.y;
    group._phaseOffset = index * 1.1;

    const stem = new THREE.Mesh(stemGeometry, markerMaterial);
    stem.position.y = STEM_HEIGHT / 2;
    stem.renderOrder = 13;
    group.add(stem);

    const cone = new THREE.Mesh(coneGeometry, markerMaterial);
    cone.rotation.x = Math.PI; // 아래 방향
    cone.position.y = CONE_CENTER_Y;
    cone.renderOrder = 13;
    group.add(cone);

    state.routeGroup.add(group);
    if (state.targetMarkers) state.targetMarkers.push(group);
  });

  for (let i = 0; i < points.length - 1; i += 1) {
    const start = points[i];
    const end = points[i + 1];
    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    const horizontal = Math.abs(deltaX) >= Math.abs(deltaZ);
    const distance = horizontal ? Math.abs(deltaX) : Math.abs(deltaZ);
    if (distance < 0.001) continue;

    const lineGeometry = new THREE.BoxGeometry(
      horizontal ? distance + lineWidth : lineWidth,
      0.035,
      horizontal ? lineWidth : distance + lineWidth,
    );
    const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial);
    lineMesh.position.set((start.x + end.x) * 0.5, Math.max(start.y, end.y), (start.z + end.z) * 0.5);
    lineMesh.renderOrder = 11;
    state.routeGroup.add(lineMesh);
    state.routeGeometries.push(lineGeometry);

    const direction = new THREE.Vector3(horizontal ? Math.sign(deltaX) : 0, 0, horizontal ? 0 : Math.sign(deltaZ));
    const arrowSpacing = 1.8;
    const arrowCount = Math.max(1, Math.floor(distance / arrowSpacing));

    for (let arrowIndex = 0; arrowIndex < arrowCount; arrowIndex += 1) {
      const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrowMesh.position.copy(start);
      arrowMesh.position.y = Math.max(start.y, end.y) + 0.02;
      arrowMesh.rotation.set(
        0,
        horizontal ? (direction.x > 0 ? 0 : Math.PI) : direction.z > 0 ? -Math.PI / 2 : Math.PI / 2,
        0,
      );
      arrowMesh.renderOrder = 12;
      state.routeGroup.add(arrowMesh);
      state.arrowMarkers.push({
        mesh: arrowMesh,
        start,
        direction,
        distance,
        offset: (arrowIndex / arrowCount) * distance,
      });
    }
  }
}

export function updateTargetMarkers(targetMarkers, time) {
  const t = (time || 0) * 0.001;
  targetMarkers.forEach((group) => {
    group.position.y = group._baseY + Math.sin(t * 1.8 + group._phaseOffset) * 0.12;
  });
}

export function updateArrowMarkers(arrowMarkers, speed, time) {
  const seconds = (time || 0) * 0.001 * speed;
  arrowMarkers.forEach(({ mesh, start, direction, distance, offset }) => {
    const progress = (seconds + offset) % distance;
    mesh.position.set(start.x + direction.x * progress, mesh.position.y, start.z + direction.z * progress);
  });
}

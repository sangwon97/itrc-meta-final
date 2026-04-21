// 로드맵 경로 계산
import { THREE, registerOnce } from '../core.js';
import {
  cellKey,
  cellToWorld,
  compressPath,
  findNearestWalkable,
  findPath,
  worldToCell,
} from '../utils/pathfinding.js';
import { clearRouteState, renderRoute, updateArrowMarkers, updateTargetMarkers } from '../utils/routeRendering.js';

// 로드맵 미니맵 동기화 이벤트 발행
function dispatchRouteUpdated(detail) {
  window.dispatchEvent(new CustomEvent('route-updated', { detail }));
}

registerOnce('a-star-route', {
  schema: {
    navmesh: { type: 'selector' },
    rig: { type: 'selector' },
    active: { type: 'boolean', default: false },
    color: { type: 'color', default: '#dc2626' },
    targetsJson: { type: 'string', default: '[]' },
    viaJson: { type: 'string', default: '[]' },
    startPoint: { type: 'vec3', default: { x: -4.79, y: 0, z: -38.41 } },
    cellSize: { type: 'number', default: 0.6 },
    lineWidth: { type: 'number', default: 0.34 },
    speed: { type: 'number', default: 0.65 },
  },
  init() {
    this.navmeshObject = null;
    this.grid = null;
    this.needsRebuild = true;
    this.lastStartCellKey = '';
    this.lastRefreshTime = 0;
    this.routeMaterials = [];
    this.routeGeometries = [];
    this.arrowMarkers = [];
    this.targetMarkers = [];
    this.routeGroup = new THREE.Group();
    this.el.setObject3D('mesh', this.routeGroup);

    // 방향 화살표 도형
    this.arrowGeometry = new THREE.BufferGeometry();
    this.arrowGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(
        new Float32Array([0.16, 0, 0, -0.06, 0, 0.08, -0.06, 0, -0.08]),
        3,
      ),
    );
    this.arrowGeometry.setIndex([0, 1, 2]);
    this.arrowGeometry.computeVertexNormals();


    const syncNavmesh = () => {
      this.navmeshObject = this.data.navmesh?.getObject3D('mesh') || null;
      this.grid = null;
      this.needsRebuild = true;
    };

    if (this.data.navmesh?.getObject3D('mesh')) {
      syncNavmesh();
    } else {
      this.data.navmesh?.addEventListener('model-loaded', syncNavmesh);
    }
  },
  update() {
    this.needsRebuild = true;
    if (!this.data.active) {
      this.clearRoute();
    }
  },
  remove() {
    clearRouteState(this);
    this.arrowGeometry.dispose();
  },
  clearRoute() {
    clearRouteState(this);
    dispatchRouteUpdated({
      active: false,
      points: [],
      targetPoints: [],
      color: this.data.color,
    });
  },
  ensureGrid() {
    if (this.grid || !this.navmeshObject) {
      return this.grid;
    }

    const bounds = new THREE.Box3().setFromObject(this.navmeshObject);
    const raycaster = new THREE.Raycaster();
    const down = new THREE.Vector3(0, -1, 0);
    const cellSize = this.data.cellSize;
    const cols = Math.ceil((bounds.max.x - bounds.min.x) / cellSize) + 1;
    const rows = Math.ceil((bounds.max.z - bounds.min.z) / cellSize) + 1;
    const walkable = Array.from({ length: rows }, () => Array(cols).fill(false));
    const heights = Array.from({ length: rows }, () => Array(cols).fill(0));
    const origin = new THREE.Vector3();

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = bounds.min.x + col * cellSize;
        const z = bounds.min.z + row * cellSize;
        origin.set(x, bounds.max.y + 3, z);
        raycaster.set(origin, down);
        const hits = raycaster.intersectObject(this.navmeshObject, true);
        if (hits.length === 0) continue;
        walkable[row][col] = true;
        heights[row][col] = hits[0].point.y;
      }
    }

    this.grid = {
      bounds,
      cellSize,
      cols,
      rows,
      walkable,
      heights,
      originX: bounds.min.x,
      originZ: bounds.min.z,
    };

    return this.grid;
  },
  getRouteTargets() {
    try {
      const targets = JSON.parse(this.data.targetsJson);
      return Array.isArray(targets) ? targets : [];
    } catch {
      return [];
    }
  },
  getViaTargets() {
    try {
      const viaTargets = JSON.parse(this.data.viaJson);
      return Array.isArray(viaTargets) ? viaTargets : [];
    } catch {
      return [];
    }
  },
  renderRoute(points, targetPoints = []) {
    renderRoute(this, {
      points,
      targetPoints,
      color: this.data.color,
      lineWidth: this.data.lineWidth,
      arrowGeometry: this.arrowGeometry,
    });
  },
  rebuildRoute() {
    if (!this.data.active || !this.navmeshObject || !this.data.rig?.object3D) {
      this.clearRoute();
      return;
    }

    const grid = this.ensureGrid();
    if (!grid) return;

    const startCell = findNearestWalkable(worldToCell(this.data.startPoint.x, this.data.startPoint.z, grid), grid);
    const viaTargets = this.getViaTargets();
    const targets = this.getRouteTargets();

    if (!startCell || viaTargets.length + targets.length === 0) {
      this.clearRoute();
      return;
    }

    this.lastStartCellKey = cellKey(startCell);
    let currentStart = startCell;
    const fullPath = [startCell];
    const resolvedTargetPoints = [];
    const routeStops = [...viaTargets, ...targets];

    for (let i = 0; i < routeStops.length; i += 1) {
      const stop = routeStops[i];
      const goalCell = findNearestWalkable(worldToCell(stop.x, stop.z, grid), grid);
      if (!goalCell) continue;

      const segment = findPath(currentStart, goalCell, grid);
      if (segment.length === 0) continue;

      if (i >= viaTargets.length) {
        resolvedTargetPoints.push(cellToWorld(goalCell, grid));
      }

      fullPath.push(...segment.slice(1));
      currentStart = goalCell;
    }

    const points = compressPath(fullPath, grid);
    this.renderRoute(points, resolvedTargetPoints);
    dispatchRouteUpdated({
      active: points.length > 1,
      points: points.map((point) => ({ x: point.x, z: point.z })),
      targetPoints: resolvedTargetPoints.map((point) => ({ x: point.x, z: point.z })),
      color: this.data.color,
    });
  },
  tick(time) {
    if (!this.data.active) return;

    const now = time || 0;
    if (this.needsRebuild || now - this.lastRefreshTime > 500) {
      const grid = this.ensureGrid();
      if (grid) {
        const startCell = findNearestWalkable(worldToCell(this.data.startPoint.x, this.data.startPoint.z, grid), grid);
        const startKey = startCell ? cellKey(startCell) : '';
        if (this.needsRebuild || startKey !== this.lastStartCellKey) {
          this.rebuildRoute();
          this.needsRebuild = false;
        }
      }
      this.lastRefreshTime = now;
    }

    updateArrowMarkers(this.arrowMarkers, this.data.speed, now);
    updateTargetMarkers(this.targetMarkers, now);
  },
});

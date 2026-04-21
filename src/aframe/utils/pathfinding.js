// 경로 계산 유틸
import { THREE } from '../core.js';

export function worldToCell(x, z, grid) {
  return {
    col: Math.round((x - grid.originX) / grid.cellSize),
    row: Math.round((z - grid.originZ) / grid.cellSize),
  };
}

export function isInsideGrid(cell, grid) {
  return cell.col >= 0 && cell.col < grid.cols && cell.row >= 0 && cell.row < grid.rows;
}

export function isWalkable(cell, grid) {
  return isInsideGrid(cell, grid) && grid.walkable[cell.row][cell.col];
}

export function findNearestWalkable(cell, grid, maxRadius = 8) {
  if (isWalkable(cell, grid)) {
    return cell;
  }

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let row = cell.row - radius; row <= cell.row + radius; row += 1) {
      for (let col = cell.col - radius; col <= cell.col + radius; col += 1) {
        const candidate = { row, col };
        const onEdge =
          row === cell.row - radius ||
          row === cell.row + radius ||
          col === cell.col - radius ||
          col === cell.col + radius;
        if (onEdge && isWalkable(candidate, grid)) {
          return candidate;
        }
      }
    }
  }

  return null;
}

export function cellKey(cell) {
  return `${cell.col},${cell.row}`;
}

export function heuristic(from, to) {
  return Math.abs(from.col - to.col) + Math.abs(from.row - to.row);
}

export function findPath(start, goal, grid) {
  const open = [start];
  const openKeys = new Set([cellKey(start)]);
  const cameFrom = new Map();
  const gScore = new Map([[cellKey(start), 0]]);
  const fScore = new Map([[cellKey(start), heuristic(start, goal)]]);
  const neighbors = [
    { col: 1, row: 0 },
    { col: -1, row: 0 },
    { col: 0, row: 1 },
    { col: 0, row: -1 },
  ];

  while (open.length > 0) {
    let currentIndex = 0;
    let current = open[0];

    for (let i = 1; i < open.length; i += 1) {
      const candidate = open[i];
      if ((fScore.get(cellKey(candidate)) ?? Infinity) < (fScore.get(cellKey(current)) ?? Infinity)) {
        current = candidate;
        currentIndex = i;
      }
    }

    if (current.col === goal.col && current.row === goal.row) {
      const path = [current];
      let currentKey = cellKey(current);

      while (cameFrom.has(currentKey)) {
        const previous = cameFrom.get(currentKey);
        path.unshift(previous);
        currentKey = cellKey(previous);
      }

      return path;
    }

    open.splice(currentIndex, 1);
    openKeys.delete(cellKey(current));

    neighbors.forEach((offset) => {
      const neighbor = { col: current.col + offset.col, row: current.row + offset.row };
      if (!isWalkable(neighbor, grid)) return;

      const currentKey = cellKey(current);
      const neighborKey = cellKey(neighbor);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentativeG >= (gScore.get(neighborKey) ?? Infinity)) return;

      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeG);
      fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));

      if (!openKeys.has(neighborKey)) {
        open.push(neighbor);
        openKeys.add(neighborKey);
      }
    });
  }

  return [];
}

export function cellToWorld(cell, grid) {
  return new THREE.Vector3(
    grid.originX + cell.col * grid.cellSize,
    grid.heights[cell.row][cell.col] + 0.05,
    grid.originZ + cell.row * grid.cellSize,
  );
}

export function isStraightWalkable(from, to, grid) {
  const fromCell = findNearestWalkable(worldToCell(from.x, from.z, grid), grid);
  const toCell = findNearestWalkable(worldToCell(to.x, to.z, grid), grid);
  if (!fromCell || !toCell) return false;
  if (fromCell.col !== toCell.col && fromCell.row !== toCell.row) return false;

  if (fromCell.col === toCell.col) {
    const startRow = Math.min(fromCell.row, toCell.row);
    const endRow = Math.max(fromCell.row, toCell.row);
    for (let row = startRow; row <= endRow; row += 1) {
      if (!grid.walkable[row][fromCell.col]) return false;
    }
    return true;
  }

  const startCol = Math.min(fromCell.col, toCell.col);
  const endCol = Math.max(fromCell.col, toCell.col);
  for (let col = startCol; col <= endCol; col += 1) {
    if (!grid.walkable[fromCell.row][col]) return false;
  }
  return true;
}

export function simplifyOrthogonalPoints(points, grid) {
  if (points.length < 4) return points;

  const simplified = points.map((point) => point.clone());
  const minDoglegLength = grid.cellSize * 2.2;
  let changed = true;

  while (changed) {
    changed = false;

    for (let i = 0; i <= simplified.length - 4; i += 1) {
      const a = simplified[i];
      const b = simplified[i + 1];
      const c = simplified[i + 2];
      const d = simplified[i + 3];

      const abHorizontal = Math.abs(a.z - b.z) < 0.001;
      const bcHorizontal = Math.abs(b.z - c.z) < 0.001;
      const cdHorizontal = Math.abs(c.z - d.z) < 0.001;

      if (abHorizontal === bcHorizontal || bcHorizontal === cdHorizontal || abHorizontal !== cdHorizontal) {
        continue;
      }

      if (b.distanceTo(c) > minDoglegLength) {
        continue;
      }

      const candidateA = new THREE.Vector3(d.x, Math.max(a.y, d.y), a.z);
      const candidateB = new THREE.Vector3(a.x, Math.max(a.y, d.y), d.z);
      const replacement = [candidateA, candidateB].find(
        (candidate) =>
          isStraightWalkable(a, candidate, grid) &&
          isStraightWalkable(candidate, d, grid),
      );

      if (!replacement) continue;
      simplified.splice(i + 1, 2, replacement);
      changed = true;
      break;
    }
  }

  return simplified;
}

export function compressPath(path, grid) {
  if (path.length === 0) return [];
  if (path.length === 1) return [cellToWorld(path[0], grid)];

  const points = [cellToWorld(path[0], grid)];
  let previousDirection = null;

  for (let i = 1; i < path.length; i += 1) {
    const direction = {
      col: path[i].col - path[i - 1].col,
      row: path[i].row - path[i - 1].row,
    };

    if (
      previousDirection &&
      (direction.col !== previousDirection.col || direction.row !== previousDirection.row)
    ) {
      points.push(cellToWorld(path[i - 1], grid));
    }

    previousDirection = direction;
  }

  points.push(cellToWorld(path[path.length - 1], grid));
  return simplifyOrthogonalPoints(points, grid);
}

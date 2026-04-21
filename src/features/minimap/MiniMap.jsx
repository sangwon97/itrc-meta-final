import React, { useEffect, useRef } from 'react';
import { drawMiniMapFrame } from './utils.js';

const MINIMAP_BOUNDS = {
  minX: -24.299,
  maxX: 17.1636,
  minZ: -31.7873,
  maxZ: 32.0701,
};

function createEmptyBounds() {
  return {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
  };
}

function includePointInBounds(bounds, x, z) {
  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minZ = Math.min(bounds.minZ, z);
  bounds.maxZ = Math.max(bounds.maxZ, z);
}

function extractMiniMapLayer(rootObject, THREE) {
  if (!rootObject || !THREE) return null;

  const triangles = [];
  const bounds = createEmptyBounds();
  const worldVertex = new THREE.Vector3();

  rootObject.updateMatrixWorld(true);

  rootObject.traverse((node) => {
    if (!node.isMesh) return;

    const geometry = node.geometry;
    const positionAttribute = geometry?.attributes?.position;
    if (!positionAttribute) return;

    const readVertex = (vertexIndex) => {
      worldVertex.fromBufferAttribute(positionAttribute, vertexIndex);
      worldVertex.applyMatrix4(node.matrixWorld);

      const point = { x: worldVertex.x, z: worldVertex.z };
      includePointInBounds(bounds, point.x, point.z);
      return point;
    };

    if (geometry.index) {
      for (let index = 0; index < geometry.index.count; index += 3) {
        triangles.push([
          readVertex(geometry.index.array[index]),
          readVertex(geometry.index.array[index + 1]),
          readVertex(geometry.index.array[index + 2]),
        ]);
      }
      return;
    }

    for (let index = 0; index < positionAttribute.count; index += 3) {
      triangles.push([
        readVertex(index),
        readVertex(index + 1),
        readVertex(index + 2),
      ]);
    }
  });

  if (!triangles.length || !Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) {
    return null;
  }

  return { triangles, bounds };
}

// 미니맵 표시
export default function MiniMap({ route, searchMarkers }) {
  const canvasRef = useRef(null);
  const backgroundImageRef = useRef(null);
  const navMeshLayerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const THREE = window.THREE;
    if (!canvas || !ctx || !THREE) return undefined;

    let frameId = 0;
    let disposed = false;

    // 플레이어 위치와 시야각의 매 프레임 재렌더링
    const draw = () => {
      if (disposed) return;

      if (!navMeshLayerRef.current) {
        const navMeshObject = document.getElementById('navmesh-movable')?.object3D;
        const extractedLayer = extractMiniMapLayer(navMeshObject, THREE);
        if (extractedLayer) {
          navMeshLayerRef.current = extractedLayer;
        }
      }

      const rig = document.getElementById('rig')?.object3D;
      const camera = document.getElementById('player-camera')?.object3D;
      let heading = null;

      if (camera) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() > 1e-6) {
          forward.normalize();
          heading = Math.atan2(-forward.z, forward.x);
        }
      }

      drawMiniMapFrame(ctx, {
        canvas,
        bounds: navMeshLayerRef.current?.bounds || MINIMAP_BOUNDS,
        navMeshLayer: navMeshLayerRef.current,
        playerPosition: rig?.position || null,
        heading,
        route,
        searchMarkers,
        backgroundImage: backgroundImageRef.current,
      });

      frameId = window.requestAnimationFrame(draw);
    };

    if (!backgroundImageRef.current) {
      const minimapImage = new Image();
      minimapImage.src = 'imgs/minimap.png';
      backgroundImageRef.current = minimapImage;
    }

    draw();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [route, searchMarkers]);

  return (
    <div id="utility-tab-content" className="mini-map-content">
      <canvas ref={canvasRef} width="240" height="320" />
    </div>
  );
}

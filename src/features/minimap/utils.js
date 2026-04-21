// 미니맵 계산 유틸
function getMiniMapViewport(bounds, canvasWidth, canvasHeight, padding) {
  const width = bounds.maxX - bounds.minX || 1;
  const height = bounds.maxZ - bounds.minZ || 1;
  const scale = Math.min(
    (canvasWidth - padding * 2) / width,
    (canvasHeight - padding * 2) / height,
  );
  const offsetX = (canvasWidth - width * scale) * 0.5;
  const offsetY = (canvasHeight - height * scale) * 0.5;

  return {
    width,
    height,
    scale,
    offsetX,
    offsetY,
  };
}

function projectWithViewport(x, z, bounds, canvasHeight, viewport) {
  return {
    x: viewport.offsetX + (bounds.maxX - x) * viewport.scale,
    y: canvasHeight - (viewport.offsetY + (z - bounds.minZ) * viewport.scale),
  };
}

function drawNavMeshLayer(ctx, navMeshLayer, bounds, canvasHeight, viewport) {
  if (!navMeshLayer?.triangles?.length) return;

  ctx.save();
  ctx.beginPath();

  navMeshLayer.triangles.forEach((triangle) => {
    const firstPoint = projectWithViewport(
      triangle[0].x,
      triangle[0].z,
      bounds,
      canvasHeight,
      viewport,
    );
    const secondPoint = projectWithViewport(
      triangle[1].x,
      triangle[1].z,
      bounds,
      canvasHeight,
      viewport,
    );
    const thirdPoint = projectWithViewport(
      triangle[2].x,
      triangle[2].z,
      bounds,
      canvasHeight,
      viewport,
    );

    ctx.moveTo(firstPoint.x, firstPoint.y);
    ctx.lineTo(secondPoint.x, secondPoint.y);
    ctx.lineTo(thirdPoint.x, thirdPoint.y);
    ctx.closePath();
  });

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 255, 248, 0.36)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  ctx.restore();
}

export function projectMiniMapPoint(x, z, bounds, canvasWidth, canvasHeight, padding) {
  const viewport = getMiniMapViewport(bounds, canvasWidth, canvasHeight, padding);

  return projectWithViewport(x, z, bounds, canvasHeight, viewport);
}

export function drawMiniMapFrame(ctx, options) {
  const {
    canvas,
    bounds,
    navMeshLayer = null,
    playerPosition,
    heading,
    route,
    searchMarkers = [],
    backgroundImage = null,
  } = options;
  const padding = 18
  ;
  const viewport = getMiniMapViewport(bounds, canvas.width, canvas.height, padding);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!(backgroundImage?.complete && backgroundImage.naturalWidth > 0)) {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(22, 34, 61, 0.94)');
    gradient.addColorStop(1, 'rgba(10, 18, 34, 0.9)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawNavMeshLayer(ctx, navMeshLayer, bounds, canvas.height, viewport);

  if (backgroundImage?.complete && backgroundImage.naturalWidth > 0) {
    const drawWidth = viewport.width * viewport.scale;
    const drawHeight = viewport.height * viewport.scale;
    ctx.save();
    ctx.globalAlpha = navMeshLayer ? 0.9 : 0.8;
    ctx.drawImage(
      backgroundImage,
      viewport.offsetX + drawWidth,
      viewport.offsetY,
      -drawWidth,
      drawHeight,
    );
    ctx.restore();
  }

  searchMarkers.forEach((marker) => {
    const point = projectMiniMapPoint(
      marker.x,
      marker.z,
      bounds,
      canvas.width,
      canvas.height,
      padding,
    );

    ctx.beginPath();
    ctx.fillStyle = 'rgba(0, 42, 255, 0.95)';
    ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(67, 152, 192, 0.92)';
    ctx.lineWidth = 1.5;
    ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
    ctx.stroke();
  });

  if (route?.active && Array.isArray(route.points) && route.points.length > 1) {
    ctx.beginPath();
    route.points.forEach((point, index) => {
      const projected = projectMiniMapPoint(
        point.x,
        point.z,
        bounds,
        canvas.width,
        canvas.height,
        padding,
      );
      if (index === 0) {
        ctx.moveTo(projected.x, projected.y);
      } else {
        ctx.lineTo(projected.x, projected.y);
      }
    });
    ctx.strokeStyle = route.color || '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    route.targetPoints?.forEach((point) => {
      const projected = projectMiniMapPoint(
        point.x,
        point.z,
        bounds,
        canvas.width,
        canvas.height,
        padding,
      );

      ctx.beginPath();
      ctx.fillStyle = route.color || '#ffffff';
      ctx.arc(projected.x, projected.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  if (playerPosition) {
    const player = projectMiniMapPoint(
      playerPosition.x,
      playerPosition.z,
      bounds,
      canvas.width,
      canvas.height,
      padding,
    );

    ctx.beginPath();
    ctx.fillStyle = '#ff4d6d';
    ctx.arc(player.x, player.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#ff4d6e89';
    ctx.lineWidth = 2;
    ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
    ctx.stroke();

    if (Number.isFinite(heading)) {
      const radius = 45;
      const spread = 1.5;
      const startAngle = -heading - spread * 0.5;
      const endAngle = -heading + spread * 0.5;

      const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, radius);
      glow.addColorStop(0, 'rgba(255, 77, 109, 0.56)');
      glow.addColorStop(0.2, 'rgba(255, 110, 138, 0.42)');
      glow.addColorStop(0.5, 'rgba(255, 148, 166, 0.26)');
      glow.addColorStop(0.76, 'rgba(255, 148, 166, 0.14)');
      glow.addColorStop(1, 'rgba(255, 148, 166, 0)');

      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = glow;
      ctx.fill();

      const innerGlow = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, radius * 0.62);
      innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      innerGlow.addColorStop(0.35, 'rgba(255, 110, 138, 0.18)');
      innerGlow.addColorStop(1, 'rgba(255, 148, 166, 0)');

      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.arc(player.x, player.y, radius * 0.62, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = innerGlow;
      ctx.fill();
    }
  }
}

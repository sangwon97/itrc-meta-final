const tvBlockerMeshes = new Set();

export function registerTvBlockerMesh(mesh) {
  if (!mesh) return;
  mesh.userData.tvBodyBlocker = true;
  tvBlockerMeshes.add(mesh);
}

export function getTvBlockerMeshes() {
  return Array.from(tvBlockerMeshes).filter((mesh) => mesh?.parent);
}

// TV 스크린 클릭 대상 레지스트리
const tvMeshes = new Set();

export function registerTvMesh(mesh, tvInfo) {
  if (!mesh) return;
  mesh.userData.tvInfo = tvInfo;
  tvMeshes.add(mesh);
}

export function unregisterTvMesh(mesh) {
  if (!mesh) return;
  tvMeshes.delete(mesh);
}

export function getTvMeshes() {
  return Array.from(tvMeshes).filter((mesh) => mesh?.parent);
}

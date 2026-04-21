// 포스터 클릭 대상 레지스트리
const posterMeshes = new Set();

export function registerPosterMesh(mesh, posterInfo) {
  if (!mesh) return;
  mesh.userData.posterInfo = posterInfo;
  posterMeshes.add(mesh);
}

export function unregisterPosterMesh(mesh) {
  if (!mesh) return;
  posterMeshes.delete(mesh);
}

// 부모 분리 메쉬 제외 후 현재 클릭 가능 포스터 반환
export function getPosterMeshes() {
  return Array.from(posterMeshes).filter((mesh) => mesh?.parent);
}

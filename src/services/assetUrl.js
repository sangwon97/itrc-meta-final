// 정적 자산(models, videos, npc, 기타 바이너리) URL 을 CDN base 로 해석.
// VITE_CDN_URL 이 빈 값이면 상대 경로 그대로 반환 — 로컬 dev 서버는 파일을 직접 서빙.
// 절대 URL (http/https) 은 그대로 통과.

const CDN_BASE = (import.meta.env?.VITE_CDN_URL || '').replace(/\/+$/, '');

export function cdnAsset(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  const normalized = path.replace(/^\/+/, '');
  return CDN_BASE ? `${CDN_BASE}/${normalized}` : normalized;
}

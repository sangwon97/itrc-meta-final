/**
 * ITRC 백엔드 API 클라이언트
 * 앱 초기화 시 전체 데이터를 fetch하여 캐시에 저장합니다.
 */

import { cdnAsset } from './assetUrl.js';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:1337';

// ─── 캐시 ──────────────────────────────────────────────────────────────────

/** imagePath → { title, description } */
const posterInfoCache = new Map();
/** modelPath → imagePath */
const categoryMapCache = new Map();
/** boothId → { x, z } (NPC anchor for 3D placement) */
const npcAnchorCache = new Map();
/** boothId → boothName */
const boothNameCache = new Map();
/** 백엔드에 등록된 NPC boothId 집합 */
const npcBoothIdSet = new Set();
/** tvId → { youtubeId, thumbnailSrc } */
const tvCache = new Map();

let _ready = null;

// ─── 내부 fetch 헬퍼 ────────────────────────────────────────────────────────

const STRAPI_PAGE_SIZE = 100;

function normalizeMediaUrl(rawPath) {
  if (!rawPath) return '';

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  let normalizedPath = String(rawPath).trim().replace(/\\/g, '/');
  normalizedPath = normalizedPath.replace(/^\.\/+/, '');
  normalizedPath = normalizedPath.replace(/^public\//, '');

  if (!normalizedPath.startsWith('/')) {
    normalizedPath = `/${normalizedPath}`;
  }

  if (normalizedPath.startsWith('/uploads/')) {
    return new URL(normalizedPath, BASE_URL).toString();
  }

  return normalizedPath;
}

async function fetchAll(endpoint, params = '') {
  const items = [];
  let start = 0;
  let total = Infinity;

  while (start < total) {
    const url = `${BASE_URL}/api/${endpoint}?pagination[start]=${start}&pagination[limit]=${STRAPI_PAGE_SIZE}${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error ${res.status}: ${url}`);

    const json = await res.json();
    const pageItems = json.data ?? [];
    items.push(...pageItems);

    const nextTotal = json.meta?.pagination?.total;
    if (typeof nextTotal === 'number') {
      total = nextTotal;
    }

    if (pageItems.length === 0 || pageItems.length < STRAPI_PAGE_SIZE) {
      break;
    }

    start += pageItems.length;
  }

  return items;
}

// ─── 초기화 ─────────────────────────────────────────────────────────────────

/**
 * 앱 시작 시 한 번 호출. 백엔드에서 포스터·부스 데이터를 받아 캐시를 채웁니다.
 * 이미 호출된 경우 같은 Promise를 반환합니다.
 */
export function initApiCache() {
  if (_ready) return _ready;

  _ready = (async () => {
    const [postersResult, boothsResult, tvsResult, npcsResult] = await Promise.allSettled([
      fetchAll('posters', '&fields[0]=imagePath&fields[1]=modelPath&fields[2]=title&fields[3]=description&fields[4]=forumLink'),
      fetchAll('booths', '&fields[0]=boothId&fields[1]=boothName&fields[2]=npcPosX&fields[3]=npcPosZ'),
      fetchAll('tvs', '&fields[0]=tvId&fields[1]=youtubeId&fields[2]=thumbnailSrc'),
      fetchAll('npcs', '&fields[0]=boothId'),
    ]);

    const posters = postersResult.status === 'fulfilled' ? postersResult.value : (console.warn('[api] posters fetch failed:', postersResult.reason), []);
    const booths = boothsResult.status === 'fulfilled' ? boothsResult.value : (console.warn('[api] booths fetch failed:', boothsResult.reason), []);
    const tvs = tvsResult.status === 'fulfilled' ? tvsResult.value : (console.warn('[api] tvs fetch failed:', tvsResult.reason), []);
    const npcs = npcsResult.status === 'fulfilled' ? npcsResult.value : (console.warn('[api] npcs fetch failed:', npcsResult.reason), []);

    for (const p of posters) {
      const rawPath = p.imagePath ?? '';
      const imageUrl = normalizeMediaUrl(rawPath);

      if (imageUrl && p.title) {
        posterInfoCache.set(imageUrl, {
          title: p.title,
          description: p.description ?? '',
          forumLink: p.forumLink ?? null,
        });
      }

      // modelPath가 없으면 imagePath 파일명(예: S1B1P1)에서 섹션을 추출해 GLB 경로 도출
      const filename = rawPath.split('/').pop()?.replace(/\.[^.]+$/, ''); // "S1B1P1"
      const sectionMatch = filename?.match(/^(S\d+)/);
      const derivedModelPath = sectionMatch
        ? cdnAsset(`models/Posters/${sectionMatch[1]}/${filename}.glb`)
        : null;
      // imagePath의 파일명 규칙이 신뢰 가능하면 그 값을 우선 사용한다.
      // 실제 백엔드 데이터에 modelPath 오입력이 있어도 올바른 GLB에 연결되도록 한다.
      const modelPath = derivedModelPath || (p.modelPath ? cdnAsset(p.modelPath) : null);

      if (modelPath && imageUrl) {
        categoryMapCache.set(modelPath, imageUrl);
      }
    }

    for (const b of booths) {
      if (b.boothId) {
        if (b.npcPosX != null && b.npcPosZ != null) {
          npcAnchorCache.set(b.boothId, { x: b.npcPosX, z: b.npcPosZ });
        }
        if (b.boothName) {
          boothNameCache.set(b.boothId, b.boothName);
        }
      }
    }

    for (const t of tvs) {
      if (t.tvId) {
        tvCache.set(t.tvId, {
          youtubeId: t.youtubeId ?? '',
          thumbnailSrc: normalizeMediaUrl(t.thumbnailSrc),
        });
      }
    }

    for (const n of npcs) {
      if (n.boothId) npcBoothIdSet.add(n.boothId);
    }
  })();

  return _ready;
}

// ─── 동기 캐시 접근자 (initApiCache() 완료 후 사용) ──────────────────────────

/** imagePath 기반 포스터 메타데이터 */
export function getPosterInfo(imagePath) {
  return posterInfoCache.get(imagePath) ?? null;
}

/** modelPath → imagePath 매핑 */
export function getCategoryMap() {
  return Object.fromEntries(categoryMapCache);
}

/** NPC anchor 좌표 (boothId → {x, z}) */
export function getNpcAnchor(boothId) {
  return npcAnchorCache.get(boothId) ?? null;
}

/** TV 콘텐츠 (tvId → { youtubeId, thumbnailSrc }) */
export function getTvInfo(tvId) {
  return tvCache.get(tvId) ?? null;
}

/** 백엔드에 등록된 NPC인지 여부 */
export function hasNpc(boothId) {
  return npcBoothIdSet.has(boothId);
}

/** 부스 이름 (boothId → boothName) */
export function getBoothName(boothId) {
  return boothNameCache.get(boothId) ?? boothId;
}

// ─── 비동기 개별 요청 (React 컴포넌트용) ────────────────────────────────────

/** 부스 목록 (검색·이동용) */
export async function fetchBooths() {
  return fetchAll('booths');
}

/** 특정 부스의 NPC 데이터 */
export async function fetchNpc(boothId) {
  const data = await fetchAll(`npcs`, `&filters[boothId][$eq]=${encodeURIComponent(boothId)}`);
  return data[0] ?? null;
}

/** TV 목록 */
export async function fetchTvs() {
  return fetchAll('tvs');
}

import { registerOnce } from '../core.js';
import { initApiCache, getCategoryMap, getNpcAnchor } from '../../services/api.js';

// UV가 좌우반전된 채로 export된 GLB 모델의 부스 ID 목록
const FLIPPED_BOOTH_IDS = new Set(['S1B5', 'S1B6', 'S1B7', 'S3B5']);

registerOnce('category-manager', {
  async init() {
    await initApiCache();

    const categoryMap = getCategoryMap();

    Object.entries(categoryMap).forEach(([glbPath, imgPath]) => {
      const boothIdMatch = imgPath.match(/(S\d+B\d+)P\d+\.webp$/);
      const boothId = boothIdMatch?.[1] ?? null;
      const anchor = boothId ? getNpcAnchor(boothId) : null;
      const flipX = boothId ? FLIPPED_BOOTH_IDS.has(boothId) : false;
      const panelEntity = document.createElement('a-entity');
      panelEntity.setAttribute('position', '0 0 0');
      panelEntity.setAttribute(
        'distance-poster',
        `rig: #rig; model: ${glbPath}; texture: ${imgPath}; flipX: ${flipX}; anchorX: ${anchor?.x ?? 0}; anchorZ: ${anchor?.z ?? 0}; nearDistance: 8; checkInterval: 250`,
      );
      this.el.appendChild(panelEntity);
    });
  },
});

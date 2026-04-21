import React, { useEffect, useRef, useState } from 'react';
import { assetItems, boothRouteTargetMap, demoRouteOptions, tvItems, upperPanels, verticalPanels } from '../features/scene/sceneData.js';
import { initApiCache, fetchBooths, getTvInfo, hasNpc, getBoothName } from '../services/api.js';
import VideoViewer from '../features/videoViewer/VideoViewer.jsx';
import SplashScreen from '../features/entryGate/SplashScreen.jsx';
import WelcomeModal from '../features/entryGate/WelcomeModal.jsx';
import InfoPanel from '../features/infoPanel/InfoPanel.jsx';
import MiniMap from '../features/minimap/MiniMap.jsx';
import VirtualJoystick from '../features/mobileControls/VirtualJoystick.jsx';
import PosterModal from '../features/posterViewer/PosterModal.jsx';
import NpcModal from '../features/npcViewer/NpcModal.jsx';
import SearchPanel from '../features/search/SearchPanel.jsx';
import { matchesQuery } from '../features/search/chosung.js';
import { subscribeHintChanges } from '../aframe/utils/hintCoordinator.js';
import {
  DEFAULT_RIG_SPAWN,
  PLAYER_HEIGHT,
  getSpawnRigPos,
} from '../features/qrSpawn/spawnData.js';

const MOBILE_SCENE_QUERY = '(max-width: 900px), (pointer: coarse)';
const DESKTOP_RENDERER_ATTR =
  'colorManagement: true; antialias: true; maxCanvasWidth: 1920; maxCanvasHeight: 1920;';
const MOBILE_RENDERER_ATTR =
  'colorManagement: true; antialias: false; precision: mediump; maxCanvasWidth: 1280; maxCanvasHeight: 1280;';
const MOBILE_BASE_ASSET_IDS = new Set([
  'Walls',
  'floor',
  'carpet',
  'carpet-gray',
  'booths',
  'special-booth',
  'navmesh',
  'navmeshMovable',
]);
const MOBILE_NPC_ACTIVE_LIMIT = 4;

const boothNameGeneratorAttr = `
  csvUrl: BoothName_PosRot.csv;
  charLimit: 18;
  planeWidth: 3.4;
  planeHeight: 1.5;
  fontSizePx: 40
`;

function matchesMobileSceneProfile() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_SCENE_QUERY).matches;
}

function scheduleDeferredSceneTask(task) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(task, { timeout: 1200 });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(task, 450);
  return () => window.clearTimeout(timeoutId);
}

const DEFERRED_STATUS_PROGRESS_CAPS = {
  idle: 0,
  'loading-panels': 82,
  'loading-tv': 96,
  'loading-npc': 99,
  complete: 100,
};

const DEFERRED_STATUS_COPY = {
  idle: '전시장 자산을 준비하고 있습니다.',
  'loading-panels': '포스터와 전시 패널을 불러오고 있습니다.',
  'loading-tv': 'TV 화면과 썸네일을 불러오고 있습니다.',
  'loading-npc': '전시장 안내 오브젝트를 마무리하고 있습니다.',
  complete: '가상 전시 환경을 준비하고 있습니다.',
};

const DEFERRED_READY_TARGETS = [
  { selector: '[distance-poster]', eventName: 'poster-ready' },
  { selector: '[category-texture]', eventName: 'category-texture-ready' },
  { selector: '[tv-screen]', eventName: 'tv-screen-ready' },
];

const DEFERRED_CANDIDATE_SELECTOR = '[gltf-model], [distance-poster], [category-texture], [tv-screen]';

function waitForNextPaint(signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    let finished = false;
    const finalize = (value) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener?.('abort', handleAbort);
      resolve(value);
    };
    const handleAbort = () => finalize(false);

    signal?.addEventListener?.('abort', handleAbort, { once: true });
    window.requestAnimationFrame(() => finalize(!signal?.aborted));
  });
}

function getDeferredReadyTarget(element) {
  return DEFERRED_READY_TARGETS.find(({ selector }) => element.matches?.(selector)) ?? null;
}

function waitForDeferredRootReady(rootEl, { settleMs = 350, timeoutMs = 120000, signal } = {}) {
  return new Promise((resolve) => {
    if (!rootEl || signal?.aborted) {
      resolve(false);
      return;
    }

    let finished = false;
    let pending = 0;
    let observer = null;
    let timeoutId = null;
    let settleTimerId = null;
    const trackedModels = new WeakSet();
    const trackedReadyTargets = new WeakSet();
    const cleanupListeners = [];

    const cleanup = (result) => {
      if (finished) return;
      finished = true;
      observer?.disconnect?.();
      window.clearTimeout(timeoutId);
      window.clearTimeout(settleTimerId);
      cleanupListeners.forEach((dispose) => dispose());
      signal?.removeEventListener?.('abort', handleAbort);
      resolve(result);
    };

    const handleAbort = () => cleanup(false);

    const scheduleSettleCheck = () => {
      if (finished || pending > 0) return;
      window.clearTimeout(settleTimerId);
      settleTimerId = window.setTimeout(() => {
        if (pending === 0) {
          cleanup(true);
        }
      }, settleMs);
    };

    const trackReadyTarget = (element, eventName) => {
      if (trackedReadyTargets.has(element)) return;
      trackedReadyTargets.add(element);

      if (element.dataset.deferredReady === 'true') {
        scheduleSettleCheck();
        return;
      }

      pending += 1;
      let resolved = false;
      const markReady = () => {
        if (resolved) return;
        resolved = true;
        pending = Math.max(0, pending - 1);
        scheduleSettleCheck();
      };

      element.addEventListener(eventName, markReady, { once: true });
      cleanupListeners.push(() => element.removeEventListener(eventName, markReady));
    };

    const trackModelTarget = (element) => {
      if (trackedModels.has(element)) return;
      trackedModels.add(element);

      if (element.getObject3D?.('mesh')) {
        scheduleSettleCheck();
        return;
      }

      pending += 1;
      let resolved = false;
      const markReady = () => {
        if (resolved) return;
        resolved = true;
        pending = Math.max(0, pending - 1);
        scheduleSettleCheck();
      };

      element.addEventListener('model-loaded', markReady, { once: true });
      element.addEventListener('model-error', markReady, { once: true });
      cleanupListeners.push(() => {
        element.removeEventListener('model-loaded', markReady);
        element.removeEventListener('model-error', markReady);
      });
    };

    const scanNode = (node) => {
      if (!(node instanceof Element)) return;

      const candidates = [];
      if (node.matches?.(DEFERRED_CANDIDATE_SELECTOR)) {
        candidates.push(node);
      }
      node.querySelectorAll?.(DEFERRED_CANDIDATE_SELECTOR).forEach((element) => {
        candidates.push(element);
      });

      candidates.forEach((element) => {
        const readyTarget = getDeferredReadyTarget(element);
        if (readyTarget) {
          trackReadyTarget(element, readyTarget.eventName);
          return;
        }

        if (element.matches?.('[gltf-model]')) {
          trackModelTarget(element);
        }
      });

      scheduleSettleCheck();
    };

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          scanNode(node);
        });
      });
      scheduleSettleCheck();
    });

    signal?.addEventListener?.('abort', handleAbort, { once: true });
    observer.observe(rootEl, { childList: true, subtree: true });
    scanNode(rootEl);
    scheduleSettleCheck();

    timeoutId = window.setTimeout(() => cleanup(false), timeoutMs);
  });
}

const buildAssetMarkup = (items) => items
  .map(({ id, src }) => `<a-asset-item id="${id}" src="${src}"></a-asset-item>`)
  .join('');

const buildPanelMarkup = (items) => items
  .map(
    ({ model, texture }) => `
      <a-entity
        gltf-model="${model}"
        category-texture="src: ${texture}; rig: #rig; nearDistance: 12; checkInterval: 250"
        position="0 0 0">
      </a-entity>`,
  )
  .join('');


const buildBoothTvMarkup = (items, hintMode = 'bubble') => items
  .map(
    ({ boothId, x, y, z, rotY, imageSrc, youtubeId }) => `
      <a-entity
        gltf-model="#tv-booth"
        tv-body-blocker
        position="${x} ${y} ${z}"
        rotation="0 ${rotY} 0">
      </a-entity>
      <a-entity
        gltf-model="models/TVs/TV_New_Screen.glb"
        tv-screen="rig: #rig; boothId: ${boothId}; imageSrc: ${imageSrc}; youtubeId: ${youtubeId}; hintMode: ${hintMode}"
        position="${x} ${y} ${z}"
        rotation="0 ${rotY} 0">
      </a-entity>`,
  )
  .join('');

const buildDesktopNpcMarkup = (items) => items
  .map(({ id, x, z, rotY, boothName, modelSrc }) => `
    <a-entity
      proximity-npc="rig: #rig; src: ${modelSrc}; boothId: ${id}; npcName: ${boothName}; npcGreeting: 안녕하세요! 저는 ${boothName}의 안내원입니다. 궁금하신 점이 있으시면 언제든지 말씀해 주세요.; loadDistance: 18; unloadDistance: 24; checkInterval: 500"
      position="${x} 0 ${z}"
      scale="1.1 1.1 1.1"
      rotation="0 ${rotY} 0">
    </a-entity>`)
  .join('');

const buildMobileNpcMarkup = (items) => items
  .map(({ id, x, z, rotY, boothName, modelSrc }) => `
    <a-entity
      proximity-npc="rig: #rig; src: ${modelSrc}; boothId: ${id}; npcName: ${boothName}; npcGreeting: 안녕하세요! 저는 ${boothName}의 안내원입니다. 궁금하신 점이 있으시면 언제든지 말씀해 주세요.; hintMode: toast; loadDistance: 12; unloadDistance: 16; billboardDistance: 24; maxActive: ${MOBILE_NPC_ACTIVE_LIMIT}; checkInterval: 250; pauseOutsideViewport: true"
      position="${x} 0 ${z}"
      scale="1.05 1.05 1.05"
      rotation="0 ${rotY} 0">
    </a-entity>`)
  .join('');

const mobileBaseAssets = assetItems.filter(({ id }) => MOBILE_BASE_ASSET_IDS.has(id));
const mobileDeferredAssets = assetItems.filter(({ id }) => !MOBILE_BASE_ASSET_IDS.has(id));
function buildSharedSceneMarkup({ x, y, z }) {
  return `
    <a-entity booth-name-generator="${boothNameGeneratorAttr}"></a-entity>
    <a-entity poster-picker="camera: #player-camera; rig: #rig; maxDistance: 3"></a-entity>
    <a-entity npc-picker="camera: #player-camera; rig: #rig; maxDistance: 5"></a-entity>
    <a-entity tv-picker="camera: #player-camera; rig: #rig; maxDistance: 15"></a-entity>

    <a-entity id="walls-map" gltf-model="#Walls"></a-entity>
    <a-entity gltf-model="#floor"></a-entity>
    <a-entity gltf-model="#carpet"></a-entity>
    <a-entity gltf-model="#carpet-gray"></a-entity>
    <a-entity gltf-model="#booths"></a-entity>
    <a-entity gltf-model="#special-booth"></a-entity>
    <a-entity id="navmesh-whole" gltf-model="#navmesh" visible="false"></a-entity>
    <a-entity id="navmesh-movable" gltf-model="#navmeshMovable" visible="false"></a-entity>
    <a-entity
      id="route-visualizer"
      a-star-route="navmesh: #navmesh-movable; rig: #rig; active: false; color: #ffffff; targetsJson: []; viaJson: []; startPoint: ${x} 0 ${z}; lineWidth: 0.44">
    </a-entity>

    <a-entity
      id="rig"
      position="${x} ${y} ${z}"
      rotation="0 -90 0"
      camera-relative-wasd="camera: #player-camera; acceleration: 5.44; enabled: false"
      navmesh-follow="navmesh: #navmesh-whole; walls: #walls-map; height: 1.6">
      <a-entity
        id="player-camera"
        camera
        look-controls="magicWindowTrackingEnabled: false; touchEnabled: false"
        mobile-touch-look="enabled: true; reverseDrag: false"
        show-position>
      </a-entity>
    </a-entity>
`;
}

function buildDesktopSceneMarkup(rigPos) {
  return `
  <a-scene background="color: #4a4a5a" renderer="${DESKTOP_RENDERER_ATTR}" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
    <a-assets>
      ${buildAssetMarkup([...assetItems, ...tvItems])}
    </a-assets>

    ${buildSharedSceneMarkup(rigPos)}
  </a-scene>
`;
}

function buildMobileBaseSceneMarkup(rigPos) {
  return `
  <a-scene background="color: #4a4a5a" renderer="${MOBILE_RENDERER_ATTR}" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
    <a-assets>
      ${buildAssetMarkup(mobileBaseAssets)}
    </a-assets>

    ${buildSharedSceneMarkup(rigPos)}
  </a-scene>
`;
}

const mobilePanelAssetMarkup = buildAssetMarkup(mobileDeferredAssets);
const mobileTvAssetMarkup = buildAssetMarkup(tvItems);
const mobilePanelSceneMarkup = `
  <a-entity id="mobile-deferred-panels-root">
    <a-entity gltf-model="#ceiling"></a-entity>
    <a-entity gltf-model="#ceilingPanels"></a-entity>
    <a-entity gltf-model="#panel-special-1"></a-entity>
    <a-entity gltf-model="#panel-special-2"></a-entity>
    ${buildPanelMarkup(verticalPanels)}
    ${buildPanelMarkup(upperPanels)}
    <a-entity category-manager></a-entity>
  </a-entity>
`;
const buildMobileTvSceneMarkup = (items) => `
  <a-entity id="mobile-deferred-tv-root">
    ${buildBoothTvMarkup(items, 'toast')}
  </a-entity>
`;
const buildMobileNpcSceneMarkup = (items) => `
  <a-entity id="mobile-deferred-npc-root">
    ${buildMobileNpcMarkup(items)}
  </a-entity>
`;
const desktopDeferredPanelMarkup = `
  <a-entity id="desktop-deferred-panels-root">
    <a-entity gltf-model="#ceiling"></a-entity>
    <a-entity gltf-model="#ceilingPanels"></a-entity>
    <a-entity gltf-model="#panel-special-1"></a-entity>
    <a-entity gltf-model="#panel-special-2"></a-entity>
    ${buildPanelMarkup(verticalPanels)}
    ${buildPanelMarkup(upperPanels)}
    <a-entity category-manager></a-entity>
  </a-entity>
`;
const buildDesktopDeferredTvMarkup = (items) => `
  <a-entity id="desktop-deferred-tv-root">
    ${buildBoothTvMarkup(items, 'bubble')}
  </a-entity>
`;
const buildDesktopDeferredNpcMarkup = (items) => `
  <a-entity id="desktop-deferred-npc-root">
    ${buildDesktopNpcMarkup(items)}
  </a-entity>
`;
const ROUTE_GUIDE_DISTANCE = 2.2;

function getDistance2D(from, to) {
  return Math.hypot((to.x || 0) - (from.x || 0), (to.z || 0) - (from.z || 0));
}

function sortBoothsByNearestOrder(startPoint, booths) {
  const remainingBooths = [...booths];
  const orderedBooths = [];
  let currentPoint = startPoint;

  while (remainingBooths.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = getDistance2D(currentPoint, remainingBooths[0].target);

    for (let index = 1; index < remainingBooths.length; index += 1) {
      const candidateDistance = getDistance2D(currentPoint, remainingBooths[index].target);
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance;
        nearestIndex = index;
      }
    }

    const [nearestBooth] = remainingBooths.splice(nearestIndex, 1);
    orderedBooths.push(nearestBooth);
    currentPoint = nearestBooth.target;
  }

  return orderedBooths;
}

function focusSceneCanvas() {
  document.activeElement?.blur?.();
  window.requestAnimationFrame(() => {
    const canvas = document.querySelector('a-scene canvas');
    canvas?.focus?.();
    window.focus();
  });
}

function getCurrentRouteGuidePoint(startPoint) {
  const cameraObject = document.getElementById('player-camera')?.object3D;
  const rigObject = document.getElementById('rig')?.object3D;
  const THREE = window.THREE;

  if (cameraObject && THREE) {
    const forward = new THREE.Vector3();
    cameraObject.getWorldDirection(forward);
    forward.y = 0;

    if (forward.lengthSq() > 1e-6) {
      forward.normalize();
      forward.negate();
      return {
        x: startPoint.x + forward.x * ROUTE_GUIDE_DISTANCE,
        y: 0,
        z: startPoint.z + forward.z * ROUTE_GUIDE_DISTANCE,
      };
    }
  }

  if (rigObject) {
    const yaw = rigObject.rotation.y || 0;
    return {
      x: startPoint.x - Math.sin(yaw) * ROUTE_GUIDE_DISTANCE,
      y: 0,
      z: startPoint.z - Math.cos(yaw) * ROUTE_GUIDE_DISTANCE,
    };
  }

  return null;
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const expanded = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  if (!/^[\da-fA-F]{6}$/.test(expanded)) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const value = Number.parseInt(expanded, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// 상단 카테고리 동선 선택 패널 본문
function RoutePanelContent({ activePath, onTogglePath }) {
  const chipListRef = useRef(null);

  useEffect(() => {
    const activeChip = chipListRef.current?.querySelector('.route-chip.active');
    activeChip?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activePath]);

  return (
    <div id="utility-tab-content" className="route-content">
      <p className="route-guide-copy">카테고리를 선택하면 해당 전시관 중심의 추천 동선이 표시됩니다.</p>
      <div ref={chipListRef} className="route-chip-list">
        {demoRouteOptions.map(({ key, label, color }) => {
          const isActive = activePath === key;

          return (
            <button
              key={key}
              type="button"
              className={`route-chip ${key} ${isActive ? 'active' : ''}`}
              style={isActive ? {
                background: hexToRgba(color, 0.22),
                borderColor: hexToRgba(color, 0.55),
                color: '#f8fafc',
              } : undefined}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onTogglePath(key);
                focusSceneCanvas();
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const Scene = React.memo(function Scene({ markup }) {
  return <div className="scene-host" dangerouslySetInnerHTML={{ __html: markup }} />;
});

// 오늘 하루 팝업 숨김 여부 키
function getTodayDismissKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const date = `${today.getDate()}`.padStart(2, '0');
  return `itrc-welcome-dismissed-${year}-${month}-${date}`;
}

// CSV 텍스트의 행 단위 객체 변환
function parseCsvRows(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((header) => header.trim());

  return lines
    .map((line) => line.split(','))
    .filter((columns) => columns.length === headers.length)
    .map((columns) =>
      Object.fromEntries(headers.map((header, index) => [header, columns[index].trim()])),
    );
}

function resolveSpawnRigPos() {
  const params = new URLSearchParams(window.location.search);
  const spawnId = params.get('spawnId');
  const qx = params.get('x');
  const qz = params.get('z');

  const namedSpawnPos = spawnId ? getSpawnRigPos(spawnId) : null;
  if (namedSpawnPos) {
    return namedSpawnPos;
  }
  if (qx !== null && qz !== null) {
    return { x: Number(qx), y: PLAYER_HEIGHT, z: Number(qz) };
  }
  return null;
}

export default function App() {
  const [isMobileScene] = useState(() => matchesMobileSceneProfile());
  const [initialRigPos] = useState(() => resolveSpawnRigPos() ?? DEFAULT_RIG_SPAWN);
  // 'welcome' → 'loading' → 'ready'
  const [sceneStage, setSceneStage] = useState(() => {
    const hasSpawnParam = resolveSpawnRigPos() !== null;
    if (hasSpawnParam) return 'loading';
    if (!isMobileScene && window.localStorage.getItem(getTodayDismissKey())) return 'loading';
    return 'welcome';
  });
  const [deferredSceneStatus, setDeferredSceneStatus] = useState('idle');
  const [deferredSceneProgress, setDeferredSceneProgress] = useState(0);
  const [splashProgress, setSplashProgress] = useState(0);
  const [activePath, setActivePath] = useState(null);
  const [activeUtilityTab, setActiveUtilityTab] = useState('map');
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [activeInfoItemId, setActiveInfoItemId] = useState(null);
  const [selectedPoster, setSelectedPoster] = useState(null);
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [selectedTv, setSelectedTv] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(true);
  const [searchEntries, setSearchEntries] = useState([]);
  const [boothTvItems, setBoothTvItems] = useState([]);
  const [npcItems, setNpcItems] = useState([]);
  const [isInitialDataReady, setIsInitialDataReady] = useState(false);
  const [isSceneAssetsReady, setIsSceneAssetsReady] = useState(false);
  const [mobileHintToast, setMobileHintToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsSearchLoading(true);

    const loadInitialData = async () => {
      try {
        const [apiCacheResult, tvCsvResult, npcCsvResult, boothsResult, boothPosCsvResult] = await Promise.allSettled([
          initApiCache(),
          fetch('TV_Pos.csv').then((res) => res.text()),
          fetch('NPC_Pos.csv').then((res) => res.text()),
          fetchBooths(),
          fetch('BoothName_PosRot.csv').then((res) => res.text()),
        ]);

        if (cancelled) return;

        if (apiCacheResult.status === 'rejected') {
          console.warn('[초기 데이터] API 캐시 로드 실패:', apiCacheResult.reason);
        }

        if (tvCsvResult.status === 'fulfilled') {
          const rows = parseCsvRows(tvCsvResult.value);
          setBoothTvItems(
            rows.flatMap((row) => {
              const tvInfo = getTvInfo(row['Booth Number']);
              if (!tvInfo) return [];

              const parsedY = Number(row['Pos Y']);
              return [{
                boothId: row['Booth Number'],
                x: Number(row['Pos X']),
                y: Number.isFinite(parsedY) ? parsedY : 0,
                z: Number(row['Pos Z']),
                rotY: Number(row['Rotation Y (Degrees)']),
                imageSrc: tvInfo.thumbnailSrc ?? '',
                youtubeId: tvInfo.youtubeId ?? '',
              }];
            }),
          );
        } else {
          console.error('[TV 초기화] 로드 실패:', tvCsvResult.reason);
          setBoothTvItems([]);
        }

        const csvBoothNameMap = {};
        if (boothPosCsvResult.status === 'fulfilled') {
          parseCsvRows(boothPosCsvResult.value).forEach((row) => {
            if (row['Booth Number'] && row['Booth Name']) {
              csvBoothNameMap[row['Booth Number']] = row['Booth Name'];
            }
          });
        }

        const resolveBoothName = (boothId) => {
          const cached = getBoothName(boothId);
          return cached !== boothId ? cached : (csvBoothNameMap[boothId] ?? boothId);
        };

        if (npcCsvResult.status === 'fulfilled') {
          const rows = parseCsvRows(npcCsvResult.value);
          const filtered = rows
            .filter((row) => hasNpc(row['Booth Number']))
            .map((row) => ({
              id: row['Booth Number'],
              x: Number(row['Pos X']),
              z: Number(row['Pos Z']),
              rotY: Number(row['Rotation Y (Degrees)']),
              boothName: resolveBoothName(row['Booth Number']),
              modelSrc: 'npc/LowPolyNPC.glb',
            }));
          setNpcItems(filtered);
        } else {
          console.error('[NPC 초기화] 로드 실패:', npcCsvResult.reason);
          setNpcItems([]);
        }

        if (boothsResult.status === 'fulfilled') {
          const booths = boothsResult.value;

          const boothRows = booths.map((b) => ({
            boothId: b.boothId,
            boothName: b.boothName,
            univName: b.univName,
          }));

          setSearchEntries(boothRows);
        } else {
          console.error('Failed to load search data from API', boothsResult.reason);
          setSearchEntries([]);
        }

      } catch (error) {
        if (cancelled) return;
        console.error('[초기 데이터] 로드 실패:', error);
        setBoothTvItems([]);
        setNpcItems([]);
        setSearchEntries([]);
      } finally {
        if (cancelled) return;
        setIsSearchLoading(false);
        setIsInitialDataReady(true);
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  const [routeStartPoint, setRouteStartPoint] = useState(() => ({
    x: initialRigPos.x,
    y: 0,
    z: initialRigPos.z,
  }));
  const [routeViaPoints, setRouteViaPoints] = useState([]);
  const [miniMapRoute, setMiniMapRoute] = useState({
    active: false,
    points: [],
    targetPoints: [],
    color: '#ffffff',
  });
  const sceneMarkup = isMobileScene
    ? buildMobileBaseSceneMarkup(initialRigPos)
    : buildDesktopSceneMarkup(initialRigPos);
  const isDeferredSceneBlocking = sceneStage === 'ready' && deferredSceneStatus !== 'complete';
  const isSceneInteractive = sceneStage === 'ready' && deferredSceneStatus === 'complete';
  const deferredStatusCopy =
    DEFERRED_STATUS_COPY[deferredSceneStatus] ?? DEFERRED_STATUS_COPY.idle;

  useEffect(() => {
    if (!isMobileScene) {
      setMobileHintToast(null);
      return undefined;
    }

    const unsubscribe = subscribeHintChanges((activeHint) => {
      setMobileHintToast(activeHint?.text ?? null);
    });

    return () => {
      unsubscribe();
      setMobileHintToast(null);
    };
  }, [isMobileScene]);

  useEffect(() => {
    // 데스크톱: Ctrl+휠, Ctrl+키 줌 차단
    const blockWheelZoom = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    const blockKeyZoom = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', blockWheelZoom, { passive: false });
    window.addEventListener('keydown', blockKeyZoom);

    // iOS Safari: gesturestart/gesturechange 차단 (user-scalable=no 무시 대응)
    const blockGesture = (e) => e.preventDefault();
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });

    // iOS Safari: 포스터 모달 외부에서 두 손가락 터치 이동 차단
    const blockTwoFingerTouch = (e) => {
      if (e.touches.length > 1 && !e.target.closest('#poster-mobile-stage, .poster-modal-media')) {
        e.preventDefault();
      }
    };
    document.addEventListener('touchmove', blockTwoFingerTouch, { passive: false });

    return () => {
      window.removeEventListener('wheel', blockWheelZoom);
      window.removeEventListener('keydown', blockKeyZoom);
      document.removeEventListener('gesturestart', blockGesture);
      document.removeEventListener('gesturechange', blockGesture);
      document.removeEventListener('touchmove', blockTwoFingerTouch);
    };
  }, []);

  useEffect(() => {
    const rigEntity = document.getElementById('rig');
    if (!rigEntity) return;

    rigEntity.setAttribute('camera-relative-wasd', 'enabled', isSceneInteractive);

    if (isSceneInteractive) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.searchParams.delete('spawnId');
      cleanUrl.searchParams.delete('x');
      cleanUrl.searchParams.delete('z');
      window.history.replaceState({}, '', cleanUrl);
    }
  }, [isSceneInteractive, sceneStage]);

  useEffect(() => {
    // 선택 카테고리 또는 검색 결과 기준 A* 로드맵 데이터 갱신
    const routeEntity = document.getElementById('route-visualizer');
    if (!routeEntity) return;

    const selectedRoute = demoRouteOptions.find(({ key }) => key === activePath);

    if (selectedRoute) {
      routeEntity.setAttribute('a-star-route', 'active', true);
      routeEntity.setAttribute('a-star-route', 'color', selectedRoute.color);
      const orderedBooths = sortBoothsByNearestOrder(routeStartPoint, selectedRoute.booths);
      routeEntity.setAttribute(
        'a-star-route',
        'targetsJson',
        JSON.stringify(orderedBooths.map(({ target }) => target)),
      );
      routeEntity.setAttribute('a-star-route', 'viaJson', JSON.stringify(routeViaPoints));
      routeEntity.setAttribute(
        'a-star-route',
        'startPoint',
        `${routeStartPoint.x} ${routeStartPoint.y} ${routeStartPoint.z}`,
      );
    } else {
      routeEntity.setAttribute('a-star-route', 'active', false);
    }
  }, [activePath, routeStartPoint, routeViaPoints]);

  useEffect(() => {
    // 브라우저 전체화면 상태 동기화
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    // A-Frame 포스터 클릭 이벤트와 React 모달 상태 연결
    const handlePosterSelect = (event) => {
      setSelectedPoster(event.detail);
    };

    window.addEventListener('poster-select', handlePosterSelect);
    return () => window.removeEventListener('poster-select', handlePosterSelect);
  }, []);

  useEffect(() => {
    const handleNpcSelect = (event) => setSelectedNpc(event.detail);
    window.addEventListener('npc-select', handleNpcSelect);
    return () => window.removeEventListener('npc-select', handleNpcSelect);
  }, []);

  useEffect(() => {
    const handleTvSelect = (event) => setSelectedTv(event.detail);
    window.addEventListener('tv-select', handleTvSelect);
    return () => window.removeEventListener('tv-select', handleTvSelect);
  }, []);

  useEffect(() => {
    // 로드맵 경로와 미니맵 상태 연결
    const handleRouteUpdated = (event) => {
      setMiniMapRoute({
        active: Boolean(event.detail?.active),
        points: Array.isArray(event.detail?.points) ? event.detail.points : [],
        targetPoints: Array.isArray(event.detail?.targetPoints) ? event.detail.targetPoints : [],
        color: event.detail?.color || '#ffffff',
      });
    };

    window.addEventListener('route-updated', handleRouteUpdated);
    return () => window.removeEventListener('route-updated', handleRouteUpdated);
  }, []);

  useEffect(() => {
    // loading 단계: 진행 바 시뮬레이션 + 모든 GLB model-loaded 감지
    if (sceneStage !== 'loading') {
      setIsSceneAssetsReady(false);
      return;
    }

    let progressValue = 0;
    let finished = false;
    setSplashProgress(0);
    setIsSceneAssetsReady(false);

    const markSceneAssetsReady = () => {
      if (finished) return;
      finished = true;
      setIsSceneAssetsReady(true);
    };

    const progressTimer = isMobileScene
      ? null
      : window.setInterval(() => {
          progressValue = Math.min(progressValue + (progressValue < 72 ? 6 : 3), 94);
          setSplashProgress((current) => Math.max(current, progressValue));
        }, 90);

    const fallbackTimer = window.setTimeout(markSceneAssetsReady, 30000);

    const attachSceneListener = () => {
      const scene = document.querySelector('a-scene');
      if (!scene) return false;

      const onSceneLoaded = () => {
        let pending = 0;
        let renderStarted = false;
        const trackedEls = new Set();

        const tryFinish = () => {
          if (pending > 0 || !renderStarted) return;
          requestAnimationFrame(() => requestAnimationFrame(() => markSceneAssetsReady()));
        };

        const trackEntity = (el) => {
          if (trackedEls.has(el)) return;
          trackedEls.add(el);
          if (el.getObject3D('mesh')) return; // 이미 로드 완료
          pending++;
          const onDone = () => { pending--; tryFinish(); };
          el.addEventListener('model-loaded', onDone, { once: true });
          el.addEventListener('model-error', onDone, { once: true });
        };

        // 정적 gltf-model 엔티티 추적
        Array.from(document.querySelectorAll('[gltf-model]')).forEach(trackEntity);

        // renderstart 후 tvScreenManager 등이 동적 생성한 엔티티도 추적
        scene.addEventListener('renderstart', () => {
          renderStarted = true;
          window.setTimeout(() => {
            Array.from(document.querySelectorAll('[gltf-model]')).forEach(trackEntity);
            tryFinish();
          }, 100);
        }, { once: true });
      };

      if (scene.hasLoaded) {
        onSceneLoaded();
      } else {
        scene.addEventListener('loaded', onSceneLoaded, { once: true });
      }
      return true;
    };

    if (!attachSceneListener()) {
      const pollTimer = window.setInterval(() => {
        if (attachSceneListener()) window.clearInterval(pollTimer);
      }, 100);
      return () => {
        if (progressTimer) window.clearInterval(progressTimer);
        window.clearTimeout(fallbackTimer);
        window.clearInterval(pollTimer);
      };
    }

    return () => {
      if (progressTimer) window.clearInterval(progressTimer);
      window.clearTimeout(fallbackTimer);
    };
  }, [isMobileScene, sceneStage]);

  useEffect(() => {
    if (sceneStage !== 'loading' || !isInitialDataReady || !isSceneAssetsReady) return;
    setSplashProgress(100);
  }, [isInitialDataReady, isSceneAssetsReady, sceneStage]);

  useEffect(() => {
    if (
      sceneStage !== 'loading'
      || !isInitialDataReady
      || !isSceneAssetsReady
      || splashProgress < 100
    ) {
      return;
    }

    const readyTimer = window.setTimeout(() => setSceneStage('ready'), 300);

    return () => window.clearTimeout(readyTimer);
  }, [isInitialDataReady, isSceneAssetsReady, sceneStage, splashProgress]);

  useEffect(() => {
    if (sceneStage !== 'ready') {
      setDeferredSceneStatus('idle');
      setDeferredSceneProgress(0);
      return;
    }

    if (deferredSceneStatus === 'complete') {
      setDeferredSceneProgress(100);
      return;
    }

    const progressCap = DEFERRED_STATUS_PROGRESS_CAPS[deferredSceneStatus] ?? 0;
    const progressTimer = window.setInterval(() => {
      setDeferredSceneProgress((current) => {
        if (current >= progressCap) return current;
        const step = current < progressCap - 18 ? 3 : 1;
        return Math.min(progressCap, current + step);
      });
    }, 90);

    return () => window.clearInterval(progressTimer);
  }, [deferredSceneStatus, sceneStage]);

  useEffect(() => {
    if (sceneStage !== 'ready') return;

    const scene = document.querySelector('a-scene');
    const assets = scene?.querySelector('a-assets');
    if (!scene || !assets) return;

    const panelRootId = isMobileScene ? 'mobile-deferred-panels-root' : 'desktop-deferred-panels-root';
    if (scene.querySelector(`#${panelRootId}`)) {
      setDeferredSceneStatus('complete');
      setDeferredSceneProgress(100);
      return;
    }

    const abortController = new AbortController();
    const stageDefinitions = [];

    if (isMobileScene) {
      stageDefinitions.push({
        rootId: 'mobile-deferred-panels-root',
        status: 'loading-panels',
        assetMarkup: mobilePanelAssetMarkup,
        markup: mobilePanelSceneMarkup,
        waitForReady: true,
      });

      if (boothTvItems.length > 0) {
        stageDefinitions.push({
          rootId: 'mobile-deferred-tv-root',
          status: 'loading-tv',
          assetMarkup: mobileTvAssetMarkup,
          markup: buildMobileTvSceneMarkup(boothTvItems),
          waitForReady: true,
        });
      }

      if (npcItems.length > 0) {
        stageDefinitions.push({
          rootId: 'mobile-deferred-npc-root',
          status: 'loading-npc',
          assetMarkup: '',
          markup: buildMobileNpcSceneMarkup(npcItems),
          waitForReady: false,
        });
      }
    } else {
      stageDefinitions.push({
        rootId: 'desktop-deferred-panels-root',
        status: 'loading-panels',
        assetMarkup: '',
        markup: desktopDeferredPanelMarkup,
        waitForReady: true,
      });

      if (boothTvItems.length > 0) {
        stageDefinitions.push({
          rootId: 'desktop-deferred-tv-root',
          status: 'loading-tv',
          assetMarkup: '',
          markup: buildDesktopDeferredTvMarkup(boothTvItems),
          waitForReady: true,
        });
      }

      if (npcItems.length > 0) {
        stageDefinitions.push({
          rootId: 'desktop-deferred-npc-root',
          status: 'loading-npc',
          assetMarkup: '',
          markup: buildDesktopDeferredNpcMarkup(npcItems),
          waitForReady: false,
        });
      }
    }

    const runStages = async () => {
      for (const stage of stageDefinitions) {
        if (abortController.signal.aborted) return;

        setDeferredSceneStatus(stage.status);

        if (stage.assetMarkup) {
          assets.insertAdjacentHTML('beforeend', stage.assetMarkup);
        }

        const didPaint = await waitForNextPaint(abortController.signal);
        if (!didPaint) return;

        if (!scene.querySelector(`#${stage.rootId}`)) {
          scene.insertAdjacentHTML('beforeend', stage.markup);
        }

        const root = scene.querySelector(`#${stage.rootId}`);
        if (stage.waitForReady !== false) {
          await waitForDeferredRootReady(root, { signal: abortController.signal });
          if (abortController.signal.aborted) return;
        }

        const didSettle = await waitForNextPaint(abortController.signal);
        if (!didSettle) return;
      }

      if (!abortController.signal.aborted) {
        setDeferredSceneStatus('complete');
        setDeferredSceneProgress(100);
      }
    };

    const cancelDeferredTask = scheduleDeferredSceneTask(() => {
      runStages().catch((error) => {
        if (abortController.signal.aborted) return;
        console.error('[deferred-scene] 로드 실패:', error);
        setDeferredSceneStatus('complete');
        setDeferredSceneProgress(100);
      });
    });

    return () => {
      abortController.abort();
      cancelDeferredTask();
    };
  }, [isMobileScene, sceneStage, boothTvItems, npcItems]);

  const handleToggle = (key) => {
    const rigPosition = document.getElementById('rig')?.object3D?.position;

    setActivePath((current) => {
      const nextPath = current === key ? null : key;

      if (nextPath && rigPosition) {
        const nextStartPoint = {
          x: rigPosition.x,
          y: 0,
          z: rigPosition.z,
        };
        setRouteStartPoint(nextStartPoint);
        setRouteViaPoints([getCurrentRouteGuidePoint(nextStartPoint)].filter(Boolean));
      } else {
        setRouteViaPoints([]);
      }

      return nextPath;
    });
  };

  // 페이지 전체화면 전환과 React 오버레이 유지
  const handleFullscreenToggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
      focusSceneCanvas();
    } catch (error) {
      console.error('Failed to toggle fullscreen', error);
    }
  };

  const handleToggleInfoPanel = () => {
    setIsInfoPanelOpen((current) => {
      const next = !current;

      if (next) {
        setActiveUtilityTab(null);
      }

      return next;
    });
  };

  // 사이드 메뉴 상세 콘텐츠 열기
  const handleOpenInfoItem = (itemId) => {
    setActiveUtilityTab(null);
    setActiveInfoItemId(itemId);
  };

  // 사이드 메뉴 상세 콘텐츠 닫기
  const handleCloseInfoModal = () => {
    setActiveInfoItemId(null);
  };

  // 입장하기 → 로딩 단계 전환
  const handleEnterExhibition = () => {
    setSceneStage('loading');
  };

  // 오늘 하루 숨김 + 바로 로딩 단계 전환
  const handleDismissWelcomeToday = () => {
    window.localStorage.setItem(getTodayDismissKey(), 'true');
    setSceneStage('loading');
  };

  // 검색 결과 기준 rig 텔레포트
  const handleSelectSearchResult = (result) => {
    const destination = boothRouteTargetMap[result.boothId];
    const rig = document.getElementById('rig')?.object3D;
    if (!destination || !rig) return;

    rig.position.set(destination.x, rig.position.y, destination.z);
    setSearchQuery('');
    focusSceneCanvas();
  };

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredSearchResults = normalizedSearchQuery
    ? searchEntries
        .filter(
          (entry) =>
            matchesQuery(entry.boothName, normalizedSearchQuery) ||
            matchesQuery(entry.univName, normalizedSearchQuery) ||
            matchesQuery(entry.boothId, normalizedSearchQuery),
        )
        .slice(0, 8)
    : [];

  const miniMapSearchMarkers = filteredSearchResults
    .map((entry) => {
      const destination = boothRouteTargetMap[entry.boothId];
      if (!destination) return null;

      return {
        x: destination.x,
        z: destination.z,
      };
    })
    .filter(Boolean);

  return (
    <>
      {/* 1단계: welcome 화면 (씬 미마운트) */}
      {sceneStage === 'welcome' && (
        <WelcomeModal
          open={true}
          showDismissToday={!isMobileScene}
          onEnter={handleEnterExhibition}
          onDismissToday={handleDismissWelcomeToday}
        />
      )}

      {/* 2단계: 로딩 화면 (씬 마운트 시작) */}
      {sceneStage === 'loading' && !isMobileScene && (
        <SplashScreen progress={splashProgress} showVideo={!isMobileScene} />
      )}

      {/* 씬은 loading 이후부터 마운트 */}
      {sceneStage !== 'welcome' && <Scene markup={sceneMarkup} />}

      {isDeferredSceneBlocking ? (
        <SplashScreen
          progress={deferredSceneProgress}
          showVideo={false}
          eyebrow="Scene Loading"
          title="ITRC 2026"
          copy={deferredStatusCopy}
        />
      ) : null}

      {/* 3단계: 전시장 UI (씬 로드 완료 후) */}
      {sceneStage === 'ready' && (
        <>
          {isSceneInteractive ? (
            <>
              <div id="top-utility-row">
                <SearchPanel
                  query={searchQuery}
                  results={filteredSearchResults}
                  isLoading={isSearchLoading}
                  onChange={setSearchQuery}
                  onSelect={handleSelectSearchResult}
                  onClear={() => setSearchQuery('')}
                  onFocus={() =>
                    setActiveUtilityTab((current) => (current === 'route' ? 'map' : current))
                  }
                />
                <div id="utility-tab-shell">
                  <div id="utility-tab-list">
                    <button
                      type="button"
                      className={`utility-tab ${activeUtilityTab === 'route' ? 'active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearchQuery('');
                        setActiveUtilityTab((current) => (current === 'route' ? null : 'route'));
                      }}
                    >
                      로드맵
                    </button>
                    <button
                      type="button"
                      className={`utility-tab ${activeUtilityTab === 'map' ? 'active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setActiveUtilityTab((current) => (current === 'map' ? null : 'map'))}
                    >
                      미니맵
                    </button>
                  </div>
                  {activeUtilityTab === 'route' ? (
                    <RoutePanelContent activePath={activePath} onTogglePath={handleToggle} />
                  ) : null}
                  {activeUtilityTab === 'map' ? (
                    <MiniMap route={miniMapRoute} searchMarkers={miniMapSearchMarkers} />
                  ) : null}
                </div>
              </div>
              {!isMobileScene ? (
                <button
                  id="fullscreen-toggle"
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleFullscreenToggle}
                >
                  {isFullscreen ? '전체화면 닫기' : '전체화면'}
                </button>
              ) : null}
              <InfoPanel
                isOpen={isInfoPanelOpen}
                activeItemId={activeInfoItemId}
                isMobile={isMobileScene}
                onTogglePanel={handleToggleInfoPanel}
                onOpenItem={handleOpenInfoItem}
                onCloseModal={handleCloseInfoModal}
              />
              <PosterModal
                poster={selectedPoster}
                immersive={isMobileScene}
                onClose={() => setSelectedPoster(null)}
              />
              <NpcModal
                npc={selectedNpc}
                isMobile={isMobileScene}
                onClose={() => setSelectedNpc(null)}
              />
              <VideoViewer tv={selectedTv} onClose={() => setSelectedTv(null)} />
              <VirtualJoystick />
              {isMobileScene && mobileHintToast ? (
                <div id="mobile-hint-toast" aria-live="polite" aria-atomic="true">
                  <p>{mobileHintToast}</p>
                </div>
              ) : null}
              <div id="debug-ui" />
            </>
          ) : null}
        </>
      )}
    </>
  );
}

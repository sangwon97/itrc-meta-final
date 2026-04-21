// 전시장 모델, 경로, 패널용 정적 데이터 모음
import { cdnAsset } from '../../services/assetUrl.js';

export const tvItems = [
  { id: 'tv-booth', src: cdnAsset('models/TVs/TV_New.glb') },
];


export const assetItems = [
  { id: 'ceiling', src: cdnAsset('models/Ceiling.glb') },
  { id: 'ceilingPanels', src: cdnAsset('models/CeilingPanels.glb') },
  { id: 'Walls', src: cdnAsset('models/Walls.glb') },
  { id: 'floor', src: cdnAsset('models/Floor.glb') },
  { id: 'carpet', src: cdnAsset('models/Carpet.glb') },
  { id: 'carpet-gray', src: cdnAsset('models/Carpet_Gray.glb') },
  { id: 'booths', src: cdnAsset('models/WholeBooth.glb') },
  { id: 'special-booth', src: cdnAsset('models/Special_Booth.glb') },
  { id: 'navmesh', src: cdnAsset('models/NavMesh_WholeMap.glb') },
  { id: 'navmeshMovable', src: cdnAsset('models/NavMesh_Movable.glb') },
  { id: 'panel-special-1', src: cdnAsset('models/Panels/Panel_Special1.glb') },
  { id: 'panel-special-2', src: cdnAsset('models/Panels/Panel_Special2.glb') },
  { id: 'PV_NextGenAI', src: cdnAsset('models/Panels/Panel_Vertical_NextGenAI.glb') },
  { id: 'PV_AI_Platform', src: cdnAsset('models/Panels/Panel_Vertical_AI_Platform_Service.glb') },
  { id: 'PV_Bio_Healthcare', src: cdnAsset('models/Panels/Panel_Vertical_Bio_Healthcare.glb') },
  { id: 'PV_Cloud_Security', src: cdnAsset('models/Panels/Panel_Vertical_Cloud_Security.glb') },
  { id: 'PV_Communications_Satellite', src: cdnAsset('models/Panels/Panel_Vertical_Communications_Satellite.glb') },
  { id: 'PV_ICT_Industry', src: cdnAsset('models/Panels/Panel_Vertical_ICT_Industry.glb') },
  { id: 'PV_ImmersiveSW', src: cdnAsset('models/Panels/Panel_Vertical_ImmersiveSW.glb') },
  { id: 'PV_Quantum_Tech', src: cdnAsset('models/Panels/Panel_Vertical_Quantum_Technology.glb') },
  { id: 'PV_Robot_Mobility', src: cdnAsset('models/Panels/Panel_Vertical_Robot_Mobility.glb') },
  { id: 'PV_Semiconductor', src: cdnAsset('models/Panels/Panel_Vertical_Semiconductor.glb') },
  { id: 'PU_NextGenAI', src: cdnAsset('models/Panels/Panel_Upper_NextGenAI.glb') },
  { id: 'PU_AI_Platform', src: cdnAsset('models/Panels/Panel_Upper_AI_Platform_Service.glb') },
  { id: 'PU_Bio_Healthcare', src: cdnAsset('models/Panels/Panel_Upper_Bio_Healthcare.glb') },
  { id: 'PU_Cloud_Security', src: cdnAsset('models/Panels/Panel_Upper_Cloud_Security.glb') },
  { id: 'PU_Communications_Satellite', src: cdnAsset('models/Panels/Panel_Upper_Communications_Satellite.glb') },
  { id: 'PU_ICT_Industry', src: cdnAsset('models/Panels/Panel_Upper_ICT_Industry.glb') },
  { id: 'PU_ImmersiveSW', src: cdnAsset('models/Panels/Panel_Upper_ImmersiveSW.glb') },
  { id: 'PU_Quantum_Tech', src: cdnAsset('models/Panels/Panel_Upper_Quantum_Technology.glb') },
  { id: 'PU_Robot_Mobility', src: cdnAsset('models/Panels/Panel_Upper_Robot_Mobility.glb') },
  { id: 'PU_Semiconductor', src: cdnAsset('models/Panels/Panel_Upper_Semiconductor.glb') },
];

export const boothRouteTargetMap = {
  // S1 Section
  S1B1: { x: 8, y: 0, z: -31.5 },
  S1B2: { x: 8, y: 0, z: -26 },
  S1B3: { x: 13.5, y: 0, z: -26 },
  S1B4: { x: 13.5, y: 0, z: -31.5 },
  S1B5: { x: 17, y: 0, z: -31.5 },
  S1B6: { x: 17, y: 0, z: -26 },
  S1B7: { x: 17, y: 0, z: -20.5 },

  // S2 Section
  S2B1: { x: 8, y: 0, z: -15 },
  S2B2: { x: 8, y: 0, z: -9.5 },
  S2B3: { x: 8, y: 0, z: -4 },
  S2B4: { x: 13.5, y: 0, z: -4 },
  S2B5: { x: 13.5, y: 0, z: -9.5 },
  S2B6: { x: 13.5, y: 0, z: -15 },
  S2B7: { x: 17, y: 0, z: -15 },
  S2B8: { x: 17, y: 0, z: -9.5 },
  S2B9: { x: 17, y: 0, z: -4 },

  // S3 Section
  S3B1: { x: 8, y: 0, z: 4 },
  S3B2: { x: 8, y: 0, z: 9.5 },
  S3B3: { x: 13.5, y: 0, z: 9.5 },
  S3B4: { x: 13.5, y: 0, z: 4 },
  S3B5: { x: 17, y: 0, z: 1.5 },
  S3B6: { x: 17, y: 0, z: 7 },
  S3B7: { x: 17, y: 0, z: 12.5 },

  // S4 Section
  S4B1: { x: 8, y: 0, z: 18 },
  S4B2: { x: 8, y: 0, z: 23.5 },
  S4B3: { x: 8, y: 0, z: 29 },
  S4B4: { x: 13.5, y: 0, z: 29 },
  S4B5: { x: 13.5, y: 0, z: 23.5 },
  S4B6: { x: 13.5, y: 0, z: 18 },
  S4B7: { x: 17, y: 0, z: 18 },
  S4B8: { x: 17, y: 0, z: 23.5 },
  S4B9: { x: 17, y: 0, z: 29 },

  // S5 Section
  S5B1: { x: -3, y: 0, z: -31.5 },
  S5B2: { x: -3, y: 0, z: -26 },
  S5B3: { x: 2.5, y: 0, z: -26 },
  S5B4: { x: 2.5, y: 0, z: -31.5 },
  S5B5: { x: -6.5, y: 0, z: -20.5 },
  S5B6: { x: -6.5, y: 0, z: -26 },
  S5B7: { x: -6.5, y: 0, z: -31.5 },

  // S6 Section
  S6B1: { x: -3, y: 0, z: -15 },
  S6B2: { x: -3, y: 0, z: -9.5 },
  S6B3: { x: -3, y: 0, z: -4 },
  S6B4: { x: 2.5, y: 0, z: -4 },
  S6B5: { x: 2.5, y: 0, z: -9.5 },
  S6B6: { x: 2.5, y: 0, z: -15 },
  S6B7: { x: -6.5, y: 0, z: -7 },
  S6B8: { x: -6.5, y: 0, z: -12.25 },

  // S7 Section
  S7B1: { x: -3, y: 0, z: 4 },
  S7B2: { x: -3, y: 0, z: 9.5 },
  S7B3: { x: 2.5, y: 0, z: 9.5 },
  S7B4: { x: 2.5, y: 0, z: 4 },
  S7B5: { x: -6.5, y: 0, z: 12.5 },
  S7B6: { x: -6.5, y: 0, z: 7 },
  S7B7: { x: -6.5, y: 0, z: 1.5 },

  // S8 Section
  S8B1: { x: -3, y: 0, z: 18 },
  S8B2: { x: -3, y: 0, z: 23.5 },
  S8B3: { x: -3, y: 0, z: 29 },
  S8B4: { x: 2.5, y: 0, z: 29 },
  S8B5: { x: 2.5, y: 0, z: 23.5 },
  S8B6: { x: 2.5, y: 0, z: 18 },
  S8B7: { x: -6.5, y: 0, z: 29 },
  S8B8: { x: -6.5, y: 0, z: 23.5 },

  // S9 Section
  S9B1: { x: -20, y: 0, z: -31.5 },
  S9B2: { x: -20, y: 0, z: -26 },
  S9B3: { x: -20, y: 0, z: -20.5 },
  S9B4: { x: -20, y: 0, z: -15 },
  S9B5: { x: -14.5, y: 0, z: -15 },
  S9B6: { x: -14.5, y: 0, z: -20.5 },
  S9B7: { x: -14.5, y: 0, z: -26 },
  S9B8: { x: -14.5, y: 0, z: -31.5 },
  S9B9: { x: -23.5, y: 0, z: -20.5 },
  S9B10: { x: -23.5, y: 0, z: -26 },
  S9B11: { x: -23.5, y: 0, z: -31.5 },

  // S10 Section
  S10B1: { x: -20, y: 0, z: 7 },
  S10B2: { x: -20, y: 0, z: 12.5 },
  S10B3: { x: -20, y: 0, z: 18 },
  S10B4: { x: -14.5, y: 0, z: 18 },
  S10B5: { x: -14.5, y: 0, z: 12.5 },
  S10B6: { x: -14.5, y: 0, z: 7 },
  S10B7: { x: -23.5, y: 0, z: 12.5 },
  S10B8: { x: -23.5, y: 0, z: 7 },

  // S11 Section 
  S11B1: { x: -17.5, y: 0, z: -3.5 },
  S11B2: { x: -24.5, y: 0, z: -4 },
};

function buildRouteBooths(boothIds) {
  return boothIds
    .map((id) => ({ id, target: boothRouteTargetMap[id] }))
    .filter(({ target }) => Boolean(target));
}

export const demoRouteOptions = [
  {
    key: 'capital',
    label: '수도권',
    color: '#5b8def',
    booths: buildRouteBooths(['S1B1', 'S1B2', 'S1B5', 'S1B6', 'S1B7', 'S2B3', 'S2B4', 'S2B5', 'S2B6', 'S2B8', 'S3B2', 'S3B5', 'S4B4', 'S4B5', 'S4B7', 'S4B8', 'S5B1', 'S5B2', 'S5B3', 'S5B4', 'S5B5', 'S5B6', 'S6B1', 'S6B5', 'S7B1', 'S7B2', 'S7B3', 'S7B4', 'S7B6', 'S8B4', 'S8B6', 'S9B5', 'S9B6', 'S9B7', 'S9B8', 'S10B1', 'S10B6', 'S10B7', 'S11B1']),
  },
  {
    key: 'chungcheong',
    label: '충청권',
    color: '#f2cf4b',
    booths: buildRouteBooths(['S2B1', 'S2B7', 'S2B9', 'S3B3', 'S3B4', 'S4B2', 'S4B6', 'S5B7', 'S6B2', 'S7B7', 'S8B2', 'S8B8', 'S9B10', 'S10B5', 'S10B8', 'S11B2']),
  },
  {
    key: 'yeongnam',
    label: '영남권',
    color: '#ff8a34',
    booths: buildRouteBooths(['S1B3', 'S1B4', 'S2B2', 'S3B7', 'S4B1', 'S4B9', 'S6B3', 'S6B6', 'S6B7', 'S6B8', 'S7B5', 'S8B3', 'S8B5', 'S9B1', 'S9B2', 'S9B9', 'S9B11', 'S10B2', 'S10B3']),
  },
  {
    key: 'honam',
    label: '호남권',
    color: '#48c062',
    booths: buildRouteBooths(['S3B1', 'S4B3', 'S8B1', 'S8B7', 'S9B3', 'S9B4']),
  },
  {
    key: 'gangwon',
    label: '강원권',
    color: '#55b6ff',
    booths: buildRouteBooths(['S3B6']),
  },
];

export const verticalPanels = [
  { model: '#PV_NextGenAI', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_NextGenAI.webp') },
  { model: '#PV_AI_Platform', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_AI_Platform.webp') },
  { model: '#PV_Bio_Healthcare', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_Bio_Healthcare.webp') },
  { model: '#PV_Cloud_Security', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_Cloud_Security.webp') },
  { model: '#PV_Communications_Satellite', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_Communications_Satellite.webp') },
  { model: '#PV_ICT_Industry', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_ICT_Industry.webp') },
  { model: '#PV_ImmersiveSW', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_ImmersiveSW.webp') },
  { model: '#PV_Quantum_Tech', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_Quantum_Tech.webp') },
  { model: '#PV_Robot_Mobility', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_Robot_Mobility.webp') },
  { model: '#PV_Semiconductor', texture: cdnAsset('imgs/Panels/Vertical/Panel_Vertical_Semiconductor.webp') },
];

export const upperPanels = [
  { model: '#PU_NextGenAI', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_NextGenAI.webp') },
  { model: '#PU_AI_Platform', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_AI_Platform.webp') },
  { model: '#PU_Bio_Healthcare', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_Bio_Healthcare.webp') },
  { model: '#PU_Cloud_Security', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_Cloud_Security.webp') },
  { model: '#PU_Communications_Satellite', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_Communications_Satellite.webp') },
  { model: '#PU_ICT_Industry', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_ICT_Industry.webp') },
  { model: '#PU_ImmersiveSW', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_ImmersiveSW.webp') },
  { model: '#PU_Quantum_Tech', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_Quantum_Tech.webp') },
  { model: '#PU_Robot_Mobility', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_Robot_Mobility.webp') },
  { model: '#PU_Semiconductor', texture: cdnAsset('imgs/Panels/Upper/Panel_Upper_Semiconductor.webp') },
];

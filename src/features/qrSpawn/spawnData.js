// QR 스폰 포인트 정의
// x, z: A-Frame 월드 좌표 (y는 플레이어 높이로 고정)
export const PLAYER_HEIGHT = 1.6;

export const SPAWN_DATA = {
  entrance:  { x: -25.14, z: -10.50, label: '입구' },
  Section1:  { x: 10.55,  z: -22.00, label: 'AI·빅데이터' },
  Section2:  { x: 10.55,  z: -19.25, label: '차세대 통신·위성' },
  Section3:  { x: 10.55,  z:   0.30, label: '첨단 바이오·헬스케어' },
  Section4:  { x: 10.55,  z:  14.00, label: '클라우드 보안·블록체인' },
  Section5:  { x: -0.15,  z: -22.00, label: '실감형SW·콘텐츠' },
  Section6:  { x: -9.35,  z: -16.00, label: '양자기술·데이터센터' },
  Section7:  { x: -0.15,  z:   0.25, label: '반도체·디스플레이' },
  Section8:  { x: -8.75,  z:  19.35, label: '인공지능 플랫폼·서비스' },
  Section9:  { x: -27.35, z: -12.35, label: 'ICT산업융합' },
  Section10: { x: -17.00, z:   3.15, label: '첨단 로봇·모빌리티' },
};

export const DEFAULT_SPAWN_ID = 'entrance';

export function getSpawnRigPos(spawnId) {
  const spawnPoint = SPAWN_DATA[spawnId];
  if (!spawnPoint) return null;

  return {
    x: spawnPoint.x,
    y: PLAYER_HEIGHT,
    z: spawnPoint.z,
  };
}

export const DEFAULT_RIG_SPAWN = getSpawnRigPos(DEFAULT_SPAWN_ID);

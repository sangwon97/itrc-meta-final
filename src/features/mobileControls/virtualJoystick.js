// 가상 조이스틱 입력 상태
const state = {
  x: 0,
  y: 0,
};

export function setVirtualJoystick(nextX, nextY) {
  state.x = Math.max(-1, Math.min(1, nextX));
  state.y = Math.max(-1, Math.min(1, nextY));
}

export function getVirtualJoystick() {
  return state;
}

export function resetVirtualJoystick() {
  state.x = 0;
  state.y = 0;
}

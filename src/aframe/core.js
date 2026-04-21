// 공용 등록 헬퍼
const { AFRAME, THREE } = window;

if (!AFRAME || !THREE) {
  throw new Error('AFRAME and THREE must be loaded before React mounts.');
}

export { AFRAME, THREE };

// 동일 컴포넌트의 중복 등록 방지 래퍼
export const registerOnce = (name, definition) => {
  if (!AFRAME.components[name]) {
    AFRAME.registerComponent(name, definition);
  }
};

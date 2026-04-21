// 시야 기준 이동
import { THREE, registerOnce } from '../core.js';
import { getVirtualJoystick } from '../../features/mobileControls/virtualJoystick.js';

// 텍스트 입력 포커스 여부 판별
function isEditableTarget(target) {
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || target.isContentEditable;
}

registerOnce('camera-relative-wasd', {
  schema: {
    camera: { type: 'selector' },
    acceleration: { type: 'number', default: 5.44 },
    enabled: { type: 'boolean', default: true },
  },
  init() {
    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
    };
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.move = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);

    this.handleKeyDown = (event) => {
      if (!this.data.enabled) {
        return;
      }
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) {
        return;
      }
      if (event.code in this.keys) {
        this.keys[event.code] = true;
      }
    };
    this.handleKeyUp = (event) => {
      if (event.code in this.keys) {
        this.keys[event.code] = false;
      }
    };
    this.handleBlur = () => {
      Object.keys(this.keys).forEach((code) => {
        this.keys[code] = false;
      });
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  },
  update() {
    if (this.data.enabled) return;

    Object.keys(this.keys).forEach((code) => {
      this.keys[code] = false;
    });
  },
  tick(_time, delta) {
    if (!this.data.enabled) {
      return;
    }

    const cameraObject = this.data.camera?.object3D;
    if (!cameraObject) return;

    if (isEditableTarget(document.activeElement)) {
      Object.keys(this.keys).forEach((code) => {
        this.keys[code] = false;
      });
    }

    this.move.set(0, 0, 0);
    cameraObject.getWorldDirection(this.forward);
    this.forward.y = 0;

    if (this.forward.lengthSq() < 1e-6) {
      return;
    }

    this.forward.normalize();
    this.forward.negate();
    this.right.crossVectors(this.forward, this.up).normalize();

    if (this.keys.KeyW || this.keys.ArrowUp) this.move.add(this.forward);
    if (this.keys.KeyS || this.keys.ArrowDown) this.move.sub(this.forward);
    if (this.keys.KeyD || this.keys.ArrowRight) this.move.add(this.right);
    if (this.keys.KeyA || this.keys.ArrowLeft) this.move.sub(this.right);

    const joystick = getVirtualJoystick();
    if (Math.abs(joystick.y) > 0.001) {
      this.move.addScaledVector(this.forward, -joystick.y);
    }
    if (Math.abs(joystick.x) > 0.001) {
      this.move.addScaledVector(this.right, joystick.x);
    }

    if (this.move.lengthSq() < 1e-6) {
      return;
    }

    this.move.normalize();
    this.move.multiplyScalar((this.data.acceleration * (delta || 16.67)) / 1000);
    this.el.object3D.position.add(this.move);
  },
  remove() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  },
});

import { registerOnce } from '../core.js';

const MOBILE_TOUCH_QUERY = '(max-width: 900px), (pointer: coarse)';

function isMobileTouchDevice() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_TOUCH_QUERY).matches;
}

registerOnce('mobile-touch-look', {
  schema: {
    enabled: { type: 'boolean', default: true },
    sensitivityX: { type: 'number', default: 0.0032 },
    reverseDrag: { type: 'boolean', default: true },
  },

  init() {
    this.activePointerId = null;
    this.lastPosition = null;
    this.boundCanvas = null;

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handleWindowBlur = this.handleWindowBlur.bind(this);
    this.bindCanvas = this.bindCanvas.bind(this);

    const sceneEl = this.el.sceneEl;
    if (sceneEl.hasLoaded && sceneEl.canvas) {
      this.bindCanvas();
    } else {
      sceneEl.addEventListener('renderstart', this.bindCanvas, { once: true });
    }

    window.addEventListener('blur', this.handleWindowBlur);
  },

  bindCanvas() {
    if (this.boundCanvas) {
      return;
    }

    const canvas = this.el.sceneEl?.canvas;
    if (!canvas) {
      return;
    }

    this.boundCanvas = canvas;
    canvas.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    canvas.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    canvas.addEventListener('pointerup', this.handlePointerUp, { passive: false });
    canvas.addEventListener('pointercancel', this.handlePointerUp, { passive: false });
  },

  resetTouchState() {
    this.activePointerId = null;
    this.lastPosition = null;
  },

  handleWindowBlur() {
    this.resetTouchState();
  },

  handlePointerDown(event) {
    if (
      !this.data.enabled ||
      !isMobileTouchDevice() ||
      event.pointerType !== 'touch' ||
      this.activePointerId !== null
    ) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.lastPosition = { x: event.clientX, y: event.clientY };
    this.boundCanvas?.setPointerCapture?.(event.pointerId);
  },

  handlePointerMove(event) {
    if (
      !this.data.enabled ||
      !isMobileTouchDevice() ||
      event.pointerType !== 'touch' ||
      event.pointerId !== this.activePointerId ||
      !this.lastPosition
    ) {
      return;
    }

    const lookControls = this.el.components['look-controls'];
    if (!lookControls?.yawObject || !lookControls?.pitchObject) {
      return;
    }

    const direction = this.data.reverseDrag ? 1 : -1;
    const deltaX = event.clientX - this.lastPosition.x;

    lookControls.yawObject.rotation.y += deltaX * this.data.sensitivityX * direction;

    this.lastPosition = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  },

  handlePointerUp(event) {
    if (
      this.activePointerId === null ||
      event.pointerType !== 'touch' ||
      event.pointerId !== this.activePointerId
    ) {
      return;
    }

    this.boundCanvas?.releasePointerCapture?.(event.pointerId);
    this.resetTouchState();
  },

  remove() {
    this.el.sceneEl?.removeEventListener('renderstart', this.bindCanvas);
    window.removeEventListener('blur', this.handleWindowBlur);

    if (this.boundCanvas) {
      this.boundCanvas.removeEventListener('pointerdown', this.handlePointerDown);
      this.boundCanvas.removeEventListener('pointermove', this.handlePointerMove);
      this.boundCanvas.removeEventListener('pointerup', this.handlePointerUp);
      this.boundCanvas.removeEventListener('pointercancel', this.handlePointerUp);
    }

    this.resetTouchState();
  },
});

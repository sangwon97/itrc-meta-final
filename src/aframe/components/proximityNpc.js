import { THREE, registerOnce } from '../core.js';
import { createHintBubbleSprite } from '../utils/hintBubble.js';
import { clearHintCandidate, subscribeHintChanges, updateHintCandidate } from '../utils/hintCoordinator.js';

const proximityNpcInstances = new Set();

function buildNpcAttribute(data) {
  return [
    `src: ${data.src}`,
    `boothId: ${data.boothId}`,
    `npcName: ${data.npcName}`,
    `npcGreeting: ${data.npcGreeting}`,
    `pauseOutsideViewport: ${data.pauseOutsideViewport}`,
  ].join('; ');
}

function getTopPriorityInstances(rigPosition, maxActive) {
  return Array.from(proximityNpcInstances)
    .map((instance) => {
      const entityPosition = instance.el.object3D?.position;
      if (!entityPosition) return null;

      return {
        instance,
        distanceSq: rigPosition.distanceToSquared(entityPosition),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.distanceSq - right.distanceSq)
    .slice(0, maxActive)
    .map(({ instance }) => instance);
}

registerOnce('proximity-npc', {
  schema: {
    rig: { type: 'selector' },
    src: { type: 'string' },
    boothId: { type: 'string', default: '' },
    npcName: { type: 'string', default: 'NPC' },
    npcGreeting: { type: 'string', default: '안녕하세요! 전시장에 오신 것을 환영합니다.' },
    hintText: { type: 'string', default: '저를 두번 터치하세요!' },
    hintMode: { type: 'string', default: 'bubble' },
    hintDistance: { type: 'number', default: 3 },
    loadDistance: { type: 'number', default: 18 },
    unloadDistance: { type: 'number', default: 24 },
    checkInterval: { type: 'number', default: 500 },
    maxActive: { type: 'int', default: 0 },
    billboardDistance: { type: 'number', default: 22 },
    pauseOutsideViewport: { type: 'boolean', default: false },
  },

  init() {
    this.isLoaded = false;
    this._hintId = `npc:${this.data.boothId || this.el.id || this.el.object3D?.uuid || 'unknown'}`;
    this.lastCheck = 0;
    this._hintBubble = null;
    this._wantsHintVisible = false;
    this._unsubscribeHintChanges = subscribeHintChanges((activeHint) => {
      const shouldRenderBubble = (
        this.data.hintMode === 'bubble'
        && this._wantsHintVisible
        && activeHint?.id === this._hintId
      );

      if (!shouldRenderBubble) {
        if (this._hintBubble) {
          this._hintBubble.visible = false;
        }
        return;
      }

      this.ensureHintBubble();
      this._hintBubble.visible = true;
    });
    this._lookDir = new THREE.Vector3();
    this._camPos = new THREE.Vector3();
    this._entityWorldPos = new THREE.Vector3();
    proximityNpcInstances.add(this);
  },

  isLookingAt() {
    const camera = this.el.sceneEl?.camera;
    if (!camera) return true;

    camera.getWorldDirection(this._lookDir);
    camera.getWorldPosition(this._camPos);
    this.el.object3D.getWorldPosition(this._entityWorldPos);
    this._entityWorldPos.y = this._camPos.y;
    this._entityWorldPos.sub(this._camPos).normalize();

    return this._lookDir.dot(this._entityWorldPos) >= 0.75;
  },

  isWithinMobileBudget(rigPosition) {
    if (!this.data.maxActive || this.data.maxActive <= 0) return true;

    return getTopPriorityInstances(rigPosition, this.data.maxActive).includes(this);
  },

  unloadModel() {
    this.el.removeAttribute('npc-model');
    this.el.removeObject3D('npc');
    this.isLoaded = false;
    this.setHintVisible(false);
  },

  ensureHintBubble() {
    if (this._hintBubble) return;

    this._hintBubble = createHintBubbleSprite(this.data.hintText);
    this.el.setObject3D('npc-hint', this._hintBubble);
  },

  setHintVisible(visible, distance = Infinity) {
    this._wantsHintVisible = visible;
    updateHintCandidate({
      id: this._hintId,
      text: this.data.hintText,
      distance,
      visible,
    });
  },

  tick(time) {
    if (time - this.lastCheck < this.data.checkInterval) return;
    this.lastCheck = time;

    const rigPosition = this.data.rig?.object3D?.position;
    const entityPosition = this.el.object3D?.position;
    if (!rigPosition || !entityPosition) return;

    const distanceSq = rigPosition.distanceToSquared(entityPosition);
    const loadDistanceSq = this.data.loadDistance * this.data.loadDistance;
    const unloadDistanceSq = this.data.unloadDistance * this.data.unloadDistance;
    const hintDistanceSq = this.data.hintDistance * this.data.hintDistance;
    const shouldBeActive = distanceSq <= loadDistanceSq && this.isWithinMobileBudget(rigPosition);

    if (!this.isLoaded && shouldBeActive) {
      this.el.setAttribute('npc-model', buildNpcAttribute(this.data));
      this.isLoaded = true;
    }

    if (this.isLoaded && (!shouldBeActive || distanceSq >= unloadDistanceSq)) {
      this.unloadModel();
      return;
    }

    if (!this.isLoaded) return;

    const npcObject = this.el.getObject3D('npc');
    const inRange = npcObject?.visible !== false && distanceSq <= hintDistanceSq;
    const shouldShowHint = inRange && (this.data.hintMode !== 'toast' || this.isLookingAt());

    this.setHintVisible(shouldShowHint, Math.sqrt(distanceSq));
  },

  remove() {
    proximityNpcInstances.delete(this);
    clearHintCandidate(this._hintId);
    this._unsubscribeHintChanges?.();
    if (this._hintBubble) {
      this._hintBubble.userData.dispose?.();
      this.el.removeObject3D('npc-hint');
      this._hintBubble = null;
    }
    if (!this.isLoaded) return;
    this.unloadModel();
  },
});

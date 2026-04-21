const hintEntries = new Map();
const listeners = new Set();

function pickActiveHint() {
  const visibleHints = Array.from(hintEntries.values()).filter((entry) => entry.visible);
  if (!visibleHints.length) return null;

  visibleHints.sort((left, right) => {
    if (left.distance !== right.distance) return left.distance - right.distance;
    return right.order - left.order;
  });

  return visibleHints[0];
}

let activeHintId = null;

function notifyListeners() {
  const activeHint = activeHintId ? hintEntries.get(activeHintId) ?? null : null;
  listeners.forEach((listener) => listener(activeHint));
}

export function updateHintCandidate({ id, text, distance, visible }) {
  if (!id) return;

  const existing = hintEntries.get(id);

  if (!visible) {
    if (!existing) return;
    hintEntries.delete(id);
  } else {
    hintEntries.set(id, {
      id,
      text,
      visible: true,
      distance: Number.isFinite(distance) ? distance : Infinity,
      order: existing?.order ?? Date.now() + Math.random(),
    });
  }

  const nextActiveHint = pickActiveHint();
  const nextActiveId = nextActiveHint?.id ?? null;
  if (nextActiveId === activeHintId) return;

  activeHintId = nextActiveId;
  notifyListeners();
}

export function clearHintCandidate(id) {
  updateHintCandidate({ id, visible: false });
}

export function subscribeHintChanges(listener) {
  listeners.add(listener);
  listener(activeHintId ? hintEntries.get(activeHintId) ?? null : null);
  return () => {
    listeners.delete(listener);
  };
}

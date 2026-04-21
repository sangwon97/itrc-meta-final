import React, { useEffect, useRef, useState } from 'react';
import { resetVirtualJoystick, setVirtualJoystick } from './virtualJoystick.js';

// 모바일 이동 조이스틱
export default function VirtualJoystick() {
  const padRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [stick, setStick] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px), (pointer: coarse)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => () => resetVirtualJoystick(), []);

  if (!isMobile) {
    return null;
  }

  const updateStick = (clientX, clientY) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const maxRadius = rect.width * 0.32;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY) || 1;
    const ratio = Math.min(1, maxRadius / distance);
    const clampedX = deltaX * ratio;
    const clampedY = deltaY * ratio;
    const normalizedX = clampedX / maxRadius;
    const normalizedY = clampedY / maxRadius;

    setStick({ x: clampedX, y: clampedY, active: true });
    setVirtualJoystick(normalizedX, normalizedY);
  };

  const releaseStick = () => {
    setStick({ x: 0, y: 0, active: false });
    resetVirtualJoystick();
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateStick(event.clientX, event.clientY);
  };

  const handlePointerMove = (event) => {
    if (!stick.active) return;
    event.preventDefault();
    updateStick(event.clientX, event.clientY);
  };

  const handlePointerUp = (event) => {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    releaseStick();
  };

  return (
    <div id="mobile-joystick-wrap">
      <div
        id="mobile-joystick-pad"
        ref={padRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          id="mobile-joystick-stick"
          style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }}
        />
      </div>
    </div>
  );
}

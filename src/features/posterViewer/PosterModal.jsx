import React, { useCallback, useEffect, useRef, useState } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;

// 포스터 상세 모달
export default function PosterModal({ poster, onClose, immersive = false }) {
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const [scale, setScale] = useState(MIN_SCALE);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const isGesturing = useRef(false);
  const hasMoved = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetAtDrag = useRef({ x: 0, y: 0 });
  const pinchStart = useRef(null);
  const scaleRef = useRef(scale);
  const offsetRef = useRef(offset);
  scaleRef.current = scale;
  offsetRef.current = offset;
  const hasImage = Boolean(poster?.imageSrc);

  useEffect(() => {
    setIsInfoVisible(false);
    setScale(MIN_SCALE);
    setOffset({ x: 0, y: 0 });
    isDragging.current = false;
    isGesturing.current = false;
    pinchStart.current = null;
  }, [poster?.imageSrc, poster?.title, poster?.description]);

  const clamp = useCallback((raw, s) => {
    const el = containerRef.current;
    if (!el || s <= MIN_SCALE) return { x: 0, y: 0 };
    const { width, height } = el.getBoundingClientRect();
    return {
      x: Math.max(-(width * (s - 1)) / 2, Math.min((width * (s - 1)) / 2, raw.x)),
      y: Math.max(-(height * (s - 1)) / 2, Math.min((height * (s - 1)) / 2, raw.y)),
    };
  }, []);

  const applyZoom = useCallback((anchorX, anchorY, nextScale) => {
    const s2 = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    const s1 = scaleRef.current;
    if (s2 <= MIN_SCALE) {
      setScale(MIN_SCALE);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = anchorX - rect.left - rect.width / 2;
    const cy = anchorY - rect.top - rect.height / 2;
    const raw = {
      x: cx * (1 - s2 / s1) + offsetRef.current.x * (s2 / s1),
      y: cy * (1 - s2 / s1) + offsetRef.current.y * (s2 / s1),
    };
    setScale(s2);
    setOffset(clamp(raw, s2));
  }, [clamp]);

  // 마우스 휠 줌
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      applyZoom(e.clientX, e.clientY, scaleRef.current * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoom]);

  const handleMouseDown = useCallback((e) => {
    hasMoved.current = false;
    if (scaleRef.current <= MIN_SCALE) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetAtDrag.current = { ...offsetRef.current };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved.current = true;
    setOffset(clamp({ x: offsetAtDrag.current.x + dx, y: offsetAtDrag.current.y + dy }, scaleRef.current));
  }, [clamp]);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const handleTouchStart = useCallback((e) => {
    hasMoved.current = false;
    if (e.touches.length === 2) {
      isGesturing.current = true;
      isDragging.current = false;
      const [a, b] = e.touches;
      pinchStart.current = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        midX: (a.clientX + b.clientX) / 2,
        midY: (a.clientY + b.clientY) / 2,
        scaleStart: scaleRef.current,
      };
    } else if (e.touches.length === 1 && scaleRef.current > MIN_SCALE) {
      isDragging.current = true;
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      offsetAtDrag.current = { ...offsetRef.current };
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2 && pinchStart.current) {
      e.preventDefault();
      const [a, b] = e.touches;
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      applyZoom(pinchStart.current.midX, pinchStart.current.midY, pinchStart.current.scaleStart * (dist / pinchStart.current.dist));
    } else if (e.touches.length === 1 && isDragging.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasMoved.current = true;
      setOffset(clamp({ x: offsetAtDrag.current.x + dx, y: offsetAtDrag.current.y + dy }, scaleRef.current));
    }
  }, [applyZoom, clamp]);

  const handleTouchEnd = useCallback((e) => {
    if (e.touches.length < 2) pinchStart.current = null;
    if (e.touches.length === 0) {
      isDragging.current = false;
      isGesturing.current = false;
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scaleRef.current > MIN_SCALE) {
      setScale(MIN_SCALE);
      setOffset({ x: 0, y: 0 });
    } else {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      applyZoom(rect.left + rect.width / 2, rect.top + rect.height / 2, 2);
    }
  }, [applyZoom]);

  const imgStyle = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transformOrigin: 'center center',
    cursor: scale > MIN_SCALE ? 'grab' : 'default',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  };

  const zoomHandlers = {
    ref: containerRef,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onDoubleClick: handleDoubleClick,
  };

  if (!poster) return null;

  const mediaContent = hasImage ? (
    <img src={poster.imageSrc} alt={poster.title} style={imgStyle} />
  ) : (
    <div className="poster-media-placeholder" aria-hidden="true">
      <p className="poster-modal-eyebrow">Poster Pending</p>
      <strong>{poster.title}</strong>
      <span>포스터 이미지가 아직 등록되지 않았습니다.</span>
    </div>
  );

  if (immersive) {
    const handleStageClick = () => {
      if (hasMoved.current || isGesturing.current) return;
      setIsInfoVisible((current) => !current);
    };

    return (
      <div id="poster-mobile-viewer" role="dialog" aria-modal="true">
        <div
          id="poster-mobile-stage"
          className={isInfoVisible ? 'info-visible' : ''}
          onClick={handleStageClick}
          {...(hasImage ? zoomHandlers : {})}
        >
          {mediaContent}
          <button
            type="button"
            id="poster-mobile-close"
            aria-label="포스터 닫기"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            닫기
          </button>
          <div id="poster-mobile-hint">
            {isInfoVisible ? '화면 클릭 시 이미지가 보입니다.' : '포스터 클릭 시 설명이 보입니다.'}
          </div>
          <div
            id="poster-mobile-info"
            aria-hidden={isInfoVisible ? 'false' : 'true'}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{poster.title}</h3>
            <p>{poster.description}</p>
            {poster.forumLink && (
              <a href={poster.forumLink} target="_blank" rel="noopener noreferrer" className="poster-forum-link">
                센터 소개 보기
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="poster-modal-backdrop" onClick={onClose}>
      <section
        id="poster-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="poster-modal-media" {...(hasImage ? zoomHandlers : {})}>
          {mediaContent}
        </div>
        <div className="poster-modal-content">
          {!hasImage ? <p className="poster-modal-eyebrow">Poster Pending</p> : null}
          <h3>{poster.title}</h3>
          <p className="poster-modal-description">{poster.description}</p>
          {poster.forumLink && (
            <a href={poster.forumLink} target="_blank" rel="noopener noreferrer" className="poster-forum-link">
              센터 소개 보기
            </a>
          )}
          <button type="button" className="poster-modal-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </section>
    </div>
  );
}

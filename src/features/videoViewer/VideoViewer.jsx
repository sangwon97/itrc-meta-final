// CNU TV 스크린 클릭 시 YouTube 영상을 재생하는 모달 컴포넌트.
// tv prop이 null이면 렌더링하지 않으며, 언마운트 시 iframe이 제거되어 재생이 자동으로 멈춘다.
import React from 'react';

export default function VideoViewer({ tv, onClose }) {
  if (!tv) return null;

  return (
    <div id="tv-modal-backdrop" onClick={onClose}>
      <section
        id="tv-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div id="tv-modal-iframe-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${tv.youtubeId}?autoplay=1`}
            title="YouTube video"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
          />
        </div>
        <button type="button" id="tv-modal-close" onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}

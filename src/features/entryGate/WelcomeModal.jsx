// 시작 안내 팝업
import React, { useRef, useCallback } from 'react';

const VIDEOS = ['videos/splash_video_1.mp4', 'videos/splash_video_2.mp4'];

export default function WelcomeModal({
  open,
  onEnter,
  onDismissToday,
  showVideo = true,
  showDismissToday = true,
}) {
  if (!open) return null;

  const indexRef = useRef(0);

  const handleEnded = useCallback((event) => {
    indexRef.current = (indexRef.current + 1) % VIDEOS.length;
    event.target.src = VIDEOS[indexRef.current];
    event.target.play();
  }, []);

  return (
    <div id="welcome-modal-backdrop">
      {showVideo ? (
        <video
          className="welcome-bg-video"
          src={VIDEOS[0]}
          autoPlay
          muted
          playsInline
          preload="metadata"
          onEnded={handleEnded}
        />
      ) : (
        <div className="welcome-bg-fallback" aria-hidden="true" />
      )}
      <section id="welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <p className="welcome-eyebrow">Welcome</p>
        <h2 id="welcome-title">ITRC 전시회에 오신 여러분, 환영합니다.</h2>
        <p>
          이 플랫폼은 전남대학교 Hi IoP Lab에서 제공하는 가상 전시 플랫폼입니다.
          관람자가 실제 전시장을 방문하지 않아도 가상환경 안에서 전시 콘텐츠와 연구 성과를
          자연스럽게 경험할 수 있도록 제작했습니다.
        </p>
        <p>
          로드맵, 미니맵, 부스 정보, 포스터 상세 보기 기능을 통해 ITRC 전시를 자유롭게 둘러보실 수 있습니다.
        </p>
        <div className="welcome-actions">
          {showDismissToday ? (
            <button type="button" className="welcome-secondary" onClick={onDismissToday}>
              오늘 하루 보지 않기
            </button>
          ) : null}
          <button type="button" className="welcome-primary" onClick={onEnter}>
            ITRC 가상전시회 입장하기
          </button>
        </div>
      </section>
    </div>
  );
}

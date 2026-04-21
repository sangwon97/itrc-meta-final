import React from 'react';
import chevronDownIcon from '../../assets/icons/Chevron down.svg';
import chevronUpIcon from '../../assets/icons/Chevron up.svg';
import chevronLeftIcon from '../../assets/icons/chevron-left.svg';
import closeIcon from '../../assets/icons/X.svg';
import menuIcon from '../../assets/icons/menu.svg';
import { infoMenuItems } from './infoContent.js';

function InfoHighlights({ highlights }) {
  if (!highlights?.length) return null;

  return (
    <section className="info-highlight-grid" aria-label="주요 정보">
      {highlights.map((highlight) => (
        <article key={`${highlight.label}-${highlight.value}`} className="info-highlight-card">
          <p>{highlight.label}</p>
          <strong>{highlight.value}</strong>
        </article>
      ))}
    </section>
  );
}

function InfoBodyCopy({ body }) {
  if (!body?.length) return null;

  return (
    <section className="info-copy-block">
      {body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </section>
  );
}

function InfoGallerySection({ item }) {
  const hasLogoRail = item.gallery?.some((entry) => entry.logos?.length);
  const galleryWithLogos = item.gallery?.filter((entry) => entry.logos?.length) || [];
  const firstCategoryTitle = galleryWithLogos[0]?.title || null;
  const [selectedEntryTitle, setSelectedEntryTitle] = React.useState(firstCategoryTitle);

  React.useEffect(() => {
    setSelectedEntryTitle(firstCategoryTitle);
  }, [firstCategoryTitle, item.id]);

  if (!item.gallery?.length) return null;

  if (hasLogoRail) {
    return (
      <section className="info-gallery-section info-gallery-dropdown-section">
        <div className="info-category-list" role="list">
          {galleryWithLogos.map((entry) => {
            const isOpen = selectedEntryTitle === entry.title;
            const accentStyle = entry.accentColor
              ? { '--info-accent': entry.accentColor }
              : undefined;

            return (
              <article
                key={entry.title}
                className={`info-category-list-item ${isOpen ? 'open' : ''}`}
                role="listitem"
                style={accentStyle}
              >
                <button
                  type="button"
                  className={`info-category-button ${isOpen ? 'open' : ''}`}
                  aria-expanded={isOpen}
                  onClick={() =>
                    setSelectedEntryTitle((current) => (current === entry.title ? null : entry.title))
                  }
                >
                  <span className="info-category-button-label">
                    <span>{entry.title}</span>
                    <span className="info-category-count-badge">{entry.logos.length}</span>
                  </span>
                  <img
                    className="info-category-button-arrow"
                    src={isOpen ? chevronUpIcon : chevronDownIcon}
                    alt=""
                    aria-hidden="true"
                  />
                </button>
                {isOpen ? (
                  <div className="info-category-panel">
                    <p className="info-logo-hint">클릭 시 해당 센터 소개 페이지로 이동됩니다.</p>
                    <div className="info-logo-rail standalone" role="list" aria-label={`${entry.title} 참여 대학 로고 목록`}>
                      {entry.logos.map((logo) => {
                        const key = `${entry.title}-${logo.label}`;
                        const logoMedia = (
                          <div className="info-logo-media">
                            <img src={logo.imageSrc} alt={logo.imageAlt || logo.label} loading="lazy" />
                          </div>
                        );

                        if (logo.href) {
                          return (
                            <a
                              key={key}
                              className="info-logo-card info-logo-link"
                              href={logo.href}
                              role="listitem"
                              style={accentStyle}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`${logo.label} 소개 페이지 열기`}
                              title={`${logo.label} 소개 페이지 열기`}
                            >
                              {logoMedia}
                            </a>
                          );
                        }

                        return (
                          <article key={key} className="info-logo-card" role="listitem" style={accentStyle}>
                            {logoMedia}
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="info-gallery-section">
      <div className="info-gallery-grid">
        {item.gallery.map((entry) => (
          <article key={`${entry.title}-${entry.description}`} className="info-gallery-card">
            {entry.imageSrc ? (
              <div className="info-gallery-media">
                <img src={entry.imageSrc} alt={entry.imageAlt || entry.title} loading="lazy" />
              </div>
            ) : null}
            <div className="info-gallery-copy">
              <h5>{entry.title}</h5>
              <p>{entry.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function InfoContentBody({ item }) {
  return (
    <>
      {item.hero ? (
        <section className="info-hero">
          <div className="info-hero-copy">
            {item.hero.caption ? <p className="info-hero-caption">{item.hero.caption}</p> : null}
          </div>
          {item.hero.imageSrc ? (
            <div className="info-hero-media">
              <img src={item.hero.imageSrc} alt={item.hero.imageAlt || item.title} loading="lazy" />
            </div>
          ) : null}
        </section>
      ) : null}

      <InfoHighlights highlights={item.highlights} />
      <InfoBodyCopy body={item.body} />
      <InfoGallerySection item={item} />
    </>
  );
}

function InfoDesktopModalBody({ item, onClose }) {
  return (
    <>
      <div className="info-modal-main">
        {item.hero?.imageSrc ? (
          <div className="info-modal-media">
            <img src={item.hero.imageSrc} alt={item.hero.imageAlt || item.title} loading="lazy" />
          </div>
        ) : null}
        <div className="info-modal-panel">
          <div className="info-modal-panel-copy">
            <p className="info-section-eyebrow">{item.hero?.badge || 'Guide'}</p>
            <h3 id="info-modal-title">{item.title}</h3>
            {item.hero?.caption ? <p className="info-modal-caption">{item.hero.caption}</p> : null}
          </div>
          <div className="info-modal-panel-body">
            <InfoHighlights highlights={item.highlights} />
            <InfoBodyCopy body={item.body} />
          </div>
          <div className="info-modal-footer">
            <button type="button" className="info-modal-close" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
      <InfoGallerySection item={item} />
    </>
  );
}

// 사이드 안내 패널
export default function InfoPanel({
  isOpen,
  activeItemId,
  isMobile = false,
  onTogglePanel,
  onOpenItem,
  onCloseModal,
}) {
  // 현재 선택 안내 항목 조회
  const activeItem = infoMenuItems.find((item) => item.id === activeItemId) || null;
  const handleOpenItem = (itemId) => {
    onOpenItem(itemId);

    if (isMobile && isOpen) {
      onTogglePanel();
    }
  };

  return (
    <>
      {!isMobile && isOpen ? (
        <div
          id="info-panel-backdrop"
          aria-hidden="true"
          onClick={onTogglePanel}
        />
      ) : null}

      {isMobile ? (
        <div id="info-mobile-menu" className={isOpen ? 'open' : 'closed'}>
          <div id="info-mobile-actions" aria-hidden={!isOpen}>
            {infoMenuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="info-mobile-action"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOpenItem(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            id="info-panel-toggle"
            className={`${isOpen ? 'open' : 'closed'} mobile`}
            type="button"
            aria-label={isOpen ? '더보기 메뉴 닫기' : '더보기 메뉴 열기'}
            aria-expanded={isOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onTogglePanel}
          >
            <img
              className="info-mobile-toggle-icon"
              src={isOpen ? closeIcon : menuIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        </div>
      ) : (
        <>
          <button
            id="info-panel-toggle"
            className={isOpen ? 'open' : 'closed'}
            type="button"
            aria-label={isOpen ? '사이드 메뉴 닫기' : '사이드 메뉴 열기'}
            aria-expanded={isOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onTogglePanel}
          >
            {isOpen ? (
              <img className="info-panel-toggle-icon" src={chevronLeftIcon} alt="" aria-hidden="true" />
            ) : (
              <span className="info-panel-toggle-text">메뉴열기</span>
            )}
          </button>

          <aside id="info-panel" className={isOpen ? 'open' : 'closed'} aria-hidden={!isOpen}>
            <div className="info-panel-header">
              <p className="info-panel-eyebrow">Guide</p>
              <h2 className="info-panel-title">행사 안내</h2>
            </div>
            <div className="info-panel-list">
              {infoMenuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="info-panel-item"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleOpenItem(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>
        </>
      )}

      {activeItem ? (
        isMobile ? (
          <div id="info-mobile-viewer" role="dialog" aria-modal="true" aria-labelledby="info-mobile-title">
            <div id="info-mobile-stage">
              <button
                type="button"
                id="info-mobile-close"
                aria-label="안내 화면 닫기"
                onClick={onCloseModal}
              >
                닫기
              </button>
              <section id="info-mobile-sheet">
                <h3 id="info-mobile-title">{activeItem.title}</h3>
                <div className="info-mobile-body">
                  <InfoContentBody item={activeItem} />
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div id="info-modal-backdrop" onClick={onCloseModal}>
            <section
              id="info-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="info-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="info-modal-body">
                <InfoDesktopModalBody item={activeItem} onClose={onCloseModal} />
              </div>
            </section>
          </div>
        )
      ) : null}
    </>
  );
}

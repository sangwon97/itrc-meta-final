import React, { useEffect, useRef, useState } from 'react';
import { fetchNpc } from '../../services/api.js';

// NPC 클릭 시 표시되는 대화 모달
export default function NpcModal({ npc, onClose, isMobile = false }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [centerData, setCenterData] = useState(null);

  // 자유 대화 탭 상태
  const [activeTab, setActiveTab] = useState('faq');
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setActiveIndex(null);
    setActiveTab('faq');
    setChatHistory([]);
    setInputValue('');
    setCenterData(null);

    if (!npc?.boothId) return;
    fetchNpc(npc.boothId).then(setCenterData).catch(() => setCenterData(null));
  }, [npc?.boothId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  if (!npc) return null;

  // ── 기존 FAQ 핸들러 (변경 없음) ──────────────────────────────────
  const handleQuestion = (index) => {
    setActiveIndex((current) => (current === index ? null : index));
  };

  // ── 자유 대화 핸들러 ─────────────────────────────────────────────
  const handleSend = async () => {
    const msg = inputValue.trim();
    if (!msg || isLoading) return;

    const userEntry = { role: 'user', text: msg };
    const nextHistory = [...chatHistory, userEntry];
    setChatHistory(nextHistory);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: npc.boothId,
          message: msg,
          history: chatHistory,
        }),
      });
      const data = await res.json();
      setChatHistory([
        ...nextHistory,
        { role: 'model', text: data.reply ?? data.error ?? '오류가 발생했습니다.' },
      ]);
    } catch {
      setChatHistory([
        ...nextHistory,
        { role: 'model', text: '연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── 공통 UI 조각 ─────────────────────────────────────────────────

  const tabs = (
    <div className="npc-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'faq'}
        className={`npc-tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
        onClick={() => setActiveTab('faq')}
      >
        자주 묻는 질문
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'chat'}
        className={`npc-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => setActiveTab('chat')}
      >
        대화하기
      </button>
    </div>
  );

  const chatPanel = (
    <div className="npc-chat-panel">
      <div className="npc-chat-thread-free">
        {chatHistory.length === 0 && !isLoading && (
          <p className="npc-chat-empty">무엇이든 질문해 보세요.</p>
        )}
        {chatHistory.map((msg, i) =>
          msg.role === 'user' ? (
            <article key={i} className="npc-chat-row npc-chat-row-user">
              <div className="npc-chat-bubble user">
                <p>{msg.text}</p>
              </div>
            </article>
          ) : (
            <article key={i} className="npc-chat-row npc-chat-row-npc">
              <div className="npc-chat-avatar" aria-hidden="true">NPC</div>
              <div className="npc-chat-bubble npc">
                <p>{msg.text}</p>
              </div>
            </article>
          )
        )}
        {isLoading && (
          <article className="npc-chat-row npc-chat-row-npc">
            <div className="npc-chat-avatar" aria-hidden="true">NPC</div>
            <div className="npc-chat-bubble npc">
              <div className="npc-chat-loading">
                <span className="npc-chat-loading-dot" />
                <span className="npc-chat-loading-dot" />
                <span className="npc-chat-loading-dot" />
              </div>
            </div>
          </article>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="npc-chat-input-row">
        <textarea
          className="npc-chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요…"
          rows={1}
          aria-label="메시지 입력"
        />
        <button
          type="button"
          className="npc-chat-send-btn"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          aria-label="전송"
        >
          ↑
        </button>
      </div>
    </div>
  );

  // ── 모바일 렌더 ──────────────────────────────────────────────────
  if (isMobile) {
    const activeFaq = activeIndex != null ? centerData?.faqs?.[activeIndex] : null;

    return (
      <div id="npc-mobile-viewer" role="dialog" aria-modal="true" aria-labelledby="npc-mobile-title">
        <div id="npc-mobile-stage">
          <button
            type="button"
            id="npc-mobile-close"
            aria-label="NPC 도움말 닫기"
            onClick={onClose}
          >
            닫기
          </button>
          <section id="npc-mobile-sheet" className={activeTab === 'chat' ? 'chat-mode' : ''}>
            <div className="npc-mobile-chat-header">
              <h3 id="npc-mobile-title" className="npc-mobile-chat-name">
                {npc.npcName}
              </h3>
            </div>

            {tabs}

            {activeTab === 'faq' ? (
              <>
                <div className="npc-mobile-chat-thread">
                  <article className="npc-chat-row npc-chat-row-npc">
                    <div className="npc-chat-avatar" aria-hidden="true">NPC</div>
                    <div className="npc-chat-bubble npc">
                      <p>{npc.npcGreeting}</p>
                    </div>
                  </article>

                  {centerData ? (
                    <article className="npc-chat-row npc-chat-row-npc">
                      <div className="npc-chat-avatar" aria-hidden="true">NPC</div>
                      <div className="npc-chat-bubble npc feature">
                        <p className="npc-chat-bubble-label">센터 소개</p>
                        <p>{centerData.intro}</p>
                      </div>
                    </article>
                  ) : null}

                  {activeFaq ? (
                    <>
                      <article className="npc-chat-row npc-chat-row-user">
                        <div className="npc-chat-bubble user">
                          <p>{activeFaq.question}</p>
                        </div>
                      </article>
                      <article className="npc-chat-row npc-chat-row-npc">
                        <div className="npc-chat-avatar" aria-hidden="true">NPC</div>
                        <div className="npc-chat-bubble npc">
                          <p>{activeFaq.answer}</p>
                        </div>
                      </article>
                    </>
                  ) : null}
                </div>

                {centerData ? (
                  <div className="npc-mobile-quick-panel">
                    <p className="npc-mobile-quick-title">질문을 선택해 보세요</p>
                    <div className="npc-mobile-quick-list">
                      {centerData.faqs.map((item, index) => (
                        <button
                          key={item.question}
                          type="button"
                          className={`npc-mobile-quick-chip ${activeIndex === index ? 'active' : ''}`}
                          onClick={() => handleQuestion(index)}
                        >
                          {item.question}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              chatPanel
            )}
          </section>
        </div>
      </div>
    );
  }

  // ── 데스크탑 렌더 ─────────────────────────────────────────────────
  return (
    <div id="npc-modal-backdrop" onClick={onClose}>
      <section
        id="npc-modal"
        className={activeTab === 'chat' ? 'chat-mode' : ''}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="npc-modal-header">
          <div className="npc-modal-avatar-icon" aria-hidden="true">👤</div>
          <div>
            <p className="npc-modal-name">{npc.npcName}</p>
            <p className="npc-modal-greeting">{npc.npcGreeting}</p>
          </div>
        </div>

        {tabs}

        {activeTab === 'faq' ? (
          <>
            {/* 센터 소개 */}
            {centerData && (
              <div className="npc-modal-intro">
                <h4 className="npc-modal-section-title">센터 소개</h4>
                <p className="npc-modal-intro-text">{centerData.intro}</p>
              </div>
            )}

            {/* 예상 질문 */}
            {centerData && (
              <div className="npc-modal-faq">
                <h4 className="npc-modal-section-title">궁금하신 점이 있으신가요?</h4>
                <ul className="npc-faq-list">
                  {centerData.faqs.map((item, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className={`npc-faq-question ${activeIndex === index ? 'active' : ''}`}
                        onClick={() => handleQuestion(index)}
                      >
                        {item.question}
                      </button>
                      {activeIndex === index && (
                        <p className="npc-faq-answer">{item.answer}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          chatPanel
        )}

        <button type="button" className="npc-modal-close" onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}

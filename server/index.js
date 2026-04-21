import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const STRAPI_URL = process.env.VITE_API_URL || 'http://localhost:1337';

const app = express();

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// ── Rate Limiter ──────────────────────────────────────────────────────────────
// IP당 윈도우 내 요청 횟수를 추적. 외부 패키지 없이 Map으로 구현.
const WINDOW_MS = 60 * 1000;   // 1분 윈도우
const MAX_REQUESTS = 10;        // 윈도우당 최대 10회
const COOLDOWN_MS = 3 * 1000;  // 직전 요청으로부터 3초 쿨다운

const rateLimitMap = new Map(); // ip → { count, windowStart, lastReq }

// 만료된 IP 항목을 주기적으로 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [ip, state] of rateLimitMap) {
    if (now - state.windowStart > WINDOW_MS) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

function chatRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.ip;
  const now = Date.now();
  const state = rateLimitMap.get(ip) ?? { count: 0, windowStart: now, lastReq: 0 };

  // 윈도우 초기화
  if (now - state.windowStart > WINDOW_MS) {
    state.count = 0;
    state.windowStart = now;
  }

  // 쿨다운 체크
  if (now - state.lastReq < COOLDOWN_MS) {
    return res.status(429).json({ error: '잠시 후 다시 시도해주세요.' });
  }

  // 윈도우 한도 체크
  if (state.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((state.windowStart + WINDOW_MS - now) / 1000);
    res.set('Retry-After', retryAfter);
    return res.status(429).json({ error: `요청이 너무 많습니다. ${retryAfter}초 후 다시 시도해주세요.` });
  }

  state.count += 1;
  state.lastReq = now;
  rateLimitMap.set(ip, state);
  next();
}
// ─────────────────────────────────────────────────────────────────────────────

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// NPC 컨텍스트 캐시 (Strapi에서 1회 fetch)
const npcContextCache = new Map();

async function fetchNpcContext(boothId) {
  if (npcContextCache.has(boothId)) return npcContextCache.get(boothId);

  try {
    const url = `${STRAPI_URL}/api/npcs?filters[boothId][$eq]=${encodeURIComponent(boothId)}&pagination[limit]=1`;
    const res = await fetch(url);
    const json = await res.json();
    const npc = json.data?.[0] ?? null;
    npcContextCache.set(boothId, npc);
    return npc;
  } catch {
    return null;
  }
}

// NPC 채팅
app.post('/api/chat', chatRateLimit, async (req, res) => {
  const { npcId, message, history = [] } = req.body ?? {};
  if (!message) return res.status(400).json({ error: '메시지가 없습니다.' });

  const npcData = await fetchNpcContext(npcId);
  const intro = npcData?.intro ?? '';
  const faqs = Array.isArray(npcData?.faqs)
    ? npcData.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n')
    : '';

  const systemPrompt = [
    `당신은 ITRC 전시회 부스(${npcId})의 친절한 안내 NPC입니다.`,
    intro ? `센터 소개: ${intro}` : '',
    faqs ? `자주 묻는 질문:\n${faqs}` : '',
    '방문객의 질문에 한국어로 간결하고 친절하게 답변하세요.',
  ].filter(Boolean).join('\n\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.text,
    })),
    { role: 'user', content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      max_tokens: 512,
    });
    const reply = completion.choices[0]?.message?.content ?? '답변을 생성하지 못했습니다.';
    res.json({ reply });
  } catch (err) {
    console.error('[/api/chat] OpenAI 오류:', err.message);
    res.status(500).json({ error: '응답 생성에 실패했습니다.' });
  }
});

// 정적 파일 serve (React 빌드)
app.use(express.static(path.join(__dirname, '../dist')));

// Express 5.x 와일드카드 문법
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
  console.log(`CORS 허용 출처: ${CLIENT_ORIGIN}`);
  console.log(`사용 모델: ${OPENAI_MODEL}`);
});

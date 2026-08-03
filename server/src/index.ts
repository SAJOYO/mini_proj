/**
 * 펫 채팅 대화 영속화 서버.
 *
 * ComfyUI(lib/comfy.ts)와 같은 성격입니다 — 팀 노트북에서 `npm run dev`로
 * 띄우고, 앱은 사설 IP로 접속합니다. 인증이 없습니다(로그인 자체가 없는
 * 프로젝트라 기기 발급 익명 ID로만 구분합니다). LAN 안에서만 쓴다는 전제입니다.
 */

import cors from 'cors';
import express from 'express';

import { getSummary, getTurns, insertTurns, resetConversation } from './db.js';
import { maybeSummarize } from './summarize.js';

const app = express();
app.use(cors());
app.use(express.json());

type ChatTurn = { role: 'user' | 'assistant'; content: string };

function isChatTurn(value: unknown): value is ChatTurn {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (v.role === 'user' || v.role === 'assistant') && typeof v.content === 'string';
}

app.get('/conversations/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const turns = getTurns(deviceId).map(({ role, content }) => ({ role, content }));
  const summary = getSummary(deviceId);
  res.json({ summary, turns });
});

app.post('/conversations/:deviceId/messages', (req, res) => {
  const { deviceId } = req.params;
  const turns = req.body?.turns;
  // 요약이 이름을 스스로 추측하다 대화 속 잘못된 이름을 사실로 굳히는 걸 막기
  // 위한 정답. 클라이언트가 지금 화면에 쓰고 있는 이름을 그대로 보내줍니다.
  const petName = typeof req.body?.petName === 'string' ? req.body.petName : undefined;

  if (!Array.isArray(turns) || turns.length === 0 || !turns.every(isChatTurn)) {
    res.status(400).json({ error: 'turns는 { role, content }[] 여야 합니다.' });
    return;
  }

  insertTurns(deviceId, turns);
  res.status(204).end();

  // 응답은 이미 나갔습니다 — 요약은 부가 작업이라 응답을 기다리게 하지 않습니다.
  void maybeSummarize(deviceId, petName);
});

app.post('/conversations/:deviceId/reset', (req, res) => {
  resetConversation(req.params.deviceId);
  res.status(204).end();
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.warn(`[memory-server] http://localhost:${port} 에서 대기 중`);
});

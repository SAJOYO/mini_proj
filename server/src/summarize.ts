/**
 * 대화 턴을 요약으로 압축합니다 (롱텀 메모리).
 *
 * 화면(chat.tsx)은 새로고침하면 항상 빈 대화로 시작합니다 — 즉 원문 턴을
 * 다시 보여줄 일이 없습니다. 그래서 이 파일은 새 턴이 들어올 때마다
 * **그때까지 쌓인 턴 전부**를 기존 요약에 즉시 흡수하고 지웁니다. 새로고침
 * 뒤에도 캐릭터가 "이전 대화를 기억"하는 건 화면에 남은 말풍선이 아니라
 * 이 요약 하나뿐입니다.
 *
 * `CHAT_*` 환경변수가 비어 있으면 조용히 건너뜁니다 — 요약이 안 된다고
 * 저장 자체까지 죽으면 안 됩니다. 그 경우 턴은 삭제되지 않고 쌓이기만
 * 합니다(요약을 못 할 뿐, 데이터가 사라지진 않습니다).
 *
 * `llm/client.ts`(앱 쪽)와 같은 OpenAI 호환 `/chat/completions` 포맷을 그대로
 * 씁니다. 서버가 별도 npm 패키지라 그 파일을 import하지 않고 필요한 부분만
 * 여기서 다시 구현합니다.
 */

import { deleteTurns, getSummary, getTurns, setSummary, type TurnRow } from './db.js';

function chatConfig(): { apiKey: string; model: string; baseUrl: string } | null {
  const apiKey = process.env.CHAT_API_KEY?.trim();
  const model = process.env.CHAT_MODEL?.trim();
  const baseUrl = process.env.CHAT_BASE_URL?.trim();
  if (!apiKey || !model || !baseUrl) return null;
  return { apiKey, model, baseUrl: baseUrl.replace(/\/+$/, '') };
}

async function foldIntoSummary(existing: string | null, turns: TurnRow[]): Promise<string | null> {
  const config = chatConfig();
  if (!config) return null;

  const transcript = turns
    .map((t) => `${t.role === 'user' ? '사용자' : '캐릭터'}: ${t.content}`)
    .join('\n');

  const prompt = [
    '다음은 사용자와 반려동물 캐릭터의 대화 중 오래된 부분이다.',
    existing ? `기존 요약:\n${existing}\n` : '',
    `새로 압축할 대화:\n${transcript}`,
    '',
    '기존 요약과 새 대화를 합쳐 하나의 한국어 요약으로 다시 써라.',
    '사용자가 언급한 이름, 취향, 사건, 감정 등 이후 대화에서 캐릭터가 기억해야 할',
    '사실만 남기고 잡담과 말투는 생략한다. 5문장 이내.',
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
    }),
  });

  if (!res.ok) {
    console.warn(`[summarize] LLM 요청 실패 (${res.status})`);
    return null;
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = payload.choices?.[0]?.message?.content?.trim();
  return text || null;
}

/**
 * 지금까지 쌓인 턴 전부를 요약에 흡수하고 삭제합니다.
 *
 * 실패해도 던지지 않습니다 — 호출부(POST /messages)가 저장 성공 응답을 이미
 * 돌려준 뒤에 벌어지는 부가 작업이라, 여기서 던지면 정상 저장까지 실패로
 * 보이게 됩니다. 실패 시 턴을 지우지 않으므로 다음 메시지가 올 때 다시
 * 시도됩니다 — 데이터가 사라지지 않습니다.
 */
export async function maybeSummarize(deviceId: string): Promise<void> {
  const turns = getTurns(deviceId);
  if (turns.length === 0) return;

  try {
    const existing = getSummary(deviceId);
    const merged = await foldIntoSummary(existing, turns);
    if (!merged) return;

    setSummary(deviceId, merged);
    deleteTurns(
      deviceId,
      turns.map((t) => t.id),
    );
  } catch (error) {
    console.warn('[summarize] 실패, 원문 턴을 그대로 둡니다:', error);
  }
}

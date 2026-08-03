/**
 * 대화 영속화 서버 호출.
 *
 * 화면이 없습니다 — 저장된 대화를 읽고, 새 턴을 붙이는 것까지가 전부입니다.
 * (`lib/comfy.ts`와 같은 이유로 화면 코드에서 분리)
 *
 * ## 서버는 우리 것이 아닙니다
 *
 * ComfyUI와 같은 성격입니다 — 팀 노트북에서 도는 `server/`에 그대로 붙습니다.
 * 주소는 `EXPO_PUBLIC_MEMORY_URL` 하나뿐입니다.
 *
 * ## 주소가 없거나 서버가 죽어 있어도 화면은 살아 있어야 합니다
 *
 * 대화 저장은 부가 기능이지 채팅의 필수 조건이 아닙니다. 팀이 아직 서버를
 * 안 띄웠거나 와이파이가 바뀌어 주소가 끊겼다고 채팅 자체가 막히면 안 되므로,
 * 이 파일의 함수들은 실패해도 던지지 않고 "저장 안 됨"에 해당하는 값을
 * 돌려줍니다. 호출부(`chat.tsx`)는 그 값을 "빈 대화로 시작"으로 취급합니다.
 */

import type { ChatTurn } from '@/lib/persona-chat/chat-client';

export type StoredConversation = { summary: string | null; turns: ChatTurn[] };

/** .env의 서버 주소. 끝의 슬래시는 떼어 둡니다. 없으면 null (기능을 조용히 끕니다). */
function baseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_MEMORY_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/+$/, '');
}

/**
 * 저장된 대화를 읽어옵니다.
 *
 * 주소가 없거나, 요청이 실패하거나, 응답이 이상해도 던지지 않고
 * `{ summary: null, turns: [] }`로 떨어집니다 — 새 대화로 시작하는 것과 같습니다.
 */
export async function fetchConversation(deviceId: string): Promise<StoredConversation> {
  const base = baseUrl();
  if (!base) return { summary: null, turns: [] };

  try {
    const res = await fetch(`${base}/conversations/${encodeURIComponent(deviceId)}`);
    if (!res.ok) return { summary: null, turns: [] };

    const data = (await res.json()) as Partial<StoredConversation>;
    if (!Array.isArray(data.turns)) return { summary: null, turns: [] };

    return { summary: data.summary ?? null, turns: data.turns };
  } catch (error) {
    console.warn('[memory] 대화 불러오기 실패, 새 대화로 시작합니다:', error);
    return { summary: null, turns: [] };
  }
}

/**
 * 새 턴을 저장소에 붙입니다.
 *
 * 실패해도 던지지 않습니다 — 호출부가 UI를 막지 않고 `void appendTurns(...)`로
 * fire-and-forget 하도록 설계했습니다. 저장이 한 번 안 됐다고 대화 자체를
 * 막을 이유가 없습니다.
 */
export async function appendTurns(
  deviceId: string,
  turns: ChatTurn[],
  /** 지금 화면에 쓰고 있는 반려동물 이름. 서버가 요약을 만들 때 이 이름을
   * 정답으로 삼아서, 대화 속 다른 이름이 사실로 굳어지는 걸 막습니다. */
  petName?: string,
): Promise<void> {
  const base = baseUrl();
  if (!base || turns.length === 0) return;

  try {
    const res = await fetch(`${base}/conversations/${encodeURIComponent(deviceId)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turns, petName }),
    });
    if (!res.ok) console.warn(`[memory] 저장 실패 (${res.status})`);
  } catch (error) {
    console.warn('[memory] 저장 요청 실패:', error);
  }
}

/** 저장된 대화를 지웁니다. 실패해도 던지지 않습니다("초기화" 버튼용으로 미리 열어둠). */
export async function resetConversation(deviceId: string): Promise<void> {
  const base = baseUrl();
  if (!base) return;

  try {
    await fetch(`${base}/conversations/${encodeURIComponent(deviceId)}/reset`, {
      method: 'POST',
    });
  } catch (error) {
    console.warn('[memory] 초기화 요청 실패:', error);
  }
}

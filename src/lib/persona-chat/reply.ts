/**
 * 모델 응답을 지문과 말로 가릅니다.
 *
 * 프롬프트가 "응답은 지문 하나로 시작한다. *별표* 안에 한 구절, 그 뒤에 말"
 * 을 강제하므로(system-prompt.ts 표현 전략), 파싱은 맨 앞의 `*...*` 하나만
 * 떼면 됩니다. 순서를 자유로 뒀다면 본문 중간의 별표까지 다 찾아야 했을
 * 텐데, 순서가 규칙이라 파서가 이 한 줄로 끝납니다.
 *
 * `*`는 전송 형식이지 화면에 보여줄 게 아닙니다. 화면은 이걸로 갈라서
 * 지문을 기울임(또는 나중에 애니메이션 큐)으로 처리하고 별표는 버립니다.
 *
 * 규칙을 안 지킨 응답(별표 없음, 안 닫힘)은 통째로 말로 취급합니다 —
 * 파서가 던지면 대사 한 줄 때문에 화면이 죽습니다.
 */
export type ParsedReply = {
  /** 맨 앞 지문. 별표는 제거된 상태. 없으면 null */
  action: string | null;
  /** 지문을 뺀 나머지 말 */
  speech: string;
};

export function parseReply(raw: string): ParsedReply {
  const text = raw.trim();
  if (!text.startsWith('*')) return { action: null, speech: text };

  const close = text.indexOf('*', 1);
  if (close === -1) return { action: null, speech: text };

  const action = text.slice(1, close).trim();
  const speech = text.slice(close + 1).trim();

  // 지문만 있고 말이 없는 응답도 유효합니다 — 침묵도 몸의 발화입니다.
  return { action: action || null, speech };
}

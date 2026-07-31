/**
 * LLM 호출 실패를 사용자에게 보여줄 한 문장으로 바꿉니다.
 *
 * ── 왜 원본을 그대로 안 쓰는가 ──────────────────────────
 * `llm/client.ts`는 서버 응답 본문을 800자까지 붙여서 던집니다. 디버깅에는 좋지만
 * 그대로 화면에 내보내면 한도 초과 한 번에 JSON 덩어리가 대화창을 덮습니다.
 * 실제로 그랬습니다.
 *
 * ── 왜 전부 "실패했어요"로 뭉개지 않는가 ────────────────
 * 사용자가 할 수 있는 일이 상황마다 다릅니다.
 *   한도    → 기다리면 됨
 *   키      → 개발자가 .env 를 고쳐야 함
 *   네트워크 → 연결을 확인
 * 대응이 갈리는 것만 구분하고 나머지는 하나로 묶습니다.
 *
 * ── retryable 이 화면을 가릅니다 ───────────────────────
 * true 면 잠깐 떴다 사라지는 안내로, false 면 말풍선으로 남깁니다.
 * 기다리면 되는 오류를 대화 기록에 남기면 캐릭터가 그 말을 한 것처럼 보이고,
 * 다음 요청의 히스토리에도 섞입니다.
 *
 * 이 파일은 react-native 를 import 하지 않습니다. 그래야 `npm run test:persona`
 * (tsx/esbuild)가 읽을 수 있습니다.
 */

export type FailureMessage = {
  /** 화면에 그대로 뜨는 문장. */
  text: string;
  /** 다시 시도하면 될 만한 오류인가. */
  retryable: boolean;
};

export function describeFailure(error: unknown): FailureMessage {
  const raw = error instanceof Error ? error.message : String(error);

  if (/\(429\)|RESOURCE_EXHAUSTED|rate.?limit/i.test(raw)) {
    return { text: '지금 너무 많이 불렀어요. 잠깐 뒤에 다시 말 걸어주세요.', retryable: true };
  }
  if (/\(401\)|\(403\)|API key|PERMISSION_DENIED|UNAUTHENTICATED|INVALID_ARGUMENT/i.test(raw)) {
    return { text: 'API 키에 문제가 있어요. .env 를 확인해 주세요.', retryable: false };
  }
  if (/Network request failed|Failed to fetch|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(raw)) {
    return { text: '인터넷 연결을 확인해 주세요.', retryable: true };
  }
  return { text: '지금은 대답할 수 없어요. 잠시 뒤에 다시 시도해 주세요.', retryable: true };
}

/** 대화용 키가 아직 없을 때. */
export const NO_CHAT_KEY = '아직 대화 준비가 안 됐어요. (대화용 API 키가 필요합니다)';

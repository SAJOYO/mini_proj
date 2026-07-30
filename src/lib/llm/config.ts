/**
 * LLM 설정 — 앱과 스크립트가 공유하는 한 곳.
 *
 * ── 왜 이 파일이 따로 있는가 ──────────────────────────
 * Expo는 환경변수를 실행 중에 읽지 않습니다. 빌드할 때 소스 코드에 대고
 * **찾아 바꾸기**를 합니다. `babel-preset-expo`의 `inline-env-vars` 플러그인이
 * `process.env.EXPO_PUBLIC_XXX` 라는 **글자**를 찾아 값으로 치환합니다.
 *
 * 그래서 두 가지 제약이 생깁니다.
 *
 *   1. 이름에 `EXPO_PUBLIC_` 접두사가 있어야 합니다. 없으면 치환 대상이
 *      아니고, 앱에서는 존재하지 않는 값이 됩니다.
 *   2. 이름을 **소스에 문자 그대로** 적어야 합니다. `process.env[name]` 처럼
 *      변수로 접근하면 찾을 글자가 없어서 조용히 `undefined`가 됩니다.
 *      에러도 안 납니다 — 키를 넣었는데 안 먹는 것처럼 보입니다.
 *
 * 그래서 아래 `RAW`가 이름을 하나씩 손으로 나열합니다. 함수로 묶을 수 없습니다.
 * 나열을 끝낸 뒤부터는 순수 함수로 처리하므로, 테스트는 가짜 레코드를 넣어
 * 돌릴 수 있습니다.
 *
 * ── ⚠️ 이 값들은 번들에 그대로 박힙니다 ────────────────
 * 프로덕션 빌드에서는 값이 리터럴로 치환됩니다. 앱을 설치한 사람이 번들을
 * 열어보면 키가 보입니다. README의 API 키 섹션 **B안**(각자 키를 넣고 발표용
 * 으로만 쓰고, 끝나면 폐기) 조건에서만 쓰세요.
 *
 * 프록시를 두는 A안으로 옮길 때는 `BASE_URL`을 프록시 주소로 바꾸고 키를
 * 비우면 됩니다. 이 파일과 클라이언트 코드는 그대로 둡니다.
 */

import type { StructuredOutputMode } from '@/lib/breed-inference/types';

/** 한 용도(판정 / 대화)에 필요한 설정 한 벌. */
export type LlmTarget = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  model: string;
  structuredOutput: StructuredOutputMode;
};

const STRUCTURED_OUTPUT_MODES: readonly StructuredOutputMode[] = [
  'json_schema',
  'json_object',
  'prompt',
];

/**
 * 정적으로 나열한 환경변수.
 *
 * 위 설명대로 이 나열은 손으로 유지해야 합니다. 여기 없는 이름은 앱에서
 * 읽히지 않습니다. 항목을 추가하면 `.env.example`에도 같이 적어주세요.
 *
 * 판정과 대화를 나눈 이유는 요구가 다르기 때문입니다.
 *   판정  사진에서 품종을 읽는 일. 이미지 이해만 되면 되고 출력은 JSON
 *         한 줄입니다. 작은 비전 모델로 충분합니다.
 *   대화  성격을 연기하는 일. 말버릇·말수·억제 지시를 동시에 지켜야 합니다.
 *         작은 모델은 지시를 앞쪽만 반영하고 뒤쪽을 흘립니다.
 *
 * 실측: Qwen3-VL-8B은 판정은 제대로 했지만 대화에서 "짧게 답한다"와
 * "마음을 잘 드러내지 않는다"를 둘 다 무시했습니다. gemini-3.1-flash-lite는
 * 같은 프롬프트로 전부 지켰습니다. 그래서 설정을 갈라둡니다.
 */
const RAW = {
  visionApiKey: process.env.EXPO_PUBLIC_VISION_API_KEY,
  visionModel: process.env.EXPO_PUBLIC_VISION_MODEL,
  visionBaseUrl: process.env.EXPO_PUBLIC_VISION_BASE_URL,
  visionStructuredOutput: process.env.EXPO_PUBLIC_VISION_STRUCTURED_OUTPUT,
  chatApiKey: process.env.EXPO_PUBLIC_CHAT_API_KEY,
  chatModel: process.env.EXPO_PUBLIC_CHAT_MODEL,
  chatBaseUrl: process.env.EXPO_PUBLIC_CHAT_BASE_URL,
} as const;

/** `RAW`와 같은 모양. 테스트가 가짜 값을 넣을 때 씁니다. */
export type RawLlmEnv = Partial<Record<keyof typeof RAW, string | undefined>>;

/**
 * 빈 문자열을 `undefined`로 바꿉니다.
 *
 * `??`가 아니라 `||`인 게 중요합니다. `.env`에 `EXPO_PUBLIC_CHAT_MODEL=`처럼
 * 이름만 남겨두는 일이 흔한데, 그때 값은 `undefined`가 아니라 빈 문자열입니다.
 * `??`로 두면 빈 문자열이 "설정됨"으로 통과해서, 모델명 없이 요청을 보내고
 * 서버에서 알아보기 힘든 에러를 받습니다.
 */
const clean = (value: string | undefined): string | undefined => value?.trim() || undefined;

export const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/**
 * 구조화 출력 모드를 해석합니다. 알 수 없는 값은 기본값으로 떨어집니다.
 *
 * 앱에서는 던지지 않습니다. 오타 하나로 화면이 아예 안 뜨는 게 더 나쁩니다.
 * 스크립트 쪽은 CLI라 엄격하게 검사합니다 (`scripts/llm-env.ts`).
 */
export function resolveStructuredOutput(raw: string | undefined): StructuredOutputMode {
  const value = clean(raw);
  if (!value) return 'json_schema';
  return STRUCTURED_OUTPUT_MODES.includes(value as StructuredOutputMode)
    ? (value as StructuredOutputMode)
    : 'json_schema';
}

/** 검증 없이 값만 골라냅니다. 스크립트 쪽에서 엄격 검사에 재사용합니다. */
export function readStructuredOutputRaw(env: RawLlmEnv = RAW): string | undefined {
  return clean(env.visionStructuredOutput);
}

/**
 * 사진 판정에 쓸 설정. 하나라도 비어 있으면 `null`입니다.
 *
 * 던지지 않고 `null`을 주는 게 의도입니다. 모듈을 읽는 시점에 예외가 나면
 * 앱이 흰 화면으로 죽습니다. 화면 쪽에서 `null`을 받아 "키 미설정" 안내를
 * 띄우면 왜 안 되는지가 사용자에게 보입니다.
 */
export function visionTarget(env: RawLlmEnv = RAW): LlmTarget | null {
  const apiKey = clean(env.visionApiKey);
  const model = clean(env.visionModel);
  if (!apiKey || !model) return null;

  return {
    apiKey,
    model,
    baseUrl: clean(env.visionBaseUrl) ?? DEFAULT_BASE_URL,
    structuredOutput: resolveStructuredOutput(env.visionStructuredOutput),
  };
}

/**
 * 대화에 쓸 설정. 하나라도 비어 있으면 `null`입니다.
 *
 * `structuredOutput`은 대화 클라이언트가 쓰지 않지만, 타입을 하나로 유지하려고
 * 채워 둡니다. 전에는 `CHAT_STRUCTURED_OUTPUT`이라는 별도 변수를 읽었는데
 * 아무도 쓰지 않았고, 그 값의 오타 때문에 대화가 죽는 일만 생겼습니다.
 */
export function chatTarget(env: RawLlmEnv = RAW): LlmTarget | null {
  const apiKey = clean(env.chatApiKey);
  const model = clean(env.chatModel);
  if (!apiKey || !model) return null;

  return {
    apiKey,
    model,
    baseUrl: clean(env.chatBaseUrl) ?? DEFAULT_BASE_URL,
    structuredOutput: 'json_schema',
  };
}

/** 어느 설정으로 돌고 있는지 한 줄로. 키는 절대 찍지 않습니다. */
export const describeTarget = (t: LlmTarget): string => `${t.model}  @ ${t.baseUrl}`;

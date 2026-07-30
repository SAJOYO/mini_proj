/// <reference types="node" />

/**
 * 스크립트가 쓰는 LLM 설정 읽기.
 *
 * ── 앱과 무엇이 다른가 ────────────────────────────────
 * 값의 출처와 이름은 앱(`src/lib/llm/config.ts`)과 **같습니다.** `.env` 하나로
 * 앱과 스크립트를 같이 먹이는 게 목적입니다. 전에는 같은 키를 `.env`와
 * `.env.persona` 두 곳에 적어야 했습니다.
 *
 * 다른 점은 두 가지뿐입니다.
 *
 *   1. 여기는 Node라서 `process.env[name]` 동적 접근이 됩니다. 앱에서는
 *      빌드 시점 치환 때문에 안 됩니다 (config.ts 맨 위 설명 참고).
 *   2. 없거나 잘못된 값을 만나면 **던집니다.** CLI는 한 줄 에러로 죽는 게
 *      맞습니다. 앱은 `null`을 받아 "키 미설정" 안내를 띄웁니다.
 *
 * 판정과 대화를 왜 나누는지는 `src/lib/llm/config.ts`의 `RAW` 설명에 있습니다.
 */

import type { StructuredOutputMode } from '@/lib/breed-inference/types';
import {
  DEFAULT_BASE_URL,
  describeTarget as describeTargetShared,
  type LlmTarget,
} from '@/lib/llm/config';

export type { LlmTarget };

const STRUCTURED_OUTPUT_MODES: StructuredOutputMode[] = ['json_schema', 'json_object', 'prompt'];

/** 빈 문자열은 "설정되지 않음"으로 봅니다. 이유는 config.ts의 `clean` 설명 참고. */
const read = (name: string): string | undefined => process.env[name]?.trim() || undefined;

/**
 * `EXPO_PUBLIC_` 이름을 먼저 보고, 없으면 접두사 없는 옛 이름으로 떨어집니다.
 *
 * 옛 이름은 **전환용 별칭**입니다. 앱은 `EXPO_PUBLIC_`만 읽을 수 있으므로,
 * `.env`를 새 이름으로 옮긴 뒤에는 이 폴백을 지워도 됩니다.
 */
function pick(name: string): string | undefined {
  return read(`EXPO_PUBLIC_${name}`) ?? read(name);
}

function resolveStructuredOutputStrict(raw: string | undefined): StructuredOutputMode {
  if (!raw) return 'json_schema';
  if ((STRUCTURED_OUTPUT_MODES as string[]).includes(raw)) return raw as StructuredOutputMode;
  throw new Error(
    `EXPO_PUBLIC_VISION_STRUCTURED_OUTPUT은 ${STRUCTURED_OUTPUT_MODES.join(' / ')} 중 ` +
      `하나여야 합니다: ${raw}`,
  );
}

function target(prefix: 'VISION' | 'CHAT', label: string): LlmTarget {
  const apiKey = pick(`${prefix}_API_KEY`);
  const model = pick(`${prefix}_MODEL`);

  if (!apiKey) {
    throw new Error(`${label} 키가 없습니다. .env에 EXPO_PUBLIC_${prefix}_API_KEY 를 넣으세요.`);
  }
  if (!model) {
    throw new Error(`${label} 모델이 없습니다. .env에 EXPO_PUBLIC_${prefix}_MODEL 을 넣으세요.`);
  }

  return {
    apiKey,
    model,
    baseUrl: pick(`${prefix}_BASE_URL`) ?? DEFAULT_BASE_URL,
    // 구조화 출력은 판정에만 의미가 있습니다. 대화 클라이언트는 이 필드를 받지
    // 않으므로, 대화 쪽에서 굳이 읽어와 오타로 죽을 여지를 만들지 않습니다.
    structuredOutput:
      prefix === 'VISION'
        ? resolveStructuredOutputStrict(pick('VISION_STRUCTURED_OUTPUT'))
        : 'json_schema',
  };
}

/** 사진 판정에 쓸 설정. */
export const visionTarget = (): LlmTarget => target('VISION', '판정용');

/** 대화에 쓸 설정. */
export const chatTarget = (): LlmTarget => target('CHAT', '대화용');

/** 어느 설정으로 돌고 있는지 한 줄로. 키는 찍지 않습니다. */
export const describeTarget = describeTargetShared;

/// <reference types="node" />

/**
 * 스크립트가 쓰는 LLM 설정 읽기.
 *
 * ── 왜 판정과 대화를 나누는가 ──────────────────────────────
 * 두 용도가 요구하는 게 다릅니다.
 *
 *   판정  사진에서 품종을 읽는 일. 이미지 이해만 되면 되고, 출력은 JSON 한 줄
 *         입니다. 작은 비전 모델로 충분합니다.
 *   대화  성격을 연기하는 일. 말버릇·말수·억제 지시를 동시에 지켜야 합니다.
 *         작은 모델은 지시를 앞쪽만 반영하고 뒤쪽을 흘립니다.
 *
 * 실측하면 Qwen3-VL-8B은 판정은 제대로 하는데 대화에서는 "짧게 답한다"와
 * "마음을 잘 드러내지 않는다"를 둘 다 무시했습니다. 같은 모델을 쓸 이유가
 * 없어서 설정을 갈라뒀습니다. 싼 모델로 판정하고 좋은 모델로 대화하면 됩니다.
 *
 * ── 폴백 ─────────────────────────────────────────────
 * `VISION_*` / `CHAT_*`이 없으면 `LLM_*`로 떨어집니다. 기존 `.env`를 안 고쳐도
 * 그대로 동작하고, 한쪽만 새로 지정해도 됩니다.
 */

import type { StructuredOutputMode } from '@/lib/breed-inference/types';

export type LlmTarget = {
  apiKey: string;
  baseUrl: string;
  model: string;
  structuredOutput: StructuredOutputMode;
};

const STRUCTURED_OUTPUT_MODES: StructuredOutputMode[] = ['json_schema', 'json_object', 'prompt'];

const read = (name: string): string | undefined => process.env[name]?.trim() || undefined;

/** `PREFIX_NAME`을 먼저 보고, 없으면 `LLM_NAME`으로 떨어집니다. */
function pick(prefix: string, name: string): string | undefined {
  return read(`${prefix}_${name}`) ?? read(`LLM_${name}`);
}

function resolveStructuredOutput(raw: string | undefined): StructuredOutputMode {
  if (!raw) return 'json_schema';
  if ((STRUCTURED_OUTPUT_MODES as string[]).includes(raw)) return raw as StructuredOutputMode;
  throw new Error(
    `STRUCTURED_OUTPUT은 ${STRUCTURED_OUTPUT_MODES.join(' / ')} 중 하나여야 합니다: ${raw}`,
  );
}

function target(prefix: 'VISION' | 'CHAT', label: string): LlmTarget {
  const apiKey = pick(prefix, 'API_KEY');
  const model = pick(prefix, 'MODEL');

  if (!apiKey) throw new Error(`${label} 키가 없습니다. ${prefix}_API_KEY 또는 LLM_API_KEY 필요.`);
  if (!model) throw new Error(`${label} 모델이 없습니다. ${prefix}_MODEL 또는 LLM_MODEL 필요.`);

  return {
    apiKey,
    model,
    baseUrl: pick(prefix, 'BASE_URL') ?? 'https://api.openai.com/v1',
    structuredOutput: resolveStructuredOutput(pick(prefix, 'STRUCTURED_OUTPUT')),
  };
}

/** 사진 판정에 쓸 설정. `VISION_*` → `LLM_*` */
export const visionTarget = (): LlmTarget => target('VISION', '판정용');

/** 대화에 쓸 설정. `CHAT_*` → `LLM_*` */
export const chatTarget = (): LlmTarget => target('CHAT', '대화용');

/** 어느 설정으로 돌고 있는지 한 줄로. 키는 찍지 않습니다. */
export const describeTarget = (t: LlmTarget): string => `${t.model}  @ ${t.baseUrl}`;

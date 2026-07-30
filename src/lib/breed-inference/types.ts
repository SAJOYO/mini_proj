import type { BreedMix } from '@/constants/persona';
import { BREEDS, type BreedId } from '@/constants/pet';

/** LLM 추론 후보. `neutral`은 애플리케이션 fallback이므로 제외합니다. */
export type InferableBreedId = Exclude<BreedId, 'neutral'>;

/** 캐릭터가 실제 지원하는 품종에서 추론 후보를 자동으로 만듭니다. */
export const INFERABLE_BREED_IDS = (Object.keys(BREEDS) as BreedId[]).filter(
  (id): id is InferableBreedId => id !== 'neutral',
);

export type BreedMixResponse = {
  mix: {
    breed: InferableBreedId;
    ratio: number;
  }[];
};

export type VisionImageInput = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64: string;
};

export type GenerateStructuredInput = {
  model: string;
  image: VisionImageInput;
  prompt: string;
  schema: Record<string, unknown>;
};

/**
 * 서버가 출력 형식을 어디까지 강제해줄 수 있는지.
 *
 * Chat Completions 형식을 말하는 서버는 많지만, 구조화 출력 지원은 제각각입니다.
 * 여기서 갈리기 때문에 이 값만 바꿔서 서버를 옮겨 다닐 수 있게 해둡니다.
 *
 *   json_schema  스키마 자체를 서버가 강제합니다. 가장 안전합니다.
 *                OpenAI, Together, 일부 Hugging Face Inference Provider.
 *   json_object  "유효한 JSON"까지만 강제하고 모양은 안 봅니다.
 *                스키마는 프롬프트로 전달됩니다.
 *   prompt       서버가 아무것도 강제하지 않습니다. 전부 프롬프트로 부탁하고
 *                응답에서 JSON을 긁어냅니다. 직접 띄운 오픈 모델(TGI·vLLM·
 *                Ollama·llama.cpp)에서 스키마 강제가 안 될 때 씁니다.
 *
 * 어느 값이든 응답 파싱은 관대하게 동작하므로, 확실치 않으면 `prompt`로
 * 시작해서 되는 걸 확인한 뒤 올려도 됩니다.
 */
export type StructuredOutputMode = 'json_schema' | 'json_object' | 'prompt';

/** 공급자별 비전 LLM 요청 형식을 이 인터페이스 뒤로 숨깁니다. */
export interface VisionLlmClient {
  generateStructured(input: GenerateStructuredInput): Promise<unknown>;
}

export type InferBreedMixInput = {
  model: string;
  image: VisionImageInput;
};

export type InferBreedMixResult = {
  mix: BreedMix;
  elapsedMs: number;
};

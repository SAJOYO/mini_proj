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

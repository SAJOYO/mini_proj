import type { BreedMix } from '@/constants/persona';

import type { InferableBreedId } from '@/constants/breed-catalog';

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

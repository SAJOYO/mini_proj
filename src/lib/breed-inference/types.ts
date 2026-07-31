import type { BreedMix } from '@/lib/persona';
import { BREEDS, type BreedId } from '@/constants/pet';

/** LLM 추론 후보. `neutral`은 애플리케이션 fallback이므로 제외합니다. */
export type InferableBreedId = Exclude<BreedId, 'neutral'>;

/** 캐릭터가 실제 지원하는 품종에서 추론 후보를 자동으로 만듭니다. */
export const INFERABLE_BREED_IDS = (Object.keys(BREEDS) as BreedId[]).filter(
  (id): id is InferableBreedId => id !== 'neutral',
);

export type BreedMixResponse = {
  /** 품종을 고르기 전에 적은 얼굴 관찰. 표시용이라 없을 수도 있습니다. */
  face?: string;
  mix: {
    breed: InferableBreedId;
    ratio: number;
    /** 이 품종을 고른 근거 한 문장. 표시용이라 없을 수도 있습니다. */
    reason?: string;
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
 * 서버가 출력 형식을 어디까지 강제해줄 수 있는지는 전송층의 관심사라
 * `llm/structured.ts`가 정의합니다. 여기서는 편의상 다시 내보내기만 합니다.
 */
export type { StructuredOutputMode } from '@/lib/llm/structured';

/** 공급자별 비전 LLM 요청 형식을 이 인터페이스 뒤로 숨깁니다. */
export interface VisionLlmClient {
  generateStructured(input: GenerateStructuredInput): Promise<unknown>;
}

export type InferBreedMixInput = {
  model: string;
  image: VisionImageInput;
};

/**
 * 판정 결과.
 *
 * `face`와 `reasons`가 `mix` 밖에 있는 이유: `persona`의 `resolveMix()`가
 * 항목을 `{breed, ratio}` 로 **재구성**하기 때문에 mix 안에 넣으면 사라집니다.
 * 그리고 이 둘은 화면에 보여주는 재료일 뿐, 성격 계산에는 쓰이지 않습니다.
 * 페르소나 계약(`BreedMix`)을 건드리지 않으려고 밖에 얹었습니다.
 */
export type InferBreedMixResult = {
  mix: BreedMix;
  /** 얼굴 관찰. 결과 화면이 "왜 이 동물인가"를 보여줄 때 씁니다. 비어 있을 수 있습니다. */
  face: string;
  /** breedId → 근거 한 문장. 모델이 안 주면 그 품종 키는 없습니다. */
  reasons: Partial<Record<InferableBreedId, string>>;
  elapsedMs: number;
  /** 유효한 응답을 받기까지 걸린 호출 횟수. 1이면 첫 시도에 성공했습니다. */
  attempts: number;
};

import type { BreedMix } from '@/constants/persona';
import { INFERABLE_BREED_IDS, type InferableBreedId } from '@/lib/breed-inference/types';

const inferableIds = new Set<string>(INFERABLE_BREED_IDS);

export class BreedMixValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BreedMixValidationError';
  }
}

/**
 * LLM의 구조화된 출력이 추론 계약에 맞는지 엄격하게 검사합니다.
 *
 * 병합·정규화·정렬은 하지 않습니다. 그 책임은 `persona.ts/resolveMix()`에 있습니다.
 * 직접 테스트에서 실패를 숨기지 않도록 `neutral` fallback도 만들지 않습니다.
 */
export function parseBreedMixResponse(raw: unknown): BreedMix {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BreedMixValidationError('응답은 mix 필드를 가진 객체여야 합니다.');
  }

  const mix = (raw as { mix?: unknown }).mix;
  if (!Array.isArray(mix) || mix.length === 0) {
    throw new BreedMixValidationError('mix는 하나 이상의 항목을 가진 배열이어야 합니다.');
  }

  if (mix.length > 3) {
    throw new BreedMixValidationError('품종은 최대 3개까지 허용됩니다.');
  }

  const seen = new Set<InferableBreedId>();
  const parsed: BreedMix = [];

  for (const [index, item] of mix.entries()) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new BreedMixValidationError(`mix[${index}]가 객체가 아닙니다.`);
    }

    const { breed, ratio } = item as { breed?: unknown; ratio?: unknown };
    if (typeof breed !== 'string' || !inferableIds.has(breed)) {
      throw new BreedMixValidationError(`mix[${index}].breed가 허용된 품종이 아닙니다.`);
    }
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) {
      throw new BreedMixValidationError(`mix[${index}].ratio는 양의 유한 숫자여야 합니다.`);
    }

    const id = breed as InferableBreedId;
    if (seen.has(id)) {
      throw new BreedMixValidationError(`mix[${index}].breed가 중복되었습니다.`);
    }
    seen.add(id);
    parsed.push({ breed: id, ratio });
  }

  return parsed;
}

import { INFERABLE_BREED_IDS, type InferableBreedId } from '@/constants/breed-catalog';
import type { BreedMix } from '@/constants/persona';

const inferableIds = new Set<string>(INFERABLE_BREED_IDS);

export class BreedMixValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BreedMixValidationError';
  }
}

/**
 * LLM의 구조화된 출력을 검증하고 정수 비율 합계가 정확히 100인 `BreedMix`로 바꿉니다.
 *
 * 직접 테스트에서 실패를 숨기지 않도록 여기서는 `neutral` fallback을 만들지 않습니다.
 */
export function validateBreedMixResponse(raw: unknown): BreedMix {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BreedMixValidationError('응답은 mix 필드를 가진 객체여야 합니다.');
  }

  const mix = (raw as { mix?: unknown }).mix;
  if (!Array.isArray(mix) || mix.length === 0) {
    throw new BreedMixValidationError('mix는 하나 이상의 항목을 가진 배열이어야 합니다.');
  }

  const merged = new Map<InferableBreedId, number>();

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
    merged.set(id, (merged.get(id) ?? 0) + ratio);
  }

  if (merged.size > 3) {
    throw new BreedMixValidationError('품종은 최대 3개까지 허용됩니다.');
  }

  return normalizeToIntegerPercent([...merged].map(([breed, ratio]) => ({ breed, ratio })));
}

/**
 * 모든 항목에 최소 1%를 보장하면서 합계를 정확히 100으로 맞춥니다.
 * 나머지는 소수부가 큰 항목부터 1씩 배분하므로 같은 입력은 항상 같은 결과를 냅니다.
 */
function normalizeToIntegerPercent(items: { breed: InferableBreedId; ratio: number }[]): BreedMix {
  const sorted = [...items].sort((a, b) => b.ratio - a.ratio);
  const total = sorted.reduce((sum, item) => sum + item.ratio, 0);
  const distributable = 100 - sorted.length;
  const scaled = sorted.map((item, index) => {
    const exact = 1 + (item.ratio / total) * distributable;
    const floor = Math.floor(exact);
    return { ...item, index, ratio: floor, fraction: exact - floor };
  });

  let remainder = 100 - scaled.reduce((sum, item) => sum + item.ratio, 0);
  const byFraction = [...scaled].sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder; i++) {
    byFraction[i].ratio += 1;
  }

  return scaled.map(({ breed, ratio }) => ({ breed, ratio })).sort((a, b) => b.ratio - a.ratio);
}

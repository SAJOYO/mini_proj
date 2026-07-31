import type { BreedMix } from '@/lib/persona';
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

/** 화면에 보여줄 텍스트. 판정 성립에는 관여하지 않습니다. */
export type BreedMixDisplayText = {
  face: string;
  reasons: Partial<Record<InferableBreedId, string>>;
};

/**
 * 응답에서 표시용 텍스트(`face`·`reason`)만 뽑아냅니다.
 *
 * 위 `parseBreedMixResponse`와 달리 **하나도 못 찾아도 던지지 않습니다.**
 * 일부러 다르게 만든 겁니다. 품종 비율이 없으면 캐릭터를 못 만들지만,
 * 근거 문장이 없다고 캐릭터를 못 만들 이유는 없습니다. 여기서 던지면
 * 설명 한 줄 때문에 재시도가 돌고, 3회를 다 쓰면 판정 자체가 실패합니다.
 *
 * 그래서 이 함수는 있으면 가져오고 없으면 비워둡니다. 화면 쪽에서 빈 값을
 * 처리하세요.
 */
export function extractDisplayText(raw: unknown): BreedMixDisplayText {
  const empty: BreedMixDisplayText = { face: '', reasons: {} };
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return empty;

  const { face, mix } = raw as { face?: unknown; mix?: unknown };
  const reasons: Partial<Record<InferableBreedId, string>> = {};

  if (Array.isArray(mix)) {
    for (const item of mix) {
      if (typeof item !== 'object' || item === null) continue;
      const { breed, reason } = item as { breed?: unknown; reason?: unknown };
      if (typeof breed !== 'string' || !inferableIds.has(breed)) continue;
      if (typeof reason !== 'string' || !reason.trim()) continue;
      reasons[breed as InferableBreedId] = reason.trim();
    }
  }

  return { face: typeof face === 'string' ? face.trim() : '', reasons };
}

import { resolveMix } from '@/lib/persona';
import { BREED_INFERENCE_PROMPT, BREED_MIX_JSON_SCHEMA } from '@/lib/breed-inference/prompt';
import type {
  InferBreedMixInput,
  InferBreedMixResult,
  VisionLlmClient,
} from '@/lib/breed-inference/types';
import { BreedMixValidationError, parseBreedMixResponse } from '@/lib/breed-inference/validate';

/**
 * 유효한 응답을 받기까지 시도할 최대 횟수 (첫 시도 1회 + 재시도 2회).
 *
 * 판정은 사용자당 한 번만 일어나고, 그 결과가 그 사람의 캐릭터로 굳습니다.
 * 그래서 실패를 흘려보낼 수 없습니다 — 실패하면 캐릭터를 못 받습니다.
 *
 * 실측하면 로스터에 없는 품종을 지어내는 일이 3회 중 1회쯤 생깁니다
 * (핏불 사진에 `pitbull`을 적어버리는 식). 시도당 성공률을 2/3으로 보면
 * 3회까지 갔을 때 실패 확률은 4% 아래로 내려갑니다.
 *
 * 반대로 "더 나은 답"을 고르려고 여러 번 돌리는 게 아닙니다. 첫 유효 응답을
 * 그대로 씁니다. `temperature`를 못 쓰는 데다 재판정도 하지 않으니, 회차마다
 * 2·3순위 순서가 조금 달라지는 건 결함이 아니라 그 사용자의 결과입니다.
 */
const MAX_ATTEMPTS = 3;

/** 규칙을 어긴 직후에는 무엇을 어겼는지 알려주고 다시 물어봅니다. */
function retryPrompt(reason: string): string {
  return [
    BREED_INFERENCE_PROMPT,
    '',
    '[재시도]',
    `직전 응답이 규칙을 위반했다: ${reason}`,
    '[품종 집합]에 적힌 ID만 사용하고, 정확히 3개를 채워라.',
  ].join('\n');
}

/** 사진 한 장을 실제 `BreedMix`로 변환합니다. */
export async function inferBreedMix(
  input: InferBreedMixInput,
  client: VisionLlmClient,
): Promise<InferBreedMixResult> {
  const startedAt = Date.now();
  let lastReason = '';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    // 네트워크·서버 오류는 재시도 대상이 아니라 그대로 올려보냅니다.
    const raw = await client.generateStructured({
      model: input.model,
      image: input.image,
      prompt: attempt === 1 ? BREED_INFERENCE_PROMPT : retryPrompt(lastReason),
      schema: BREED_MIX_JSON_SCHEMA,
    });

    try {
      return {
        mix: resolveMix(parseBreedMixResponse(raw)),
        elapsedMs: Date.now() - startedAt,
        attempts: attempt,
      };
    } catch (error) {
      if (!(error instanceof BreedMixValidationError)) throw error;
      lastReason = error.message;
    }
  }

  throw new BreedMixValidationError(
    `${MAX_ATTEMPTS}회 시도했지만 유효한 품종 혼합을 받지 못했습니다. 마지막 위반: ${lastReason}`,
  );
}

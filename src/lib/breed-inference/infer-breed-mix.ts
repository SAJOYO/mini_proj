import { BREED_INFERENCE_PROMPT, BREED_MIX_JSON_SCHEMA } from '@/lib/breed-inference/prompt';
import type {
  InferBreedMixInput,
  InferBreedMixResult,
  VisionLlmClient,
} from '@/lib/breed-inference/types';
import { validateBreedMixResponse } from '@/lib/breed-inference/validate';

/** 사진 한 장을 실제 `BreedMix`로 변환합니다. */
export async function inferBreedMix(
  input: InferBreedMixInput,
  client: VisionLlmClient,
): Promise<InferBreedMixResult> {
  const startedAt = Date.now();
  const raw = await client.generateStructured({
    model: input.model,
    image: input.image,
    prompt: BREED_INFERENCE_PROMPT,
    schema: BREED_MIX_JSON_SCHEMA,
  });

  return {
    mix: validateBreedMixResponse(raw),
    elapsedMs: Date.now() - startedAt,
  };
}

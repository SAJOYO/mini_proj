/// <reference types="node" />

/**
 * 사진 한 장을 판정해서 품종 혼합과 성격을 JSON 으로 찍는 스크립트.
 *
 *   npm run persona:infer -- <사진 경로>
 */

import { createCharacterFromPhoto } from '@/lib/pipeline';
import { describeTarget, visionTarget } from './llm-env';
import { readImageInput } from './read-image';

async function main() {
  const imageArg = process.argv[2];
  if (!imageArg) {
    throw new Error('사용법: npm run persona:infer -- <사진 경로>');
  }

  const vision = visionTarget();
  process.stderr.write(`판정: ${describeTarget(vision)}\n`);

  const image = await readImageInput(imageArg);
  const { card, inference } = await createCharacterFromPhoto(image, vision);

  process.stdout.write(
    `${JSON.stringify(
      {
        elapsedMs: inference.elapsedMs,
        // 1보다 크면 모델이 로스터 밖 품종을 냈다는 뜻입니다.
        // 서버가 enum 을 강제해주는지 확인하는 지표로 씁니다.
        attempts: inference.attempts,
        face: inference.face,
        // reasons 는 추론 가능한 품종만 키로 갖습니다(neutral 제외).
        // mix 에는 fallback 으로 neutral 이 들어올 수 있어서 안전하게 찾습니다.
        mix: inference.mix.map((m) => ({
          ...m,
          reason: (inference.reasons as Record<string, string | undefined>)[m.breed] ?? null,
        })),
        persona: {
          archetype: card.archetype,
          description: card.description,
          axes: card.axes,
          bands: card.bands,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

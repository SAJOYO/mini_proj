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
        attempts: inference.attempts,
        mix: inference.mix,
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

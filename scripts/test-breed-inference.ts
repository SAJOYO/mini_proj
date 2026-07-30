/// <reference types="node" />

import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { synthesize } from '@/lib/persona';
import { inferBreedMix } from '@/lib/breed-inference/infer-breed-mix';
import { ChatCompletionsVisionClient } from '@/lib/breed-inference/chat-completions-client';
import type { VisionImageInput } from '@/lib/breed-inference/types';
import { describeTarget, visionTarget } from './llm-env';

const MIME_BY_EXTENSION: Record<string, VisionImageInput['mimeType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

async function main() {
  const imageArg = process.argv[2];
  if (!imageArg) {
    throw new Error('사용법: npm run persona:infer -- <사진 경로>');
  }

  const { apiKey, baseUrl, model, structuredOutput } = visionTarget();
  const imagePath = resolve(imageArg);
  const mimeType = MIME_BY_EXTENSION[extname(imagePath).toLowerCase()];
  if (!mimeType) {
    throw new Error('지원하는 이미지 형식은 jpg, jpeg, png, webp입니다.');
  }

  const image = await readFile(imagePath);
  const client = new ChatCompletionsVisionClient({ apiKey, baseUrl, structuredOutput });
  process.stderr.write(`판정: ${describeTarget(visionTarget())}
`);
  const result = await inferBreedMix(
    {
      model,
      image: {
        mimeType,
        base64: image.toString('base64'),
      },
    },
    client,
  );
  const persona = synthesize(result.mix);

  process.stdout.write(
    `${JSON.stringify(
      {
        elapsedMs: result.elapsedMs,
        attempts: result.attempts,
        mix: result.mix,
        persona: {
          archetype: persona.archetype,
          description: persona.description,
          axes: persona.axes,
          bands: persona.bands,
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

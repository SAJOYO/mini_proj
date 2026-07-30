/// <reference types="node" />

import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { synthesize } from '@/constants/persona';
import { inferBreedMix } from '@/lib/breed-inference/infer-breed-mix';
import { OpenAiCompatibleVisionClient } from '@/lib/breed-inference/openai-compatible-client';
import type { VisionImageInput } from '@/lib/breed-inference/types';

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

  const apiKey = requiredEnv('LLM_API_KEY');
  const model = requiredEnv('LLM_MODEL');
  const baseUrl = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
  const imagePath = resolve(imageArg);
  const mimeType = MIME_BY_EXTENSION[extname(imagePath).toLowerCase()];
  if (!mimeType) {
    throw new Error('지원하는 이미지 형식은 jpg, jpeg, png, webp입니다.');
  }

  const image = await readFile(imagePath);
  const client = new OpenAiCompatibleVisionClient({ apiKey, baseUrl });
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

function requiredEnv(name: 'LLM_API_KEY' | 'LLM_MODEL'): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

/// <reference types="node" />

/**
 * 모델의 raw 응답을 그대로 찍어보는 진단용 스크립트.
 *
 * 검증·정규화를 건너뛰고 모델이 실제로 뭐라고 답했는지만 봅니다.
 * 모델을 갈아탈 때 로스터 이탈이나 형식 이탈을 확인하는 데 씁니다.
 *
 *   npm run persona:raw -- <사진 경로> [반복 횟수]
 */

import { readFileSync } from 'node:fs';

import { ChatCompletionsVisionClient } from '@/lib/breed-inference/chat-completions-client';
import { BREED_INFERENCE_PROMPT, BREED_MIX_JSON_SCHEMA } from '@/lib/breed-inference/prompt';

async function main() {
  const path = process.argv[2];
  const runs = Number(process.argv[3] ?? 3);
  const base64 = readFileSync(path).toString('base64');

  const client = new ChatCompletionsVisionClient({
    apiKey: process.env.LLM_API_KEY as string,
    baseUrl: process.env.LLM_BASE_URL as string,
    structuredOutput: 'prompt',
  });

  for (let i = 1; i <= runs; i += 1) {
    try {
      const raw = await client.generateStructured({
        model: process.env.LLM_MODEL as string,
        image: { mimeType: 'image/jpeg', base64 },
        prompt: BREED_INFERENCE_PROMPT,
        schema: BREED_MIX_JSON_SCHEMA,
      });
      process.stdout.write(`  ${i}회차: ${JSON.stringify(raw)}
`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      process.stdout.write(`  ${i}회차 실패: ${reason}
`);
    }
  }
}

void main();

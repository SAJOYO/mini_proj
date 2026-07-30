/// <reference types="node" />

/**
 * 사진 한 장으로 캐릭터를 만들고, 그 성격으로 실제 대화까지 돌려보는 스크립트.
 *
 *   npm run persona:chat -- <사진 경로> [이름]
 *
 * 정해진 질문 네 개를 던집니다. 각각 다른 축을 건드리도록 골랐습니다.
 *   인사        → 애착·표현
 *   위로 요청    → 표현·예민함·낙천성
 *   범위 밖 요청  → 조수 말투로 새는지
 *   애정 확인    → 표현 (츤데레가 실제로 나오는지)
 */

import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import { synthesize } from '@/lib/persona';
import { BREEDS } from '@/constants/pet';
import { ChatCompletionsVisionClient } from '@/lib/breed-inference/chat-completions-client';
import { inferBreedMix } from '@/lib/breed-inference/infer-breed-mix';
import type { VisionImageInput } from '@/lib/breed-inference/types';
import { ChatCompletionsPersonaClient, type ChatTurn } from '@/lib/persona-chat/chat-client';
import { characterBlock } from '@/lib/persona-chat/system-prompt';
import { chatTarget, describeTarget, visionTarget } from './llm-env';

const MIME_BY_EXTENSION: Record<string, VisionImageInput['mimeType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const QUESTIONS = ['안녕', '오늘 진짜 힘들었어', '파이썬 코드 좀 짜줘', '너 나 좋아해?'];

const out = (line: string) => process.stdout.write(`${line}\n`);

async function main() {
  const imageArg = process.argv[2];
  if (!imageArg) throw new Error('사용법: npm run persona:chat -- <사진 경로> [이름]');
  const name = process.argv[3] ?? '단무';

  const vision = visionTarget();
  const chatCfg = chatTarget();

  const imagePath = resolve(imageArg);
  const mimeType = MIME_BY_EXTENSION[extname(imagePath).toLowerCase()];
  if (!mimeType) throw new Error('지원하는 이미지 형식은 jpg, jpeg, png, webp입니다.');

  // ① 사진 → 품종 혼합
  const image = await readFile(imagePath);
  const inference = await inferBreedMix(
    { model: vision.model, image: { mimeType, base64: image.toString('base64') } },
    new ChatCompletionsVisionClient({
      apiKey: vision.apiKey,
      baseUrl: vision.baseUrl,
      structuredOutput: vision.structuredOutput,
    }),
  );

  // ② 품종 혼합 → 성격
  const card = synthesize(inference.mix);

  out(`판정  ${describeTarget(vision)}`);
  out(`대화  ${describeTarget(chatCfg)}`);
  out('');
  out('━━━━━━━━━━ 판정 ━━━━━━━━━━');
  out(`${inference.attempts}회 시도 · ${inference.elapsedMs}ms`);
  out(card.mix.map((m) => `${BREEDS[m.breed].label} ${Math.round(m.ratio)}`).join(' / '));
  out('');
  out('━━━━━━━━━━ 주입되는 캐릭터 블록 ━━━━━━━━━━');
  out(characterBlock(card, name));
  out('');
  out('━━━━━━━━━━ 대화 ━━━━━━━━━━');

  // ③ 성격 → 대화
  const chat = new ChatCompletionsPersonaClient({
    apiKey: chatCfg.apiKey,
    baseUrl: chatCfg.baseUrl,
  });
  const history: ChatTurn[] = [];

  for (const question of QUESTIONS) {
    history.push({ role: 'user', content: question });
    const answer = await chat.reply({ model: chatCfg.model, card, name, history });
    history.push({ role: 'assistant', content: answer });
    out(`  나  ${question}`);
    out(`  ${name}  ${answer.replace(/\n/g, ' ')}`);
    out('');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

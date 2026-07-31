/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { inferBreedMix } from '@/lib/breed-inference/infer-breed-mix';
import type { GenerateStructuredInput, VisionLlmClient } from '@/lib/breed-inference/types';

const VALID = {
  mix: [
    { breed: 'doberman', ratio: 55 },
    { breed: 'greyhound', ratio: 30 },
    { breed: 'beagle', ratio: 15 },
  ],
};

/** 미리 정해둔 응답을 순서대로 내놓는 가짜 클라이언트. */
function scriptedClient(replies: unknown[]): VisionLlmClient & { prompts: string[] } {
  const prompts: string[] = [];
  return {
    prompts,
    async generateStructured({ prompt }: GenerateStructuredInput) {
      prompts.push(prompt);
      return replies[prompts.length - 1];
    },
  };
}

const INPUT = {
  model: 'vision-model',
  image: { mimeType: 'image/jpeg' as const, base64: 'aW1hZ2U=' },
};

test('첫 시도에 성공하면 한 번만 호출한다', async () => {
  const client = scriptedClient([VALID]);
  const result = await inferBreedMix(INPUT, client);

  assert.equal(result.attempts, 1);
  assert.equal(client.prompts.length, 1);
  assert.equal(result.mix.length, 3);
});

test('로스터에 없는 품종이 오면 재시도해서 살려낸다', async () => {
  // 실측된 실패 형태: 핏불 사진에 pitbull을 적어버림
  const invalid = {
    mix: [
      { breed: 'doberman', ratio: 50 },
      { breed: 'pitbull', ratio: 30 },
      { breed: 'greyhound', ratio: 20 },
    ],
  };
  const client = scriptedClient([invalid, VALID]);
  const result = await inferBreedMix(INPUT, client);

  assert.equal(result.attempts, 2);
  assert.equal(result.mix[0].breed, 'doberman');
});

test('재시도 프롬프트는 무엇을 어겼는지 알려준다', async () => {
  const invalid = {
    mix: [
      { breed: 'shiba', ratio: 100 },
      { breed: 'shiba', ratio: 50 },
    ],
  };
  const client = scriptedClient([invalid, VALID]);
  await inferBreedMix(INPUT, client);

  assert.equal(client.prompts.length, 2);
  assert.doesNotMatch(client.prompts[0], /재시도/);
  assert.match(client.prompts[1], /\[재시도\]/);
  assert.match(client.prompts[1], /중복/);
  assert.match(client.prompts[1], /정확히 3개/);
});

test('세 번 다 실패하면 마지막 위반 사유를 담아 던진다', async () => {
  const invalid = { mix: [{ breed: 'nope', ratio: 100 }] };
  const client = scriptedClient([invalid, invalid, invalid]);

  await assert.rejects(
    () => inferBreedMix(INPUT, client),
    /3회 시도했지만.*허용된 품종이 아닙니다/s,
  );
  assert.equal(client.prompts.length, 3);
});

test('네트워크 오류는 재시도하지 않고 그대로 올려보낸다', async () => {
  let calls = 0;
  const client: VisionLlmClient = {
    async generateStructured() {
      calls += 1;
      throw new Error('LLM 요청 실패 (503): overloaded');
    },
  };

  await assert.rejects(() => inferBreedMix(INPUT, client), /503/);
  assert.equal(calls, 1);
});

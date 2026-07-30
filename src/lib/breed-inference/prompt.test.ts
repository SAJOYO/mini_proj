/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { INFERABLE_BREED_IDS } from '@/constants/breed-catalog';
import { BREEDS } from '@/constants/pet';
import { BREED_INFERENCE_PROMPT, BREED_MIX_JSON_SCHEMA } from '@/lib/breed-inference/prompt';

test('추론 품종 집합이 neutral을 제외한 캐릭터 지원 품종과 일치한다', () => {
  const supported = Object.keys(BREEDS).filter((id) => id !== 'neutral');
  assert.deepEqual([...INFERABLE_BREED_IDS].sort(), supported.sort());
});

test('프롬프트에 모든 품종 ID와 외형 판단 제한이 들어간다', () => {
  for (const id of INFERABLE_BREED_IDS) {
    assert.match(BREED_INFERENCE_PROMPT, new RegExp(`- ${id} \\(`));
  }
  assert.match(BREED_INFERENCE_PROMPT, /실제 성격.*추론하지 마라/);
});

test('출력 스키마에는 mix만 있고 confidence가 없다', () => {
  const schemaText = JSON.stringify(BREED_MIX_JSON_SCHEMA);
  assert.match(schemaText, /"mix"/);
  assert.doesNotMatch(schemaText, /confidence/);
});

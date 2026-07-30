/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { extractJsonObject } from '@/lib/llm/structured';

test('문자열 안의 중괄호를 깊이로 세지 않는다', () => {
  assert.deepEqual(extractJsonObject('앞말 {"note":"{ 안 닫힌 괄호","ok":true} 뒷말'), {
    note: '{ 안 닫힌 괄호',
    ok: true,
  });
});

test('JSON 객체가 없거나 닫히지 않으면 예외를 던진다', () => {
  assert.throws(() => extractJsonObject('설명만 있습니다'), /찾지 못했습니다/);
  assert.throws(() => extractJsonObject('{"mix":['), /닫히지 않았습니다/);
});

/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { describeFailure } from '@/lib/failure-message';

/**
 * 입력은 실제로 받아본 오류 문자열을 씁니다.
 * 지어낸 문자열로 테스트하면 정규식이 실제 응답과 안 맞아도 통과합니다.
 */

/** 실제 429 응답. llm/client.ts 가 본문을 800자까지 붙여서 던집니다. */
const REAL_429 =
  'LLM 요청 실패 (429): [{\n  "error": {\n    "code": 429,\n    "message": "You exceeded your current quota, ' +
  'please check your plan and billing details. ... Quota exceeded for metric: ' +
  'generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, ' +
  'model: gemini-3.6-flash\\nPlease retry in 40.85328273s.",\n    "status": "RESOURCE_EXHAUSTED"';

/** 실제 잘못된 키 응답. */
const REAL_BAD_KEY =
  'LLM 요청 실패 (400): {"error":{"code":400,"message":"API key not valid. Please pass a valid API key.",' +
  '"status":"INVALID_ARGUMENT"}}';

test('한도 초과는 기다리면 되는 것으로 본다', () => {
  const result = describeFailure(new Error(REAL_429));
  assert.equal(result.retryable, true);
  assert.match(result.text, /잠깐 뒤에/);
  // 원본이 새어나오지 않아야 합니다 — 이게 이 함수의 존재 이유입니다.
  assert.ok(!result.text.includes('RESOURCE_EXHAUSTED'));
  assert.ok(result.text.length < 60);
});

test('키 문제는 기다려도 안 되므로 말풍선으로 남긴다', () => {
  const result = describeFailure(new Error(REAL_BAD_KEY));
  assert.equal(result.retryable, false);
  assert.match(result.text, /\.env/);
});

test('401 / 403 도 키 문제로 본다', () => {
  for (const code of ['(401)', '(403)']) {
    const result = describeFailure(new Error(`LLM 요청 실패 ${code}: ...`));
    assert.equal(result.retryable, false, code);
    assert.match(result.text, /키/, code);
  }
});

test('네트워크 오류를 구분한다', () => {
  for (const raw of [
    'Network request failed',
    'TypeError: Failed to fetch',
    'getaddrinfo ENOTFOUND',
  ]) {
    const result = describeFailure(new Error(raw));
    assert.equal(result.retryable, true, raw);
    assert.match(result.text, /인터넷/, raw);
  }
});

test('모르는 오류도 던지지 않고 기본 문장을 준다', () => {
  for (const value of [new Error('뭔가 이상함'), 'string 오류', null, undefined, 42, {}]) {
    const result = describeFailure(value);
    assert.equal(typeof result.text, 'string');
    assert.ok(result.text.length > 0);
    assert.equal(result.retryable, true);
  }
});

test('어떤 입력에도 원본 내용이 화면 문구로 새지 않는다', () => {
  const secret = 'AQ.Ab8RN4-secret-key-value-should-never-appear';
  const result = describeFailure(new Error(`LLM 요청 실패 (403): key=${secret}`));
  assert.ok(!result.text.includes(secret));
  assert.ok(!result.text.includes('AQ.'));
});

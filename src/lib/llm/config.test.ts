/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_BASE_URL,
  chatTarget,
  describeTarget,
  resolveStructuredOutput,
  visionTarget,
  type RawLlmEnv,
} from '@/lib/llm/config';

const FULL: RawLlmEnv = {
  visionApiKey: 'vk',
  visionModel: 'vm',
  visionBaseUrl: 'https://vision.example/v1',
  visionStructuredOutput: 'prompt',
  chatApiKey: 'ck',
  chatModel: 'cm',
  chatBaseUrl: 'https://chat.example/v1',
};

test('값이 모두 있으면 그대로 읽는다', () => {
  assert.deepEqual(visionTarget(FULL), {
    apiKey: 'vk',
    model: 'vm',
    baseUrl: 'https://vision.example/v1',
    structuredOutput: 'prompt',
  });

  assert.deepEqual(chatTarget(FULL), {
    apiKey: 'ck',
    model: 'cm',
    baseUrl: 'https://chat.example/v1',
    structuredOutput: 'json_schema',
  });
});

test('키나 모델이 없으면 던지지 않고 null을 준다', () => {
  // 앱에서는 모듈 로드 시점의 예외가 흰 화면이 됩니다. null이어야 화면이
  // "키 미설정" 안내를 띄울 수 있습니다.
  assert.equal(visionTarget({}), null);
  assert.equal(chatTarget({}), null);
  assert.equal(visionTarget({ visionApiKey: 'vk' }), null, '모델만 빠져도 null');
  assert.equal(visionTarget({ visionModel: 'vm' }), null, '키만 빠져도 null');
});

test('빈 문자열과 공백은 설정되지 않은 것으로 본다', () => {
  // `.env`에 `EXPO_PUBLIC_CHAT_MODEL=` 처럼 이름만 남기는 일이 흔합니다.
  // ??로 처리하면 빈 문자열이 통과해서 모델명 없이 요청이 나갑니다.
  assert.equal(chatTarget({ chatApiKey: 'ck', chatModel: '' }), null);
  assert.equal(chatTarget({ chatApiKey: '   ', chatModel: 'cm' }), null);
});

test('값 주위 공백은 잘라낸다', () => {
  const t = chatTarget({ chatApiKey: '  ck  ', chatModel: '  cm  ' });
  assert.equal(t?.apiKey, 'ck');
  assert.equal(t?.model, 'cm');
});

test('BASE_URL이 없으면 기본값으로 떨어진다', () => {
  const t = visionTarget({ visionApiKey: 'vk', visionModel: 'vm' });
  assert.equal(t?.baseUrl, DEFAULT_BASE_URL);
});

test('structuredOutput은 세 모드만 받고 나머지는 기본값이다', () => {
  assert.equal(resolveStructuredOutput('json_schema'), 'json_schema');
  assert.equal(resolveStructuredOutput('json_object'), 'json_object');
  assert.equal(resolveStructuredOutput('prompt'), 'prompt');

  // 앱에서는 오타로 죽지 않고 기본값으로 갑니다. 스크립트(CLI)는 던집니다.
  assert.equal(resolveStructuredOutput('jsonschema'), 'json_schema');
  assert.equal(resolveStructuredOutput(''), 'json_schema');
  assert.equal(resolveStructuredOutput(undefined), 'json_schema');
});

test('대화 설정은 VISION_STRUCTURED_OUTPUT에 영향받지 않는다', () => {
  // 전에는 CHAT_STRUCTURED_OUTPUT을 읽어놓고 쓰지 않았고, 그 값의 오타로
  // 대화가 죽는 일만 생겼습니다.
  const t = chatTarget({ ...FULL, visionStructuredOutput: '엉뚱한값' });
  assert.equal(t?.structuredOutput, 'json_schema');
});

test('describeTarget은 키를 찍지 않는다', () => {
  const line = describeTarget({
    apiKey: 'super-secret-key',
    model: 'vm',
    baseUrl: 'https://vision.example/v1',
    structuredOutput: 'prompt',
  });

  assert.ok(!line.includes('super-secret-key'), '키가 로그에 새면 안 됩니다');
  assert.match(line, /vm/);
  assert.match(line, /vision\.example/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { parseReply } from '@/lib/persona-chat/reply';

test('맨 앞 지문을 떼고 별표를 버린다', () => {
  assert.deepEqual(parseReply('*꼬리가 먼저 흔들린다* ...별로.'), {
    action: '꼬리가 먼저 흔들린다',
    speech: '...별로.',
  });
});

test('지문이 없으면 전부 말이다', () => {
  assert.deepEqual(parseReply('응, 괜찮아.'), { action: null, speech: '응, 괜찮아.' });
});

test('별표가 안 닫히면 규칙 위반 — 통째로 말로 취급한다', () => {
  const broken = '*귀가 축 처진다 응, 괜찮아.';
  assert.deepEqual(parseReply(broken), { action: null, speech: broken });
});

test('지문만 있는 응답 — 침묵도 유효하다', () => {
  assert.deepEqual(parseReply('*등을 돌린다*'), { action: '등을 돌린다', speech: '' });
});

test('앞뒤 공백과 줄바꿈을 정리한다', () => {
  assert.deepEqual(parseReply('  *귀가 축 처진다*\n응, 괜찮아.  '), {
    action: '귀가 축 처진다',
    speech: '응, 괜찮아.',
  });
});

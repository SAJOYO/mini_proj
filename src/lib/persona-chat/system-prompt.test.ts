import assert from 'node:assert/strict';
import test from 'node:test';

import { nowBlock } from '@/lib/persona-chat/system-prompt';

const at = (iso: string) => new Date(iso);

test('시계 숫자 없이 시간대만 준다', () => {
  const block = nowBlock(at('2026-07-31T20:30:00'));
  assert.equal(block.cacheable, false);
  assert.match(block.text, /저녁이다/);
  assert.doesNotMatch(block.text, /\d+시/); // "8시 30분" 같은 시각이 새면 안 됩니다
});

test('하루 다섯 토막의 경계', () => {
  assert.match(nowBlock(at('2026-07-31T04:59:00')).text, /깊은 밤이다/);
  assert.match(nowBlock(at('2026-07-31T05:00:00')).text, /아침이다/);
  assert.match(nowBlock(at('2026-07-31T11:00:00')).text, /낮이다/);
  assert.match(nowBlock(at('2026-07-31T17:00:00')).text, /저녁이다/);
  assert.match(nowBlock(at('2026-07-31T21:00:00')).text, /밤이다/);
});

test('이어지는 대화(10분 미만)에는 경과를 말하지 않는다', () => {
  const block = nowBlock(at('2026-07-31T20:30:00'), at('2026-07-31T20:25:00'));
  assert.doesNotMatch(block.text, /사용자/);
});

test('공백의 크기에 따라 경과 문장이 갈린다', () => {
  const now = at('2026-07-31T20:00:00');
  assert.match(nowBlock(now, at('2026-07-31T19:00:00')).text, /조금 전까지 이야기했다/);
  assert.match(nowBlock(now, at('2026-07-31T12:00:00')).text, /몇 시간 만에 왔다/);
  assert.match(nowBlock(now, at('2026-07-30T10:00:00')).text, /하루 만에 왔다/);
  assert.match(nowBlock(now, at('2026-07-28T20:00:00')).text, /3일 만에 왔다/);
});

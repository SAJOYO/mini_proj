/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveMix } from '@/lib/persona';
import { extractDisplayText, parseBreedMixResponse } from '@/lib/breed-inference/validate';

test('정상 응답은 병합이나 정규화 없이 그대로 파싱한다', () => {
  const result = parseBreedMixResponse({
    mix: [
      { breed: 'poodle', ratio: 2 },
      { breed: 'shiba', ratio: 1 },
    ],
  });

  assert.deepEqual(result, [
    { breed: 'poodle', ratio: 2 },
    { breed: 'shiba', ratio: 1 },
  ]);
});

test('표준화는 기존 persona.ts의 resolveMix가 담당한다', () => {
  const parsed = parseBreedMixResponse({
    mix: [
      { breed: 'poodle', ratio: 2 },
      { breed: 'shiba', ratio: 1 },
    ],
  });

  const resolved = resolveMix(parsed);
  assert.deepEqual(
    resolved.map(({ breed }) => breed),
    ['poodle', 'shiba'],
  );
  assert.ok(Math.abs(resolved[0].ratio - 200 / 3) < Number.EPSILON * 100);
  assert.ok(Math.abs(resolved[1].ratio - 100 / 3) < Number.EPSILON * 100);
  assert.ok(Math.abs(resolved.reduce((sum, item) => sum + item.ratio, 0) - 100) < 1e-10);
});

test('중복 품종은 추론 계약 위반으로 거부한다', () => {
  assert.throws(
    () =>
      parseBreedMixResponse({
        mix: [
          { breed: 'shiba', ratio: 30 },
          { breed: 'corgi', ratio: 50 },
          { breed: 'shiba', ratio: 20 },
        ],
      }),
    /중복/,
  );
});

test('neutral과 등록되지 않은 품종을 거부한다', () => {
  assert.throws(
    () => parseBreedMixResponse({ mix: [{ breed: 'neutral', ratio: 100 }] }),
    /허용된 품종/,
  );
  assert.throws(
    () => parseBreedMixResponse({ mix: [{ breed: 'husky', ratio: 100 }] }),
    /허용된 품종/,
  );
});

test('빈 배열과 잘못된 비율을 거부한다', () => {
  assert.throws(() => parseBreedMixResponse({ mix: [] }), /하나 이상/);
  assert.throws(
    () => parseBreedMixResponse({ mix: [{ breed: 'shiba', ratio: 0 }] }),
    /양의 유한 숫자/,
  );
});

test('품종이 3개를 넘으면 거부한다', () => {
  assert.throws(
    () =>
      parseBreedMixResponse({
        mix: [
          { breed: 'shiba', ratio: 25 },
          { breed: 'poodle', ratio: 25 },
          { breed: 'corgi', ratio: 25 },
          { breed: 'beagle', ratio: 25 },
        ],
      }),
    /최대 3개/,
  );
});

// ── extractDisplayText ────────────────────────────────────────────
// 표시용 텍스트는 "없어도 판정은 성립한다"가 핵심 규칙이라, 던지지 않는지를
// 주로 확인합니다. 여기서 던지면 근거 문장 하나 때문에 재시도가 돌고
// 3회를 다 쓰면 캐릭터를 못 만듭니다.

test('face와 reason을 있는 대로 뽑아낸다', () => {
  const result = extractDisplayText({
    face: '  눈꼬리가 처지고 볼살이 도톰하다.  ',
    mix: [
      { breed: 'maltese', ratio: 45, reason: '도톰한 볼살이 닮았다' },
      { breed: 'greyhound', ratio: 30, reason: '  긴 얼굴형  ' },
    ],
  });

  assert.equal(result.face, '눈꼬리가 처지고 볼살이 도톰하다.');
  assert.deepEqual(result.reasons, {
    maltese: '도톰한 볼살이 닮았다',
    greyhound: '긴 얼굴형',
  });
});

test('face나 reason이 없어도 던지지 않고 빈 값을 준다', () => {
  const result = extractDisplayText({
    mix: [{ breed: 'shiba', ratio: 100 }],
  });

  assert.equal(result.face, '');
  assert.deepEqual(result.reasons, {});
});

test('응답이 아예 엉뚱해도 던지지 않는다', () => {
  for (const raw of [null, undefined, 'text', 42, [], {}]) {
    const result = extractDisplayText(raw);
    assert.equal(result.face, '');
    assert.deepEqual(result.reasons, {});
  }
});

test('빈 문자열이나 잘못된 타입의 reason은 버린다', () => {
  const result = extractDisplayText({
    face: 123,
    mix: [
      { breed: 'shiba', ratio: 50, reason: '   ' },
      { breed: 'poodle', ratio: 30, reason: 999 },
      { breed: 'beagle', ratio: 20, reason: '쓸 만한 근거' },
    ],
  });

  assert.equal(result.face, '');
  assert.deepEqual(result.reasons, { beagle: '쓸 만한 근거' });
});

test('로스터에 없는 품종의 reason은 버린다', () => {
  const result = extractDisplayText({
    face: '관찰',
    mix: [
      { breed: 'pitbull', ratio: 60, reason: '없는 품종' },
      { breed: 'corgi', ratio: 40, reason: '있는 품종' },
    ],
  });

  assert.deepEqual(result.reasons, { corgi: '있는 품종' });
});

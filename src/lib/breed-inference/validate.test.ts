/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveMix } from '@/constants/persona';
import { parseBreedMixResponse } from '@/lib/breed-inference/validate';

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

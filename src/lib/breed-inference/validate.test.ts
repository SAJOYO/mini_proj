/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { validateBreedMixResponse } from '@/lib/breed-inference/validate';

test('비율을 정수 합계 100으로 정규화한다', () => {
  const result = validateBreedMixResponse({
    mix: [
      { breed: 'shiba', ratio: 1 },
      { breed: 'poodle', ratio: 1 },
      { breed: 'corgi', ratio: 1 },
    ],
  });

  assert.equal(
    result.reduce((sum, item) => sum + item.ratio, 0),
    100,
  );
  assert.deepEqual(result, [
    { breed: 'shiba', ratio: 34 },
    { breed: 'poodle', ratio: 33 },
    { breed: 'corgi', ratio: 33 },
  ]);
});

test('중복 품종을 합친 뒤 정규화한다', () => {
  assert.deepEqual(
    validateBreedMixResponse({
      mix: [
        { breed: 'shiba', ratio: 30 },
        { breed: 'corgi', ratio: 50 },
        { breed: 'shiba', ratio: 20 },
      ],
    }),
    [
      { breed: 'shiba', ratio: 50 },
      { breed: 'corgi', ratio: 50 },
    ],
  );
});

test('neutral과 등록되지 않은 품종을 거부한다', () => {
  assert.throws(
    () => validateBreedMixResponse({ mix: [{ breed: 'neutral', ratio: 100 }] }),
    /허용된 품종/,
  );
  assert.throws(
    () => validateBreedMixResponse({ mix: [{ breed: 'husky', ratio: 100 }] }),
    /허용된 품종/,
  );
});

test('빈 배열과 잘못된 비율을 거부한다', () => {
  assert.throws(() => validateBreedMixResponse({ mix: [] }), /하나 이상/);
  assert.throws(
    () => validateBreedMixResponse({ mix: [{ breed: 'shiba', ratio: 0 }] }),
    /양의 유한 숫자/,
  );
});

test('품종이 3개를 넘으면 거부한다', () => {
  assert.throws(
    () =>
      validateBreedMixResponse({
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

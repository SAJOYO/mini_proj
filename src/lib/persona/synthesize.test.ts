import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BreedId } from '@/constants/pet';
import { axesOf } from '@/lib/persona/presets';
import {
  anchorMix,
  dominantBreed,
  resolveMix,
  synthesize,
  type BreedMix,
} from '@/lib/persona/synthesize';

/**
 * 결과 화면에서 사용자가 2·3순위를 고를 수 있게 되면서 생긴 규칙들을 못 박아 둡니다.
 *
 * 핵심은 하나입니다 — **고른 품종은 기준점이 되지만 퍼센트는 안 바뀝니다.**
 * 지분을 맞바꾸면 모델이 잰 값이 사라지고, 순서를 안 바꾸면 게임과 채팅의
 * 캐릭터가 어긋납니다.
 */

/** 진돗개 45 · 시바견 30 · 닥스훈트 25 — 실제 판정에서 나오는 모양. */
const MEASURED: BreedMix = resolveMix([
  { breed: 'jindo', ratio: 45 },
  { breed: 'shiba', ratio: 30 },
  { breed: 'dachshund', ratio: 25 },
]);

const ratioOf = (mix: BreedMix, breed: BreedId) => mix.find((item) => item.breed === breed)?.ratio;

describe('anchorMix', () => {
  it('고른 품종을 맨 앞으로 올린다', () => {
    const anchored = anchorMix(MEASURED, 'shiba');
    assert.equal(anchored[0].breed, 'shiba');
  });

  it('퍼센트는 하나도 안 바뀐다 — 순서만 바뀐다', () => {
    const anchored = anchorMix(MEASURED, 'shiba');

    assert.equal(ratioOf(anchored, 'shiba'), 30);
    assert.equal(ratioOf(anchored, 'jindo'), 45);
    assert.equal(ratioOf(anchored, 'dachshund'), 25);
    // 구성원도 그대로여야 합니다 (하나가 밀려나면 안 됩니다).
    assert.equal(anchored.length, MEASURED.length);
  });

  it('밀려난 품종들의 상대 순서는 유지된다', () => {
    // 3순위를 고르면 나머지는 45 → 30 순서 그대로 뒤에 붙습니다.
    assert.deepEqual(
      anchorMix(MEASURED, 'dachshund').map((m) => m.breed),
      ['dachshund', 'jindo', 'shiba'],
    );
  });

  it('기준점이 없거나 · 이미 맨 앞이거나 · 목록에 없으면 그대로', () => {
    assert.deepEqual(anchorMix(MEASURED), MEASURED);
    assert.deepEqual(anchorMix(MEASURED, null), MEASURED);
    assert.deepEqual(anchorMix(MEASURED, 'jindo'), MEASURED);
    // 저장소에 남은 옛 선택이 로스터에서 빠진 경우
    assert.deepEqual(anchorMix(MEASURED, 'corgi'), MEASURED);
  });
});

describe('dominantBreed', () => {
  it('기준점을 올려둔 혼합에서는 기준점을 돌려준다', () => {
    // 안에서 resolveMix 를 다시 부르면 45%인 진돗개가 나옵니다. 그러면
    // 채팅 아바타가 게임 캐릭터와 달라집니다.
    assert.equal(dominantBreed(anchorMix(MEASURED, 'shiba')), 'shiba');
  });

  it('기준점이 없으면 지분 1위', () => {
    assert.equal(dominantBreed(MEASURED), 'jindo');
  });

  it('빈 혼합에서도 안 죽는다', () => {
    assert.equal(dominantBreed([]), 'neutral');
  });
});

describe('synthesize + 기준점', () => {
  it('기준점을 안 주면 이 인자가 생기기 전과 같다', () => {
    // 회귀 방지 — 기존 저장분(chosen 없음)이 예전과 똑같이 나와야 합니다.
    assert.deepEqual(synthesize(MEASURED), synthesize(MEASURED, 'jindo'));
  });

  it('고른 품종이 카드의 기준점이 된다', () => {
    const card = synthesize(MEASURED, 'shiba');
    assert.equal(card.mix[0].breed, 'shiba');
    assert.equal(ratioOf(card.mix, 'shiba'), 30);
  });

  it('기준점을 바꾸면 성격도 바뀐다', () => {
    // 안 바뀌면 "고르게 하는" 기능 자체가 무의미합니다.
    assert.notDeepEqual(synthesize(MEASURED, 'shiba').axes, synthesize(MEASURED, 'jindo').axes);
  });

  it('정규화는 그대로 — 합계 100', () => {
    const total = synthesize(MEASURED, 'dachshund').mix.reduce((sum, m) => sum + m.ratio, 0);
    assert.ok(Math.abs(total - 100) < 1e-9, `합계가 ${total}`);
  });

  it('기준점이 3순위여도 그 품종에서 30점 넘게 벗어나지 않는다', () => {
    // MAX_SHIFT_AT_EVEN(40) × (100 − 25) / 100 = 30.
    // 지분이 작은 품종을 고르면 나머지 둘이 성격을 끌고 갑니다. 그 폭이
    // 조용히 넓어지면 "고른 동물답지 않다"가 됩니다 — 여기서 감시합니다.
    const anchor: BreedId = 'dachshund';
    const preset = axesOf(anchor);
    const card = synthesize(MEASURED, anchor);

    for (const [key, value] of Object.entries(card.axes)) {
      const shift = Math.abs(value - preset[key as keyof typeof preset]);
      assert.ok(shift <= 30, `${key} 축이 ${shift} 만큼 밀렸습니다 (한계 30)`);
    }
  });
});

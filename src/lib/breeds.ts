/**
 * 품종 고르기 — **임시 스텁입니다.**
 *
 * TODO(홍가연): 닮은 동물 검색이 붙으면 이 파일은 지워도 됩니다.
 * 검색 결과에서 `BreedId`만 넘겨주면 게임 쪽은 그대로 동작합니다.
 *
 *   router.push({ pathname: '/game', params: { breed: 'poodle' } })
 *
 * 넘기는 건 한글 이름이 아니라 `constants/pet.ts`의 키입니다.
 * 캐릭터가 그 키로 형태와 색을 찾기 때문입니다. 화면에 보여줄 한글 이름은
 * 받는 쪽에서 `BREEDS[id].label`로 꺼내 씁니다.
 */

import { BREEDS, type BreedId } from '@/constants/pet';

/** 캐릭터가 그릴 수 있는 품종 전부. 'neutral'(무품종 기본형)은 뺍니다. */
export const DOG_BREEDS = (Object.keys(BREEDS) as BreedId[]).filter((id) => id !== 'neutral');

/** 임시 구현: 품종 하나를 랜덤으로 돌려줍니다. */
export function pickRandomBreed(): BreedId {
  const index = Math.floor(Math.random() * DOG_BREEDS.length);
  return DOG_BREEDS[index];
}

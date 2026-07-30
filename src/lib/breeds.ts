/**
 * 강아지 품종 목록 — **임시 스텁입니다.**
 *
 * TODO(홍가연): 닮은 동물 검색이 붙으면 이 파일은 지워도 됩니다.
 * 검색 결과에서 품종 문자열만 넘겨주면 게임 쪽은 그대로 동작합니다.
 *
 *   router.push({ pathname: '/game', params: { breed: '푸들' } })
 *
 * 지금은 빠른 테스트를 위해 강아지 품종으로만 한정하고, 랜덤으로 하나 고릅니다.
 */

export const DOG_BREEDS: readonly string[] = [
  '푸들',
  '시바견',
  '골든 리트리버',
  '웰시코기',
  '비글',
  '보더콜리',
  '포메라니안',
  '닥스훈트',
  '허스키',
  '사모예드',
  '불독',
  '치와와',
];

/** 임시 구현: 품종 하나를 랜덤으로 돌려줍니다. */
export function pickRandomBreed(): string {
  const index = Math.floor(Math.random() * DOG_BREEDS.length);
  return DOG_BREEDS[index];
}

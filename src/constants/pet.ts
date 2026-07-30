/**
 * 품종 로스터 — **최소 스텁입니다.**
 *
 * TODO(조윤주·최윤우): 캐릭터화 작업이 dev에 들어오면 이 파일은 그쪽 것으로
 * 대체됩니다. 이 파일이 내보내는 이름 네 개만 유지해주시면 페르소나 쪽은
 * 아무것도 안 고쳐도 됩니다.
 *
 *   BREEDS · BreedId · ANIMATION_NAMES · AnimationName
 *
 * ── 왜 스텁만 두는가 ──────────────────────────────────
 * 이 브랜치는 「동물과 대화하기(페르소나)」 담당분입니다. 성격 계산과 대화가
 * 품종 로스터에 의존하지만, 필요한 건 **id와 표시명뿐**입니다.
 * 실제로 쓰는 건 `BREEDS[id].label` 하나입니다.
 *
 * 겉모습 프리셋(귀 각도·털색·무늬·몸통 비율 등)은 캐릭터를 그리는 쪽 것이라
 * 여기 넣지 않았습니다. 같은 파일을 두 브랜치가 각자 채우면 나중에 한쪽을
 * 버려야 하는데, 로스터만 두면 그쪽 파일로 통째로 갈아끼우면 끝납니다.
 *
 * ── 선언 순서를 바꾸지 마세요 ──────────────────────────
 * `Object.keys(BREEDS)` 순서가 두 곳에 영향을 줍니다.
 *   1. 추론 프롬프트의 [품종 집합] 나열 순서
 *   2. 아키타입에서 축이 동점일 때의 우선순위
 * 같은 입력에 같은 결과가 나오게 하려면 순서가 안정적이어야 합니다.
 * 추가는 맨 뒤에 하세요.
 */

/** 품종 하나가 페르소나 쪽에 제공해야 하는 최소 정보. */
export type BreedRosterEntry = {
  /** 화면과 프롬프트에 그대로 나가는 한글 표시명. */
  label: string;
};

/**
 * 지금 지원하는 품종들.
 *
 * `neutral`은 모든 품종의 원점이자 애플리케이션 fallback입니다.
 * 추론 후보에서는 제외됩니다 (`INFERABLE_BREED_IDS` 참고).
 */
export const BREEDS = {
  neutral: { label: '기본' },
  shiba: { label: '시바견' },
  retriever: { label: '골든 리트리버' },
  dachshund: { label: '닥스훈트' },
  poodle: { label: '푸들' },
  beagle: { label: '비글' },
  shihtzu: { label: '시츄' },
  maltese: { label: '말티즈' },
  corgi: { label: '웰시코기' },
  chihuahua: { label: '치와와' },
  bichon: { label: '비숑프리제' },
  doberman: { label: '도베르만' },
  yorkshire: { label: '요크셔테리어' },
  greyhound: { label: '그레이하운드' },
  // 게임 파트가 캐릭터를 가진 품종에 맞춰 추가했습니다.
  // (`pointer`는 게임 쪽에 그림이 없어서 뺐습니다 — 판정에 나와도 띄울 게 없습니다.)
  jindo: { label: '진돗개' },
  pomeranian: { label: '포메라니안' },
  cavalier: { label: '카발리에' },
} as const satisfies Record<string, BreedRosterEntry>;

export type BreedId = keyof typeof BREEDS;

/** 아직 닮은 동물 검색 결과가 없을 때 쓸 품종. */
export const DEFAULT_BREED: BreedId = 'neutral';

/** 알 수 없는 품종 문자열이 들어와도 앱이 죽지 않게 걸러줍니다. */
export function resolveBreed(id: string | null | undefined): BreedId {
  return id != null && id in BREEDS ? (id as BreedId) : DEFAULT_BREED;
}

/**
 * 캐릭터가 재생할 수 있는 동작 목록.
 *
 * 대화 쪽이 이 목록에서 "이 캐릭터가 겪어본 일"을 만듭니다
 * (`persona-chat/system-prompt.ts`의 `KNOWN_TOPICS`).
 * 그래서 동작이 추가되면 대화의 인식 범위도 같이 넓어져야 합니다 —
 * `Record<AnimationName, string>`이라 타입이 그걸 강제합니다.
 */
export const ANIMATION_NAMES = [
  'breathe', // 평상시. 아무 일도 없을 때의 기본값
  'lookAround', // 배고픔 / 심심함 — 두리번거림
  'chew', // 먹는 중
  'yawn', // 졸림
  'sleep', // 자는 중
  'wagTail', // 기분 좋음
  'droop', // 아픔 / 기운 없음
] as const;

export type AnimationName = (typeof ANIMATION_NAMES)[number];

/** 넘겨받은 게 없을 때 재생할 동작. */
export const DEFAULT_ANIMATION: AnimationName = 'breathe';

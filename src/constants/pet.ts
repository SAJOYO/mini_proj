/**
 * 반려동물 캐릭터 계약(contract).
 *
 * 이 파일은 세 사람이 같이 보는 접점입니다.
 *   - 닮은 동물 검색 → 사진을 분석해서 `BreedId`를 만들어 넘깁니다.
 *   - 캐릭터/애니메이션 → 아래 프리셋을 받아 실제 그림을 그립니다.
 *   - 게임 동작 → 펫 상태를 보고 `AnimationName` 하나를 골라 넘깁니다.
 *
 * 여기 있는 이름을 바꾸면 세 쪽 코드가 다 같이 깨집니다.
 * 값(숫자·색)은 자유롭게 고쳐도 되지만, 키 이름을 바꿀 땐 꼭 팀에 먼저 얘기하세요.
 */

/* ------------------------------------------------------------------ *
 * 애니메이션 — 게임 동작 담당이 고르고, 캐릭터 담당이 만듭니다.
 * ------------------------------------------------------------------ */

/**
 * 캐릭터가 재생할 수 있는 동작 목록.
 *
 * 게임 로직은 펫 상태(배고픔/졸림/기분)를 계산한 뒤
 * 이 중 하나를 골라 `<PetCharacter animation={...} />`로 넘기면 됩니다.
 * "언제 어떤 걸 트느냐"는 게임 쪽이 정하고, "어떻게 움직이냐"는 캐릭터 쪽이 정합니다.
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

/* ------------------------------------------------------------------ *
 * 품종 — 닮은 동물 검색이 고르고, 캐릭터 담당이 형태로 바꿉니다.
 * ------------------------------------------------------------------ */

/**
 * 품종 하나를 구성하는 숫자들.
 *
 * 리그(부위별로 쪼갠 캐릭터 구조)가 이 값을 받아 형태를 만듭니다.
 * 품종을 새로 추가한다는 건 그림을 새로 그리는 게 아니라
 * 아래 값 몇 개만 바꾼 프리셋을 한 줄 더 쓰는 일입니다.
 */
export type BreedPreset = {
  /** 목록·디버그 화면에 보여줄 한글 이름 */
  label: string;
  /** 귀 각도(도). 음수일수록 쫑긋(시바), 양수일수록 처짐(리트리버) */
  earAngle: number;
  /** 귀 길이 배율. 1이 기본 */
  earLength: number;
  /** 주둥이 길이 배율. 1이 기본 */
  snoutLength: number;
  /** 꼬리 말림 정도. 0 = 축 처짐, 1 = 등 위로 완전히 말림 */
  tailCurl: number;
  /** 몸통 가로/세로 비율. 클수록 닥스훈트처럼 길쭉해집니다 */
  bodyRatio: number;
  /** 기본 털색 */
  furColor: string;
  /** 무늬 종류 */
  furPattern: 'solid' | 'patch' | 'spotted';
};

/**
 * 모든 품종의 원점.
 *
 * 특정 품종에 치우치지 않은 중간값입니다.
 * 여기서 시작해야 변형이 양쪽으로 자연스럽게 벌어집니다.
 * (시바견을 원점으로 잡으면 "쫑긋한 귀"가 기본 형태에 박혀서
 *  처진 귀 품종을 만들 때 변형이 한쪽으로만 밀립니다.)
 *
 * 새 프리셋은 항상 `{ ...NEUTRAL_BREED, 바꿀값 }` 꼴로 만드세요.
 */
export const NEUTRAL_BREED: BreedPreset = {
  label: '기본',
  earAngle: 20,
  earLength: 1,
  snoutLength: 1,
  tailCurl: 0.5,
  bodyRatio: 1,
  furColor: '#C9A227',
  furPattern: 'solid',
};

/**
 * 지금 지원하는 품종들.
 *
 * 닮은 동물 검색이 내놓는 결과가 여기 키와 맞아야 합니다.
 * 검색 쪽에서 지원 품종이 늘어나면 여기에도 프리셋을 추가하세요.
 */
export const BREEDS = {
  neutral: NEUTRAL_BREED,
  shiba: {
    ...NEUTRAL_BREED,
    label: '시바견',
    earAngle: -25,
    tailCurl: 0.9,
    snoutLength: 0.9,
    furColor: '#D89B5A',
  },
  retriever: {
    ...NEUTRAL_BREED,
    label: '골든 리트리버',
    earAngle: 65,
    earLength: 1.4,
    tailCurl: 0.2,
    bodyRatio: 1.15,
    furColor: '#E8C88A',
  },
  dachshund: {
    ...NEUTRAL_BREED,
    label: '닥스훈트',
    earAngle: 70,
    earLength: 1.5,
    snoutLength: 1.5,
    tailCurl: 0.1,
    bodyRatio: 2.1,
    furColor: '#8B5E3C',
  },
  poodle: {
    ...NEUTRAL_BREED,
    label: '푸들',
    earAngle: 55,
    earLength: 1.2,
    snoutLength: 1.1,
    tailCurl: 0.6,
    furColor: '#F0E4D4',
    furPattern: 'patch',
  },
} as const satisfies Record<string, BreedPreset>;

export type BreedId = keyof typeof BREEDS;

/** 아직 닮은 동물 검색 결과가 없을 때 쓸 품종. */
export const DEFAULT_BREED: BreedId = 'neutral';

/** 알 수 없는 품종 문자열이 들어와도 앱이 죽지 않게 걸러줍니다. */
export function resolveBreed(id: string | null | undefined): BreedId {
  return id != null && id in BREEDS ? (id as BreedId) : DEFAULT_BREED;
}

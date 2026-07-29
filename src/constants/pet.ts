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
  /**
   * 귀가 벌어진 각도(도). 0 ~ 170 범위.
   *   0~30   곧게 섬 (시바)
   *   30~90  비스듬히 벌어짐
   *   90~170 아래로 늘어짐 (리트리버·닥스훈트)
   * 리그에서 귀 뿌리를 축으로 좌우 대칭 회전에 그대로 씁니다.
   */
  earAngle: number;
  /** 귀 길이 배율. 1이 기본 */
  earLength: number;
  /** 주둥이 길이 배율. 1이 기본 */
  snoutLength: number;
  /** 꼬리 말림 정도. 0 = 축 처짐, 1 = 등 위로 완전히 말림 */
  tailCurl: number;
  /** 꼬리 길이 배율. 1 = 기본, 0.4 = 코기처럼 뭉툭하게 짧음 */
  tailLength: number;
  /** 몸통 가로/세로 비율. 클수록 닥스훈트처럼 길쭉해집니다 */
  bodyRatio: number;
  /** 기본 털색 */
  furColor: string;
  /** 무늬 종류 */
  furPattern: 'solid' | 'patch' | 'spotted';
  /**
   * 털 질감.
   * smooth = 매끈한 윤곽, curly = 곱슬(푸들처럼 윤곽이 물결칩니다).
   * 머리·귀·몸통 실루엣에만 적용되고 주둥이는 항상 매끈합니다.
   * (푸들은 실제로 주둥이 털을 짧게 미는 견종입니다.)
   */
  furTexture: 'smooth' | 'curly';
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
  earAngle: 45,
  earLength: 1,
  snoutLength: 1,
  tailCurl: 0.5,
  tailLength: 1,
  bodyRatio: 1,
  furColor: '#C9A227',
  furPattern: 'solid',
  furTexture: 'smooth',
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
    earAngle: 14,
    earLength: 0.85,
    tailCurl: 0.9,
    snoutLength: 0.9,
    furColor: '#D89B5A',
  },
  retriever: {
    ...NEUTRAL_BREED,
    label: '골든 리트리버',
    earAngle: 142,
    earLength: 1.25,
    tailCurl: 0.2,
    bodyRatio: 1.15,
    furColor: '#E8C88A',
  },
  dachshund: {
    ...NEUTRAL_BREED,
    label: '닥스훈트',
    earAngle: 155,
    earLength: 1.45,
    snoutLength: 1.5,
    tailCurl: 0.1,
    bodyRatio: 2.1,
    furColor: '#8B5E3C',
  },
  poodle: {
    ...NEUTRAL_BREED,
    label: '푸들',
    earAngle: 128,
    earLength: 1.1,
    snoutLength: 1.1,
    tailCurl: 0.6,
    furColor: '#F0E4D4',
    furPattern: 'solid',
    furTexture: 'curly',
  },
  beagle: {
    ...NEUTRAL_BREED,
    label: '비글',
    earAngle: 148,
    earLength: 1.3,
    snoutLength: 1.15,
    tailCurl: 0.55,
    bodyRatio: 1.05,
    furColor: '#C98A4B',
    // 비글은 실제로 얼굴·몸에 진한 얼룩이 있습니다
    furPattern: 'patch',
  },
  shihtzu: {
    ...NEUTRAL_BREED,
    label: '시츄',
    earAngle: 135,
    earLength: 1.3,
    // 코가 눌린 견종이라 주둥이가 아주 짧습니다
    snoutLength: 0.55,
    tailCurl: 0.85,
    furColor: '#E3C79A',
    furPattern: 'patch',
  },
  maltese: {
    ...NEUTRAL_BREED,
    label: '말티즈',
    earAngle: 130,
    earLength: 1.2,
    snoutLength: 0.75,
    tailCurl: 0.8,
    bodyRatio: 0.95,
    furColor: '#F2EDE4',
    furPattern: 'solid',
  },
  corgi: {
    ...NEUTRAL_BREED,
    label: '웰시코기',
    // 크고 곧게 선 귀가 코기의 특징입니다
    earAngle: 10,
    earLength: 1.15,
    snoutLength: 1,
    tailCurl: 0.3,
    // 꼬리가 뭉툭하게 짧습니다
    tailLength: 0.4,
    bodyRatio: 1.5,
    furColor: '#D98F4F',
    furPattern: 'solid',
  },
  chihuahua: {
    ...NEUTRAL_BREED,
    label: '치와와',
    // 몸에 비해 큼직하고 쫑긋 선 귀가 치와와의 상징입니다
    earAngle: 20,
    earLength: 1.4,
    // 코가 짧고 이마가 동그란 애플헤드
    snoutLength: 0.6,
    tailCurl: 0.5,
    // 품종 중 가장 작아서 몸통을 좁게 잡습니다
    bodyRatio: 0.82,
    furColor: '#E4C08A',
    furPattern: 'solid',
  },
  bichon: {
    ...NEUTRAL_BREED,
    label: '비숑프리제',
    // 귀가 복슬복슬한 털에 파묻혀 아래로 처져 보입니다
    earAngle: 122,
    earLength: 1,
    snoutLength: 0.75,
    tailCurl: 0.7,
    bodyRatio: 1,
    // 새하얗고 둥근 곱슬 솜뭉치
    furColor: '#F7F3EC',
    furPattern: 'solid',
    furTexture: 'curly',
  },
} as const satisfies Record<string, BreedPreset>;

export type BreedId = keyof typeof BREEDS;

/** 아직 닮은 동물 검색 결과가 없을 때 쓸 품종. */
export const DEFAULT_BREED: BreedId = 'neutral';

/** 알 수 없는 품종 문자열이 들어와도 앱이 죽지 않게 걸러줍니다. */
export function resolveBreed(id: string | null | undefined): BreedId {
  return id != null && id in BREEDS ? (id as BreedId) : DEFAULT_BREED;
}

/* ------------------------------------------------------------------ *
 * 생애 단계 — 다마고치처럼 키우면서 자라는 성장 축.
 *
 * 품종(생김새)·애니메이션(움직임)과 완전히 별개의 세 번째 축입니다.
 * 품종이 "무슨 강아지냐"라면, 단계는 "몇 살이냐"입니다.
 * 그래서 어떤 품종이든 네 단계를 똑같이 거칠 수 있고,
 * 단계가 늘어도 품종 프리셋은 손댈 필요가 없습니다.
 *
 * 게임 동작 담당이 나이(경험치·키운 시간 등)를 보고 단계 하나를 골라
 * `<PetCharacter stage={...} />`로 넘기면 됩니다.
 * ------------------------------------------------------------------ */

/**
 * 성장 순서대로 나열한 생애 단계.
 *   infant     영유아기 — 뽀짝한 아기. 머리가 크고 발이 유난히 크며 눈을 다 못 뜹니다
 *   adolescent 청소년기 — 말은 안 듣지만 미워할 수 없는, 아직 몸에 안 맞는 큰 귀·큰 발
 *   adult      청년     — 다 큰 기준 형태. 아무 보정도 없는 원점입니다
 *   senior     노년     — 눈이 조금 탁해지고 털이 희끗해지며 귀가 살짝 처집니다
 */
export const LIFE_STAGE_NAMES = ['infant', 'adolescent', 'adult', 'senior'] as const;

export type LifeStage = (typeof LIFE_STAGE_NAMES)[number];

/**
 * 한 단계가 캐릭터를 어떻게 보정하는지.
 *
 * 리그가 품종 프리셋 위에 이 값을 곱하거나 더해 최종 형태를 냅니다.
 * 전부 "기준(청년)에서 얼마나 벗어나는가"라서, 청년은 모든 값이 무보정입니다.
 */
export type StageModifier = {
  /** 목록·디버그 화면에 보여줄 한글 이름 */
  label: string;
  /** 머리 크기 배율. 아기일수록 머리가 커서 뽀짝합니다 */
  headScale: number;
  /** 몸통 크기 배율. 아기는 몸이 작고 옹송그립니다 */
  bodyScale: number;
  /** 발 크기 배율. 아기·청소년은 발만 먼저 커서 큼직합니다 */
  pawScale: number;
  /** 귀 길이 배율. 품종과 무관하게 아기는 작고 청소년은 큽니다 */
  earScale: number;
  /** 귀에 더해지는 처짐 각도(도). 클수록 더 아래로 처집니다 */
  earDroop: number;
  /** 눈 최대 개폐. 1이 활짝, 아기는 눈을 다 못 떠서 1보다 작습니다 */
  eyeOpenMax: number;
  /** 눈동자 탁함. 0 = 또렷, 1 = 뿌옇게. 노년에 올립니다 */
  eyeCloudiness: number;
  /** 털색 바램. 0 = 그대로, 1 = 희끗희끗. 노년에 올립니다 */
  furFade: number;
};

/** 모든 단계의 원점(=청년). 무보정 값이라 여기서부터 위아래로 벌립니다. */
export const NEUTRAL_STAGE: StageModifier = {
  label: '청년',
  headScale: 1,
  bodyScale: 1,
  pawScale: 1,
  earScale: 1,
  earDroop: 0,
  eyeOpenMax: 1,
  eyeCloudiness: 0,
  furFade: 0,
};

/** 네 단계의 보정값. */
export const LIFE_STAGES = {
  // 영유아기 — 머리 크고 발 큼직, 귀는 아직 작고 쳐짐, 눈은 다 못 뜸
  infant: {
    ...NEUTRAL_STAGE,
    label: '영유아기',
    headScale: 1.22,
    bodyScale: 0.82,
    pawScale: 1.5,
    earScale: 0.6,
    earDroop: 45,
    eyeOpenMax: 0.68,
  },
  // 청소년기 — 몸은 거의 다 컸는데 귀·발만 먼저 커서 비율이 어정쩡합니다
  adolescent: {
    ...NEUTRAL_STAGE,
    label: '청소년기',
    headScale: 0.98,
    bodyScale: 0.96,
    pawScale: 1.18,
    earScale: 1.15,
  },
  // 청년 — 다 큰 기준 형태
  adult: NEUTRAL_STAGE,
  // 노년 — 눈이 탁해지고 털이 희끗, 귀가 살짝 처지고 눈도 조금 처집니다
  senior: {
    ...NEUTRAL_STAGE,
    label: '노년',
    earDroop: 12,
    eyeOpenMax: 0.86,
    eyeCloudiness: 0.55,
    furFade: 0.4,
  },
} as const satisfies Record<LifeStage, StageModifier>;

/** 아직 나이 정보가 없을 때 쓸 단계. 다 큰 청년으로 그립니다. */
export const DEFAULT_STAGE: LifeStage = 'adult';

/** 알 수 없는 단계 문자열이 들어와도 앱이 죽지 않게 걸러줍니다. */
export function resolveStage(id: string | null | undefined): LifeStage {
  return id != null && id in LIFE_STAGES ? (id as LifeStage) : DEFAULT_STAGE;
}

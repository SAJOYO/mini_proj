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
 * FCI(국제애견연맹) 그룹 번호.
 *
 * 강아지 190여 종을 계통·용도에 따라 열 갈래로 묶은 분류입니다.
 * 품종을 하나하나 다 넣기 전에, 그룹별 대표 견종부터 채우는 뼈대로 씁니다.
 */
export type FciGroup = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

/**
 * 그룹 번호 → 한글 이름.
 *
 * 목록 화면에서 품종을 그룹별로 묶어 보여줄 때 씁니다.
 * 예시 견종은 각 그룹의 대표 몇 종입니다(전부가 아닙니다).
 */
export const FCI_GROUPS: Record<FciGroup, string> = {
  1: '1그룹 · 목양견 (보더콜리·셰퍼드·코기)',
  2: '2그룹 · 핀셔·슈나우저·마스티프 (도베르만)',
  3: '3그룹 · 테리어 (요크셔테리어)',
  4: '4그룹 · 닥스훈트',
  5: '5그룹 · 스피츠·원시견 (시바·포메·허스키)',
  6: '6그룹 · 후각 하운드 (비글)',
  7: '7그룹 · 포인터·세터 (조렵견)',
  8: '8그룹 · 리트리버·스패니얼·워터도그',
  9: '9그룹 · 반려·토이견 (푸들·말티즈·치와와)',
  10: '10그룹 · 시각 하운드 (그레이하운드)',
};

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
   * FCI 그룹. 목록을 계통별로 묶을 때 씁니다.
   * 원점(기본)처럼 특정 그룹에 속하지 않는 프리셋은 비워 둡니다.
   */
  group?: FciGroup;
  /**
   * 귀가 벌어진 각도(도). 0 ~ 170 범위.
   *   0~30   곧게 섬 (시바)
   *   30~90  비스듬히 벌어짐
   *   90~170 아래로 늘어짐 (리트리버·닥스훈트)
   * 리그에서 귀 뿌리를 축으로 좌우 대칭 회전에 그대로 씁니다.
   */
  earAngle: number;
  /** 귀 길이 배율. 1이 기본. 0이면 귀를 아예 안 그립니다(미용으로 파묻힌 비숑) */
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
  /**
   * 얼굴·귀 색. 없으면 furColor를 그대로 씁니다.
   *
   * 요크셔처럼 "몸은 회색, 얼굴은 황갈색"인 품종을 위한 값입니다.
   * 이건 얼룩(furPattern)이 아닙니다. 얼룩은 몸 위에 다른 색 반점을 얹는
   * 것이고, 이건 부위 전체가 다른 색인 경우라 별도 값이 필요합니다.
   * 무늬로 흉내내면 "얼굴에 큰 점이 있는 개"가 됩니다.
   */
  faceColor?: string;
  /**
   * 등에 얹히는 안장(saddle) 색. 없으면 안 그립니다.
   *
   * 요크셔의 회색 등, 비글의 검은 등처럼 "등판만 색이 다른" 무늬입니다.
   * 개의 두 톤은 대부분 머리/몸이 아니라 **등/배**로 갈립니다. 요크셔도
   * 가슴·다리는 얼굴과 같은 황갈색이고 등만 회색입니다. 그래서 머리와 몸을
   * 통째로 다른 색으로 칠하면 목에서 색이 뚝 끊겨 부자연스러워집니다.
   */
  saddleColor?: string;
  /**
   * 탄 포인트 색 — 주둥이·가슴·발에 들어가는 밝은 얼룩. 없으면 털색을 밝게 해서 씁니다.
   *
   * 도베르만처럼 "온몸은 검은데 주둥이·가슴·발만 갈색"인 품종을 위한 값입니다.
   * 이 세 자리는 어느 품종에서든 같이 밝아지므로 한 값으로 묶습니다.
   */
  pointColor?: string;
  /** 무늬 종류 */
  furPattern: 'solid' | 'patch' | 'spotted';
  /**
   * 털 질감.
   *   smooth 매끈한 윤곽
   *   curly  곱슬 — 푸들처럼 윤곽이 물결칩니다
   *   long   장모 — 요크셔처럼 귀와 얼굴 옆으로 털이 흘러내립니다
   * 머리·귀·몸통 실루엣에만 적용되고 주둥이는 항상 매끈합니다.
   * (푸들은 실제로 주둥이 털을 짧게 미는 견종입니다.)
   */
  furTexture: 'smooth' | 'curly' | 'long';
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
    group: 5,
    earAngle: 14,
    earLength: 0.85,
    tailCurl: 0.9,
    snoutLength: 0.9,
    furColor: '#D89B5A',
  },
  retriever: {
    ...NEUTRAL_BREED,
    label: '골든 리트리버',
    group: 8,
    earAngle: 142,
    earLength: 1.25,
    tailCurl: 0.2,
    bodyRatio: 1.15,
    furColor: '#E8C88A',
  },
  dachshund: {
    ...NEUTRAL_BREED,
    label: '닥스훈트',
    group: 4,
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
    group: 9,
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
    group: 6,
    earAngle: 148,
    earLength: 1.3,
    snoutLength: 1.15,
    tailCurl: 0.55,
    bodyRatio: 1.05,
    // 비글은 검정·흰색·갈색 세 가지 색이 자리별로 나뉩니다.
    //   흰색  가슴·배·다리·발 (바탕)
    //   검정  등 (안장)
    //   갈색  머리와 귀
    furColor: '#F2EADF',
    faceColor: '#C1803D',
    saddleColor: '#332F2C',
    furPattern: 'solid',
  },
  shihtzu: {
    ...NEUTRAL_BREED,
    label: '시츄',
    group: 9,
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
    group: 9,
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
    group: 1,
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
    group: 9,
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
    group: 9,
    // 둥글게 미용한 머리에 귀가 완전히 파묻혀, 실제로도 귀가 안 보입니다.
    // 억지로 그리면 솜뭉치에서 잎사귀가 튀어나온 것처럼 됩니다.
    earAngle: 122,
    earLength: 0,
    snoutLength: 0.75,
    tailCurl: 0.7,
    bodyRatio: 1,
    // 새하얗고 둥근 곱슬 솜뭉치
    furColor: '#F7F3EC',
    furPattern: 'solid',
    furTexture: 'curly',
  },

  /* --- 비어 있던 그룹을 채우는 대표 견종 --- */

  // 2그룹 — 도베르만. 쫑긋 세운 귀, 긴 주둥이, 짧게 자른 꼬리에 매끈한 검은 몸.
  doberman: {
    ...NEUTRAL_BREED,
    label: '도베르만',
    group: 2,
    earAngle: 16,
    earLength: 1.1,
    snoutLength: 1.3,
    tailCurl: 0.15,
    // 단미 — 꼬리가 짧습니다
    tailLength: 0.5,
    bodyRatio: 1.15,
    // 온몸이 검고, 주둥이·가슴·발만 붉은 갈색(탄 포인트).
    // 얼룩으로 흉내내면 "검은 개에 갈색 반점"이 되는데, 실제로는 반점이 아니라
    // 정해진 자리에만 들어가는 무늬라 pointColor로 처리합니다.
    furColor: '#2B2422',
    pointColor: '#8E5230',
    furPattern: 'solid',
  },
  // 3그룹 — 요크셔테리어. 작은 몸에 쫑긋한 귀, 짧은 주둥이, 찰랑이는 실키 코트.
  yorkshire: {
    ...NEUTRAL_BREED,
    label: '요크셔테리어',
    group: 3,
    earAngle: 22,
    earLength: 0.85,
    snoutLength: 0.8,
    tailCurl: 0.35,
    // 손바닥만 한 토이 테리어라 몸이 작습니다
    bodyRatio: 0.85,
    // 얼굴·가슴·다리가 전부 황갈색이고, 스틸블루 회색은 등에만 얹힙니다.
    // 머리와 몸을 통째로 갈랐더니 목에서 색이 뚝 끊겨 어색했습니다.
    furColor: '#BE8B4F',
    saddleColor: '#8A8A93',
    furPattern: 'solid',
    // 귀 바깥쪽 가장자리로 뻗는 긴 털
    furTexture: 'long',
  },
  // 7그룹 — 포인터. 길게 늘어진 귀와 긴 주둥이, 흰 바탕에 간 무늬(spotted)의 조렵견.
  pointer: {
    ...NEUTRAL_BREED,
    label: '포인터',
    group: 7,
    earAngle: 138,
    earLength: 1.25,
    snoutLength: 1.35,
    tailCurl: 0.2,
    bodyRatio: 1.1,
    furColor: '#EDE3D6',
    // 흰 바탕에 간(liver) 반점
    furPattern: 'spotted',
  },
  // 10그룹 — 그레이하운드. 뒤로 접힌 작은 장미귀, 아주 긴 주둥이, 길고 낮은 꼬리.
  greyhound: {
    ...NEUTRAL_BREED,
    label: '그레이하운드',
    group: 10,
    // 평소엔 뒤로 착 접혀 있어 각도를 눕히고 길이를 줄입니다
    earAngle: 100,
    earLength: 0.8,
    // 시각 하운드 특유의 길고 뾰족한 주둥이
    snoutLength: 1.55,
    // 다리 사이로 말려드는 길고 얇은 꼬리
    tailCurl: 0.05,
    tailLength: 1.2,
    bodyRatio: 0.95,
    furColor: '#C3AE93',
    furPattern: 'solid',
  },

  // 카발리에 킹 찰스 스패니얼 — 9그룹 토이 스패니얼.
  // 크고 동그란 눈, 둥근 얼굴, 길게 늘어진 깃털 귀가 특징이라
  // 흔히 말하는 "강아지상" 얼굴에 대응되는 자리를 채웁니다.
  cavalier: {
    ...NEUTRAL_BREED,
    label: '카발리에',
    group: 9,
    // 얼굴 옆으로 길고 부드럽게 늘어진 깃털 귀
    earAngle: 145,
    earLength: 1.35,
    // 짧고 귀여운 주둥이 — 코가 짧을수록 눈이 더 커 보여 동안이 됩니다
    snoutLength: 0.7,
    // 길고 풍성한 깃털 꼬리를 등 높이에서 늘어뜨립니다.
    // curl 0.3~0.5 구간은 꼬리가 나갔다가 같은 높이로 되돌아와서
    // 옆으로 뻗은 통나무처럼 보입니다. 그 구간을 피해 낮게 잡았습니다.
    tailCurl: 0.2,
    tailLength: 1.2,
    // 작고 동그란 토이 스패니얼
    bodyRatio: 0.95,
    // 루비 컬러 — 따뜻한 밤색 단색
    furColor: '#B5713F',
    furPattern: 'solid',
  },

  // 5그룹 — 진돗개. 곧게 선 삼각 귀, 쐐기형 얼굴, 등 위로 단단히 말린 꼬리.
  // 백구도 있지만 말티즈·비숑과 겹치지 않도록 황구로 잡았습니다.
  jindo: {
    ...NEUTRAL_BREED,
    label: '진돗개',
    group: 5,
    earAngle: 12,
    earLength: 0.95,
    // 주둥이가 길고 곧게 뻗은 쐐기형 얼굴
    snoutLength: 1.15,
    // 등에 딱 붙게 말리는 꼬리가 진돗개의 큰 특징입니다
    tailCurl: 0.95,
    tailLength: 0.9,
    bodyRatio: 1,
    furColor: '#D69C4F',
    furPattern: 'solid',
  },

  // 5그룹 — 포메라니안. 여우 같은 작은 얼굴에 몸집의 배는 되어 보이는 솜털.
  pomeranian: {
    ...NEUTRAL_BREED,
    label: '포메라니안',
    group: 5,
    // 털에 반쯤 파묻힌 작고 쫑긋한 귀
    earAngle: 15,
    earLength: 0.55,
    // 짧고 뾰족한 여우 주둥이
    snoutLength: 0.75,
    // 등 위로 활짝 펼쳐 얹히는 깃털 꼬리
    tailCurl: 1,
    tailLength: 0.85,
    bodyRatio: 0.95,
    furColor: '#E8C48D',
    furPattern: 'solid',
    // 곱슬은 아니지만, 물결치는 윤곽이 이 크기에서는 복슬복슬함으로 읽힙니다
    furTexture: 'curly',
  },

  // 5그룹 — 포메라니안 곰돌이컷. 같은 품종을 미용만 다르게 한 변형입니다.
  // 머리를 동그란 공처럼 다듬고 귀를 짧게 남겨, 얼굴만 진한 주황이고
  // 몸은 밝은 크림으로 갈립니다.
  pomeranianTeddy: {
    ...NEUTRAL_BREED,
    label: '포메(곰돌이컷)',
    group: 5,
    // 미용으로 거의 안 보이게 다듬은 귀
    earAngle: 15,
    earLength: 0.35,
    // 곰인형처럼 뭉툭하게 눌린 주둥이
    snoutLength: 0.6,
    tailCurl: 1,
    tailLength: 0.8,
    bodyRatio: 0.95,
    furColor: '#F2E6D2',
    faceColor: '#D89A4E',
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

/**
 * 품종을 FCI 그룹별로 묶어 돌려줍니다.
 *
 * 그룹이 없는 원점(neutral)은 빠지고, 그룹 번호 순(1→10)으로 정렬됩니다.
 * 목록 화면에서 "그룹 → 그 그룹의 품종들" 꼴로 뿌릴 때 씁니다.
 */
export function breedsByGroup(): { group: FciGroup; label: string; breeds: BreedId[] }[] {
  const ids = Object.keys(BREEDS) as BreedId[];
  return (Object.keys(FCI_GROUPS) as unknown as FciGroup[])
    .map(Number)
    .sort((a, b) => a - b)
    .map((group) => ({
      group: group as FciGroup,
      label: FCI_GROUPS[group as FciGroup],
      breeds: ids.filter((id) => BREEDS[id].group === group),
    }))
    .filter((g) => g.breeds.length > 0);
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

/**
 * 성격 축 — 조정 지점 ①.
 *
 * "성격을 무엇으로 재는가"가 이 파일의 전부입니다. 축의 이름·기본값·구간
 * 경계·특성 이름을 고치고 싶으면 여기만 열면 됩니다. 축 값을 어떻게
 * 계산하는지(블렌드·합성)는 `synthesize.ts`가, 품종별 수치는 `presets.ts`가
 * 갖습니다.
 */

/**
 * 축 값이 놓인 구간.
 *
 * 3단계로는 성격이 안 갈립니다. 자존심 70과 92가 같은 칸에 들어가면
 * 대사 담당이 둘을 구별할 방법이 없습니다.
 */
export type Band = 'very_low' | 'low' | 'mid' | 'high' | 'very_high';

/** 낮은 쪽부터 순서대로. 구간 판정과 특성 조회가 이 순서를 씁니다. */
export const BANDS: readonly Band[] = ['very_low', 'low', 'mid', 'high', 'very_high'];

type AxisDef = {
  /** 디버그·결과 화면에 보여줄 한글 이름 */
  readonly label: string;
  /** 이 축이 뭘 재는지. 헷갈릴 때 여기부터 읽으세요 */
  readonly description: string;
  /** 프리셋에 값이 없는 품종이 쓸 기본값 */
  readonly default: number;
  /**
   * 구간 경계 `[very_low 상한, low 상한, mid 상한, high 상한]`.
   * `[20, 40, 60, 80]`이면 0~20 / 21~40 / 41~60 / 61~80 / 81~100.
   * 특정 축만 판정을 빡빡하게 하고 싶으면 이 숫자만 조정하세요.
   */
  readonly cuts: readonly [number, number, number, number];
  /** 구간별 특성 이름. `BANDS`와 같은 순서 (낮은 쪽부터) */
  readonly traits: readonly [string, string, string, string, string];
};

/**
 * 성격 축 목록.
 *
 * ── 축을 고칠 때 ──────────────────────────────────────────
 * 추가: 아래에 항목 하나를 더 씁니다. 프리셋(`presets.ts`)이 `Partial`이라
 *       기존 품종들은 `default` 값으로 돌아가고, 아무것도 깨지지 않습니다.
 *       나중에 품종별로 하나씩 채워 넣으면 됩니다.
 * 삭제: 항목을 지우면 타입스크립트가 그 축을 참조하던 곳을 전부 짚어줍니다.
 * 조정: `cuts`(판정 경계) · `traits`(특성 이름)는 각각 한 줄만 고치면 끝입니다.
 *
 * 파생 로직은 전부 이 객체를 순회하기 때문에, 축이 늘어도 코드는 안 늘어납니다.
 */
export const AXES = {
  attachment: {
    label: '애착',
    description: '사람 곁에 있고 싶어하는가, 혼자가 편한가',
    default: 50,
    cuts: [20, 40, 60, 80],
    traits: ['혼자가 편함', '거리를 둠', '적당함', '곁에 있고 싶어함', '껌딱지'],
  },
  expression: {
    label: '표현',
    description: '그 마음을 겉으로 내는가, 안으로 삼키는가',
    default: 50,
    cuts: [20, 40, 60, 80],
    traits: ['속을 감춤', '무뚝뚝', '보통', '솔직함', '전부 티 냄'],
  },
  sensitivity: {
    label: '예민함',
    description: '작은 자극에 크게 반응하는가, 웬만해선 꿈쩍 않는가',
    default: 50,
    cuts: [20, 40, 60, 80],
    traits: ['강심장', '무던함', '보통', '섬세함', '예민함'],
  },
  curiosity: {
    label: '호기심',
    description: '새로운 것에 끌리는가, 익숙한 것을 선호하는가',
    default: 50,
    cuts: [20, 40, 60, 80],
    traits: ['겁 많음', '신중함', '보통', '호기심 많음', '겁 없음'],
  },
  optimism: {
    label: '낙천성',
    description: '기본 정서의 온도. 밝은 쪽인가 가라앉은 쪽인가',
    default: 50,
    cuts: [20, 40, 60, 80],
    traits: ['시무룩', '소심함', '담담함', '긍정적', '낙천'],
  },
} as const satisfies Record<string, AxisDef>;

export type AxisKey = keyof typeof AXES;

/** 축 전체의 값 묶음. 0~100. */
export type Axes = Record<AxisKey, number>;

/** 축 키 목록. 파생 로직이 전부 이걸 순회합니다. */
export const AXIS_KEYS = Object.keys(AXES) as AxisKey[];

/** 축 값이 어느 구간에 놓였는지. `cuts` 길이가 바뀌어도 그대로 동작합니다. */
export function bandOf(key: AxisKey, value: number): Band {
  const cuts = AXES[key].cuts;
  for (let i = 0; i < cuts.length; i++) {
    if (value <= cuts[i]) return BANDS[i];
  }
  return BANDS[cuts.length];
}

/** 축 값에 붙는 특성 이름. */
export function traitOf(key: AxisKey, value: number): string {
  return AXES[key].traits[BANDS.indexOf(bandOf(key, value))];
}

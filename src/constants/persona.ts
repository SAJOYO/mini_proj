/**
 * 성격 계약(contract).
 *
 * 닮은 동물 검색이 내놓은 품종 혼합 비율을 받아, 그 캐릭터가 "어떤 애인가"를 서술합니다.
 *
 *   닮은 동물 검색 → 품종 혼합 비율(`BreedMix`)을 만들어 넘깁니다.
 *   이 파일        → 비율을 성격 축으로 환산하고, 특성과 아키타입을 붙입니다.
 *   대사 / 애니메이션 → 나온 성격을 읽고, 각자 말투와 동작을 정합니다.
 *
 * ── 이 파일이 하지 않는 일 ──────────────────────────────────
 * 여기 있는 축은 전부 "성향"만 말합니다. 행동을 지시하지 않습니다.
 *   - 대사를 몇 자로 쓸지, 언제 침묵할지  → 대사 담당이 정합니다.
 *   - 어떤 동작을 얼마나 자주 재생할지    → 애니메이션 담당이 정합니다.
 *   - 밥을 얼마나 빨리 배고파할지         → 게임 상태 시스템이 정합니다.
 *
 * 그래서 이 파일의 출력에는 말투 규칙도, 동작 목록도, 금지사항도 없습니다.
 * `axes`와 `bands`를 읽고 각자 자기 영역에서 해석하세요.
 * 행동 축이 필요해지면 담당자와 합의한 뒤 `AXES`에 추가하면 됩니다.
 *
 * `pet.ts`(생김새)와는 분리돼 있습니다. 겉모습은 1순위 품종을 그대로 쓰고,
 * 성격만 혼합 비율 전체를 씁니다.
 */

import { BREEDS, type BreedId } from '@/constants/pet';

/* ------------------------------------------------------------------ *
 * 성격 축 — 이 파일에서 제일 먼저 보고, 제일 자주 고칠 곳
 * ------------------------------------------------------------------ */

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
 * 추가: 아래에 항목 하나를 더 씁니다. 프리셋이 `Partial`이라
 *       기존 품종들은 `default` 값으로 돌아가고, 아무것도 깨지지 않습니다.
 *       나중에 품종별로 하나씩 채워 넣으면 됩니다.
 * 삭제: 항목을 지우면 타입스크립트가 그 축을 참조하던 곳을 전부 짚어줍니다.
 * 조정: `cuts`(판정 경계) · `traits`(특성 이름)는 각각 한 줄만 고치면 끝입니다.
 *
 * 아래 파생 로직은 전부 이 객체를 순회하기 때문에, 축이 늘어도 코드는 안 늘어납니다.
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

/* ------------------------------------------------------------------ *
 * 품종별 성격 프리셋
 * ------------------------------------------------------------------ */

/**
 * 품종마다의 성격 기본값.
 *
 * `Partial`인 게 중요합니다. 축을 새로 추가해도 여기 여덟 줄이 컴파일 에러를 내지 않고,
 * 값을 안 적은 축은 `AXES`의 `default`로 조용히 돌아갑니다.
 * (전부 필수로 잡으면 축 하나 늘릴 때마다 아홉 군데를 고쳐야 해서, 결국 안 고치게 됩니다.)
 *
 * ── 값을 고칠 때 조심할 것 ─────────────────────────────────
 * 축을 여러 개 두는 이유는 서로 다른 걸 재기 위해서입니다. 그런데 "친근한 개"를
 * 떠올리며 값을 채우면 여러 축이 한 덩어리로 움직여서, 축은 여러 개인데 실제로는
 * 하나인 상태가 됩니다. 예전 프리셋이 그랬습니다(애정표현과 독립성이 r = -0.92).
 *
 * 특히 애착과 표현은 **일부러 어긋나게** 배치했습니다. 둘이 붙어 있으면
 * "곁에 있고 싶은데 티는 안 내는" 캐릭터가 아예 나올 수 없습니다.
 *
 *               표현 낮음        표현 높음
 *   애착 높음   닥스훈트         리트리버 · 말티즈
 *   애착 낮음   시바             비글
 *
 * 값을 조정할 땐 네 칸이 계속 차 있는지 확인하세요.
 */
const BREED_AXES: Record<BreedId, Partial<Axes>> = {
  // 모든 품종의 원점. 전부 기본값(50)으로 둡니다.
  neutral: {},

  // 애착 낮음 · 표현 낮음 — 무심한 독립러
  shiba: { attachment: 15, expression: 20, sensitivity: 50, curiosity: 60, optimism: 55 },

  // 애착 높음 · 표현 높음 — 껌딱지 애교쟁이
  retriever: { attachment: 88, expression: 92, sensitivity: 25, curiosity: 70, optimism: 95 },

  // 애착 높음 · 표현 낮음 — 츤데레. 주인에게 집착하면서도 고집이 세고 티를 안 냅니다
  dachshund: { attachment: 72, expression: 30, sensitivity: 70, curiosity: 88, optimism: 68 },

  // 예민한데 밝습니다. 예민함과 낙천성이 한 덩어리로 묶이지 않게 하는 축입니다
  poodle: { attachment: 62, expression: 65, sensitivity: 85, curiosity: 82, optimism: 82 },

  // 애착 낮음 · 표현 높음 — 사람은 좋아하는데 냄새 따라 가버립니다
  beagle: { attachment: 35, expression: 90, sensitivity: 20, curiosity: 95, optimism: 88 },

  shihtzu: { attachment: 80, expression: 58, sensitivity: 45, curiosity: 30, optimism: 80 },

  // 붙고 표현도 하는데 예민하고 잘 시무룩해집니다
  maltese: { attachment: 95, expression: 85, sensitivity: 92, curiosity: 40, optimism: 40 },

  corgi: { attachment: 55, expression: 78, sensitivity: 35, curiosity: 88, optimism: 82 },
};

/** 프리셋에 빠진 축을 기본값으로 채워서 완전한 축 묶음을 만듭니다. */
function axesOf(breed: BreedId): Axes {
  const partial = BREED_AXES[breed];
  const out = {} as Axes;
  for (const key of AXIS_KEYS) {
    out[key] = partial[key] ?? AXES[key].default;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 혼합 비율
 * ------------------------------------------------------------------ */

/**
 * 품종 혼합 비율.
 *
 * 닮은 동물 검색이 단일 품종만 내놓더라도 `[{ breed, ratio: 100 }]`으로 표현되므로,
 * 이 파일은 단일이든 혼합이든 똑같이 받습니다.
 */
export type BreedMix = { breed: BreedId; ratio: number }[];

/** 아직 검색 결과가 없을 때 쓸 혼합. */
export const DEFAULT_MIX: BreedMix = [{ breed: 'neutral', ratio: 100 }];

/**
 * 밖에서 들어온 값(검색 결과·저장소)을 안전한 `BreedMix`로 정리합니다.
 *
 * 모르는 품종은 버리고, 비율 합이 100이 아니어도 알아서 정규화합니다.
 * 쓸 만한 게 하나도 없으면 `DEFAULT_MIX`를 돌려줍니다.
 * (`pet.ts`의 `resolveBreed`와 같은 역할입니다.)
 */
export function resolveMix(raw: unknown): BreedMix {
  if (!Array.isArray(raw)) return DEFAULT_MIX;

  // 같은 품종이 여러 번 오면 합칩니다. 안 합치면 지분 1위가 잘못 잡혀서
  // 성격의 기준점 자체가 틀어집니다. (시바 30 + 시바 20 + 코기 50 → 코기가 대표)
  const merged = new Map<BreedId, number>();

  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const { breed, ratio } = item as { breed?: unknown; ratio?: unknown };
    if (typeof breed !== 'string' || !(breed in BREEDS)) continue;
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) continue;

    const id = breed as BreedId;
    merged.set(id, (merged.get(id) ?? 0) + ratio);
  }

  if (merged.size === 0) return DEFAULT_MIX;

  const total = [...merged.values()].reduce((sum, ratio) => sum + ratio, 0);
  return [...merged]
    .map(([breed, ratio]) => ({ breed, ratio: (ratio / total) * 100 }))
    .sort((a, b) => b.ratio - a.ratio);
}

/** 혼합에서 지분이 가장 큰 품종. 생김새는 이 품종으로 그리면 됩니다. */
export function dominantBreed(mix: BreedMix): BreedId {
  return resolveMix(mix)[0].breed;
}

/* ------------------------------------------------------------------ *
 * 블렌드 → 구간 → 아키타입
 * ------------------------------------------------------------------ */

/**
 * 보조 품종이 대표 품종에서 값을 끌어당길 수 있는 최대 폭.
 *
 * 지분에 비례해 줄어듭니다. 50:50이면 20, 3등분이면 26쯤,
 * 단독 품종이면 0 — 즉 프리셋에 적은 값이 그대로 나옵니다.
 *
 * 이 숫자 하나가 "혼합이 성격을 얼마나 흔드는가"를 정합니다.
 * 키우면 혼합 캐릭터가 대표 품종에서 멀어지고, 줄이면 대표 품종에 붙습니다.
 */
const MAX_SHIFT_AT_EVEN = 40;

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * 혼합 비율을 성격 축 하나로 합칩니다. `mix`는 지분 내림차순이어야 합니다.
 *
 * ── 왜 평균이 아니라 대표 품종 기준인가 ────────────────────
 * 가중평균은 섞을수록 값을 중앙(50)으로 끌어당깁니다. 3품종을 섞으면
 * 전부 밍밍해져서, 정작 혼합이 목적인데 혼합할수록 개성이 사라집니다.
 *
 * 대표 품종을 기준점으로 두면 애초에 중앙을 지나가지 않습니다.
 * 보정이 필요한 게 아니라 보정할 일이 없어집니다.
 *
 * 그리고 겉모습도 대표 품종으로 그리기 때문에(`pet.ts`),
 * "시바처럼 생겼는데 성격은 평균값" 같은 괴리가 생기지 않습니다.
 *
 * 축마다 합치는 방식을 달리 두던 방식(max/min/dominant)은 버렸습니다.
 * 15%밖에 안 섞인 품종이 특정 축을 통째로 지배해서, 지분이 더는
 * 영향력의 비율이 아니게 되기 때문입니다.
 */
function blendAxis(key: AxisKey, mix: BreedMix): number {
  const [dominant, ...rest] = mix;
  const base = axesOf(dominant.breed)[key];
  if (rest.length === 0) return clamp(base);

  // 보조 품종들이 각자 지분만큼 대표 품종 값에서 끌어당깁니다.
  const pull = rest.reduce(
    (sum, item) => sum + (item.ratio / 100) * (axesOf(item.breed)[key] - base),
    0,
  );
  const maxShift = (MAX_SHIFT_AT_EVEN * (100 - dominant.ratio)) / 100;

  return clamp(base + Math.max(-maxShift, Math.min(maxShift, pull)));
}

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

/* ------------------------------------------------------------------ *
 * 아키타입 — UI에 보여줄 한 줄 요약
 * ------------------------------------------------------------------ */

/**
 * 축의 양 끝에 붙는 이름.
 *
 * 고정된 축 쌍으로 조합표를 만들면 두 가지가 문제였습니다.
 * 짝지어진 축만 쓰이고 나머지는 놀며, 구간이 늘어나면 표가 `5×5`로 불어납니다.
 *
 * 그래서 표를 버리고, 그 캐릭터에서 **가장 튀는 축 두 개**를 그때그때 뽑습니다.
 * 축이 몇 개든 구간이 몇 개든 여기 목록만 있으면 되고, 안 쓰이는 축도 없습니다.
 *
 * 이 태그는 결과 화면에도 뜨고 대사 프롬프트에도 들어갑니다. 모델이 이걸 앵커
 * 삼아 연기하기 때문에, 어휘가 곧 연기 톤이 됩니다. 놀리는 말은 쓰지 마세요.
 */
type AxisName = { readonly adj: string; readonly noun: string };

const NAMES: Record<AxisKey, { low: AxisName; high: AxisName }> = {
  attachment: {
    low: { adj: '혼자 있는', noun: '독립러' },
    high: { adj: '들러붙는', noun: '껌딱지' },
  },
  expression: {
    low: { adj: '무뚝뚝한', noun: '새침이' },
    high: { adj: '솔직한', noun: '애교쟁이' },
  },
  sensitivity: {
    low: { adj: '무던한', noun: '강심장' },
    high: { adj: '섬세한', noun: '눈치백단' },
  },
  curiosity: {
    low: { adj: '조심스러운', noun: '신중파' },
    high: { adj: '호기심 많은', noun: '탐험가' },
  },
  optimism: {
    low: { adj: '시무룩한', noun: '걱정쟁이' },
    high: { adj: '밝은', noun: '낙천가' },
  },
};

/** 튀는 축이 하나도 없을 때. */
const FLAT_ARCHETYPE = '평범한 동거인';

/**
 * 가장 튀는 축 두 개로 한 줄 이름을 만듭니다.
 *
 * 1위 축이 중심어(명사), 2위 축이 수식어(형용사)가 됩니다.
 * `mid` 구간인 축은 애초에 후보가 아닙니다 — 특징이 없다는 뜻이니까요.
 * 동점이면 `AXES`에 선언된 순서로 갈립니다(같은 입력이면 항상 같은 결과).
 */
function archetypeOf(axes: Axes, bands: Record<AxisKey, Band>): string {
  const side = (key: AxisKey) => (axes[key] < 50 ? 'low' : 'high');

  const ranked = AXIS_KEYS.filter((key) => bands[key] !== 'mid')
    .map((key) => ({ key, dist: Math.abs(axes[key] - 50) }))
    .sort((a, b) => b.dist - a.dist || AXIS_KEYS.indexOf(a.key) - AXIS_KEYS.indexOf(b.key));

  if (ranked.length === 0) return FLAT_ARCHETYPE;

  const noun = NAMES[ranked[0].key][side(ranked[0].key)].noun;
  if (ranked.length === 1) return noun;

  return `${NAMES[ranked[1].key][side(ranked[1].key)].adj} ${noun}`;
}

/* ------------------------------------------------------------------ *
 * 서술 — 성격을 한 문단으로
 * ------------------------------------------------------------------ */

/**
 * 구간마다의 서술 조각.
 *
 * 태그(`archetype`)가 한 단어 요약이라면, 이건 성격의 실체입니다.
 * 대사 담당이 프롬프트에 그대로 넣을 수 있게 완성된 문장으로 씁니다.
 *
 * `mid`가 `null`인 게 핵심입니다. 다섯 축을 전부 채우면
 * "적당하고, 보통이고, 적당히" 범벅이 됩니다. 특징 없는 축은 할 말이 없습니다.
 * 튀는 축만 문장에 남고, 캐릭터가 뚜렷할수록 문단이 길어집니다.
 *
 * 어디까지나 **성격 서술**입니다. "먼저 말을 걸지 않는다" 같은 말투 지시는
 * 여기 쓰지 마세요 — 그건 대사 담당이 정합니다. 파일 맨 위 설명을 보세요.
 */
const CLAUSES: Record<AxisKey, Record<Band, string | null>> = {
  attachment: {
    very_low: '사람 곁에 굳이 있으려 하지 않는다',
    low: '적당히 거리를 두는 편이다',
    mid: null,
    high: '곁에 있고 싶어한다',
    very_high: '한시도 떨어지기 싫어한다',
  },
  expression: {
    very_low: '속마음을 거의 드러내지 않는다',
    low: '마음을 잘 드러내지 않는다',
    mid: null,
    high: '마음을 곧잘 드러낸다',
    very_high: '느끼는 걸 전부 티 낸다',
  },
  sensitivity: {
    very_low: '웬만한 일에는 꿈쩍도 하지 않는다',
    low: '어지간한 건 그냥 넘긴다',
    mid: null,
    high: '작은 변화도 금방 알아챈다',
    very_high: '사소한 것에도 크게 반응한다',
  },
  curiosity: {
    very_low: '낯선 것은 피한다',
    low: '익숙한 쪽을 좋아한다',
    mid: null,
    high: '새로운 것에 먼저 다가간다',
    very_high: '뭐든 일단 들이대고 본다',
  },
  optimism: {
    very_low: '무슨 일이든 나쁜 쪽으로 생각한다',
    low: '쉽게 시무룩해진다',
    mid: null,
    high: '대체로 기분이 좋다',
    very_high: '무슨 일이 있어도 금방 밝아진다',
  },
};

/** 튀는 축이 하나도 없을 때. */
const FLAT_DESCRIPTION = '특별히 튀는 구석이 없는 성격이다.';

/** 애착과 표현이 어긋날 때 앞에 붙일 말. 이 한 단어가 츤데레를 만듭니다. */
const MISMATCH_MARKER = '다만 ';

/**
 * 성격을 한 문단으로 씁니다.
 *
 * 애착과 표현은 한 문장으로 묶습니다. 둘이 어긋날 때 "다만"을 끼워 넣는 게
 * 이 함수의 요점입니다. 조각을 따로 나열하면 그 긴장이 안 보입니다.
 *
 *   애착↑ 표현↑  곁에 있고 싶어한다. 마음을 곧잘 드러낸다.
 *   애착↑ 표현↓  곁에 있고 싶어한다. 다만 마음을 잘 드러내지 않는다.
 */
function describe(axes: Axes, bands: Record<AxisKey, Band>): string {
  const clause = (key: AxisKey) => CLAUSES[key][bands[key]];
  const sentences: string[] = [];

  const attachment = clause('attachment');
  const expression = clause('expression');

  if (attachment && expression) {
    // 한쪽은 붙고 싶은데 다른 쪽은 티를 안 내는 식이면 그 어긋남을 드러냅니다.
    const sameWay = axes.attachment > 50 === axes.expression > 50;
    sentences.push(attachment, (sameWay ? '' : MISMATCH_MARKER) + expression);
  } else if (attachment ?? expression) {
    sentences.push((attachment ?? expression) as string);
  }

  for (const key of ['sensitivity', 'curiosity', 'optimism'] as const) {
    const rest = clause(key);
    if (rest) sentences.push(rest);
  }

  return sentences.length === 0 ? FLAT_DESCRIPTION : `${sentences.join('. ')}.`;
}

/* ------------------------------------------------------------------ *
 * 공개 API
 * ------------------------------------------------------------------ */

/**
 * 한 캐릭터의 성격.
 *
 * 이게 대사·애니메이션 쪽에 넘어가는 전부입니다.
 * 말투 규칙이나 동작 목록이 여기 없는 건 의도된 것입니다 — 파일 맨 위 설명을 보세요.
 */
export type PersonaCard = {
  /** 이 성격을 만들어낸 혼합 비율. 이것만 저장해두면 나머지는 전부 다시 만들 수 있습니다 */
  mix: BreedMix;
  /** 축별 최종 값 (0~100) */
  axes: Axes;
  /** 축별 구간 */
  bands: Record<AxisKey, Band>;
  /** 구간에서 나온 특성 이름들. 결과 화면에 그대로 뿌려도 됩니다 */
  traits: string[];
  /**
   * 가장 튀는 축 두 개로 만든 한 줄 이름. 예: "혼자 있는 새침이"
   *
   * 결과 화면의 태그이자, 대사 프롬프트에서 모델이 잡는 연기의 앵커입니다.
   * 축 값에서 계산되므로 `description`과 어긋날 수 없습니다.
   * 다만 한 단어라 통념 쪽으로 과장되기 쉬우니, 프롬프트에 넣을 땐
   * "이건 요약이고 실제 기준은 아래"라고 우선순위를 같이 적어주세요.
   */
  archetype: string;
  /**
   * 성격을 풀어 쓴 문단. 예: "곁에 있고 싶어한다. 다만 마음을 잘 드러내지 않는다."
   *
   * 튀는 축만 들어갑니다. 대사 담당이 프롬프트에 그대로 넣을 수 있는 형태이되,
   * 말투 지시는 아닙니다 — "어떤 애인가"까지가 여기 몫입니다.
   */
  description: string;
};

/**
 * 품종 혼합 비율 하나를 성격으로 바꿉니다.
 *
 * 순수 함수입니다. 같은 혼합이면 언제 어디서 불러도 같은 성격이 나옵니다.
 * 그래서 저장소에는 `mix`만 넣어두면 되고, 나중에 이 파일의 수치를 조정하면
 * 기존 사용자 캐릭터도 자동으로 갱신됩니다.
 */
export function synthesize(rawMix: unknown): PersonaCard {
  const mix = resolveMix(rawMix);

  const axes = {} as Axes;
  const bands = {} as Record<AxisKey, Band>;
  const traits: string[] = [];

  for (const key of AXIS_KEYS) {
    const value = blendAxis(key, mix);
    axes[key] = value;
    bands[key] = bandOf(key, value);
    traits.push(traitOf(key, value));
  }

  return {
    mix,
    axes,
    bands,
    traits,
    archetype: archetypeOf(axes, bands),
    description: describe(axes, bands),
  };
}

/** 품종 하나만 아는 경우의 지름길. */
export function synthesizeBreed(breed: BreedId): PersonaCard {
  return synthesize([{ breed, ratio: 100 }]);
}

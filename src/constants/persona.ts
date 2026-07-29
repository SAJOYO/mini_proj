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
 * 여러 품종이 섞였을 때 그 축의 값을 어떻게 합칠지.
 *
 * 전부 `avg`로 두면 섞을수록 결과가 50 근처로 몰려서,
 * 정작 혼합이 목적인데 혼합할수록 개성이 사라집니다.
 * 축의 성질에 맞게 골라야 합니다.
 *
 *   avg       비율대로 가중평균. 대부분의 축은 이걸로 충분합니다.
 *   max       가장 높은 쪽을 그대로 가져옵니다. 섞여도 희석되지 않는 성질에 씁니다.
 *   min       가장 낮은 쪽을 그대로 가져옵니다.
 *   dominant  1순위 품종 값을 그대로 씁니다. 중간값이 어색한 축에 씁니다.
 */
type BlendMode = 'avg' | 'max' | 'min' | 'dominant';

/** 축 값이 놓인 구간. */
export type Band = 'low' | 'mid' | 'high';

type AxisDef = {
  /** 디버그·결과 화면에 보여줄 한글 이름 */
  readonly label: string;
  /** 이 축이 뭘 재는지. 헷갈릴 때 여기부터 읽으세요 */
  readonly description: string;
  /** 프리셋에 값이 없는 품종이 쓸 기본값 */
  readonly default: number;
  readonly blend: BlendMode;
  /**
   * 구간 경계 `[low 상한, mid 상한]`.
   * `[33, 66]`이면 0~33 = low, 34~66 = mid, 67~100 = high.
   * 특정 축만 판정을 빡빡하게 하고 싶으면 이 숫자만 조정하세요.
   */
  readonly cuts: readonly [number, number];
  /** 구간별 특성 이름 `[low, mid, high]` */
  readonly traits: readonly [string, string, string];
};

/**
 * 성격 축 목록.
 *
 * ── 축을 고칠 때 ──────────────────────────────────────────
 * 추가: 아래에 항목 하나를 더 씁니다. 프리셋이 `Partial`이라
 *       기존 품종들은 `default` 값으로 돌아가고, 아무것도 깨지지 않습니다.
 *       나중에 품종별로 하나씩 채워 넣으면 됩니다.
 * 삭제: 항목을 지우면 타입스크립트가 그 축을 참조하던 곳을 전부 짚어줍니다.
 * 조정: `cuts`(판정 경계) · `traits`(특성 이름) · `blend`(합치는 방식)는
 *       각각 한 줄만 고치면 끝입니다.
 *
 * 아래 파생 로직은 전부 이 객체를 순회하기 때문에, 축이 늘어도 코드는 안 늘어납니다.
 */
export const AXES = {
  sociability: {
    label: '사교성',
    description: '낯선 존재와 새로운 상황에 열려 있는가, 경계하는가',
    default: 50,
    blend: 'avg',
    cuts: [33, 66],
    traits: ['낯가림', '무난함', '개방적'],
  },
  affection: {
    label: '애정표현',
    description: '좋아하는 마음을 겉으로 드러내는가, 안으로 삼키는가',
    default: 50,
    blend: 'avg',
    cuts: [33, 66],
    traits: ['무뚝뚝', '은근함', '애교쟁이'],
  },
  independence: {
    label: '독립성',
    description: '혼자 있는 시간을 편해하는가, 곁에 붙어 있고 싶어하는가',
    default: 50,
    blend: 'avg',
    cuts: [33, 66],
    traits: ['껌딱지', '적당함', '혼자가 편함'],
  },
  pride: {
    label: '자존심',
    description: '체면을 차리는가, 털털한가',
    default: 50,
    // 자존심은 섞인다고 깎이지 않습니다. 한쪽이 도도하면 그 성질이 남습니다.
    blend: 'max',
    cuts: [33, 66],
    traits: ['털털함', '보통', '도도함'],
  },
  sensitivity: {
    label: '예민함',
    description: '작은 자극에 크게 반응하는가, 웬만해선 꿈쩍 않는가',
    default: 50,
    // 예민함도 희석되지 않습니다. 예민한 구석이 하나라도 있으면 그게 드러납니다.
    blend: 'max',
    cuts: [33, 66],
    traits: ['둔감', '보통', '예민'],
  },
  persistence: {
    label: '감정지속',
    description: '한번 든 감정이 오래 가는가, 금방 잊는가',
    default: 50,
    // 뒤끝은 애매한 중간값이 제일 어색합니다. 1순위 품종을 따라갑니다.
    blend: 'dominant',
    cuts: [33, 66],
    traits: ['뒤끝없음', '잠깐 삐짐', '장기기억'],
  },
  curiosity: {
    label: '호기심',
    description: '새로운 것에 끌리는가, 익숙한 것을 선호하는가',
    default: 50,
    blend: 'avg',
    cuts: [33, 66],
    traits: ['신중함', '보통', '모험가'],
  },
  optimism: {
    label: '낙천성',
    description: '기본 정서의 온도. 밝은 쪽인가 가라앉은 쪽인가',
    default: 50,
    blend: 'avg',
    cuts: [33, 66],
    traits: ['시무룩', '담담함', '낙천'],
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
 * `Partial`인 게 중요합니다. 축을 새로 추가해도 여기 8줄이 컴파일 에러를 내지 않고,
 * 값을 안 적은 축은 `AXES`의 `default`로 조용히 돌아갑니다.
 * (전부 필수로 잡으면 축 하나 늘릴 때마다 아홉 군데를 고쳐야 해서, 결국 안 고치게 됩니다.)
 *
 * 값은 견종의 일반적인 기질을 참고한 초안입니다. 마음껏 조정하세요.
 */
const BREED_AXES: Record<BreedId, Partial<Axes>> = {
  // 모든 품종의 원점. 전부 기본값(50)으로 둡니다.
  neutral: {},

  shiba: {
    sociability: 25,
    affection: 25,
    independence: 90,
    pride: 92,
    sensitivity: 55,
    persistence: 70,
    curiosity: 55,
    optimism: 45,
  },
  retriever: {
    sociability: 92,
    affection: 92,
    independence: 20,
    pride: 20,
    sensitivity: 30,
    persistence: 8,
    curiosity: 78,
    optimism: 95,
  },
  dachshund: {
    sociability: 45,
    affection: 60,
    independence: 65,
    pride: 70,
    sensitivity: 65,
    persistence: 65,
    curiosity: 85,
    optimism: 55,
  },
  poodle: {
    sociability: 70,
    affection: 72,
    independence: 45,
    pride: 68,
    sensitivity: 80,
    persistence: 45,
    curiosity: 88,
    optimism: 65,
  },
  beagle: {
    sociability: 95,
    affection: 85,
    independence: 40,
    pride: 18,
    sensitivity: 25,
    persistence: 5,
    curiosity: 95,
    optimism: 90,
  },
  shihtzu: {
    sociability: 72,
    affection: 78,
    independence: 30,
    pride: 45,
    sensitivity: 40,
    persistence: 25,
    curiosity: 40,
    optimism: 78,
  },
  maltese: {
    sociability: 40,
    affection: 88,
    independence: 12,
    pride: 55,
    sensitivity: 88,
    persistence: 55,
    curiosity: 45,
    optimism: 60,
  },
  corgi: {
    sociability: 80,
    affection: 75,
    independence: 55,
    pride: 60,
    sensitivity: 35,
    persistence: 30,
    curiosity: 82,
    optimism: 85,
  },
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

  const valid = raw.flatMap((item): BreedMix => {
    if (typeof item !== 'object' || item === null) return [];
    const { breed, ratio } = item as { breed?: unknown; ratio?: unknown };
    if (typeof breed !== 'string' || !(breed in BREEDS)) return [];
    if (typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio <= 0) return [];
    return [{ breed: breed as BreedId, ratio }];
  });

  if (valid.length === 0) return DEFAULT_MIX;

  const total = valid.reduce((sum, item) => sum + item.ratio, 0);
  return valid
    .map((item) => ({ breed: item.breed, ratio: (item.ratio / total) * 100 }))
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
 * 가중평균은 섞을수록 값을 중앙(50)으로 끌어당깁니다.
 * 그대로 두면 3품종 혼합이 전부 비슷한 성격이 돼버려서,
 * 평균낸 뒤 중앙에서 조금 밀어냅니다. 1이면 보정 없음.
 *
 * 단, 많이 섞였을 때만 겁니다. 단독 품종은 애초에 중앙으로 몰리지 않으니
 * 보정하면 프리셋에 적은 값과 결과가 달라져서 수치를 튜닝할 수 없게 됩니다.
 * 1순위 지분이 100이면 보정 없음, 50 이하로 내려가면 최대치가 됩니다.
 */
const CONTRAST = 1.4;

function contrastFor(dominantRatio: number): number {
  const spread = Math.min(1, (1 - dominantRatio / 100) / 0.5);
  return 1 + (CONTRAST - 1) * spread;
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** 한 축에 대한 `{ 값, 지분 }` 목록. 지분 내림차순입니다. */
type Weighted = { v: number; r: number }[];

/**
 * 합치는 방식별 구현.
 *
 * `Record<BlendMode, ...>`라서 모드를 새로 만들면 여기 항목을 안 채울 수가 없습니다.
 */
const BLEND_FNS: Record<BlendMode, (xs: Weighted) => number> = {
  max: (xs) => Math.max(...xs.map((x) => x.v)),
  min: (xs) => Math.min(...xs.map((x) => x.v)),
  dominant: (xs) => xs[0].v,
  avg: (xs) => {
    const weighted = xs.reduce((sum, x) => sum + x.v * x.r, 0) / 100;
    // 대비 보정은 avg에만 겁니다. max/min/dominant는 애초에 중앙으로 가지 않습니다.
    return 50 + (weighted - 50) * contrastFor(xs[0].r);
  },
};

/** 혼합 비율을 성격 축 하나로 합칩니다. `mix`는 지분 내림차순이어야 합니다. */
function blendAxis(key: AxisKey, mix: BreedMix): number {
  const values: Weighted = mix.map((item) => ({ v: axesOf(item.breed)[key], r: item.ratio }));
  return clamp(BLEND_FNS[AXES[key].blend](values));
}

/** 축 값이 어느 구간에 놓였는지. */
export function bandOf(key: AxisKey, value: number): Band {
  const [low, mid] = AXES[key].cuts;
  if (value <= low) return 'low';
  if (value <= mid) return 'mid';
  return 'high';
}

/** 축 값에 붙는 특성 이름. */
export function traitOf(key: AxisKey, value: number): string {
  const index = { low: 0, mid: 1, high: 2 } as const;
  return AXES[key].traits[index[bandOf(key, value)]];
}

/**
 * 아키타입 조합표.
 *
 * 성격은 축 하나씩 읽으면 형용사 나열이 될 뿐이고, 축이 만나는 지점에서 나옵니다.
 * 그래서 축 두 개를 짝지어 한 단어로 만들고, 둘을 이어 붙입니다.
 *
 *   기질(sensitivity × optimism) + 관계(affection × pride)
 *   예: 예민 × 담담 → '섬세한',  애교쟁이 × 도도함 → '폭군'  ⇒  "섬세한 폭군"
 *
 * 표는 `[첫번째 축 구간][두번째 축 구간]` 순서로 읽습니다.
 * 짝을 바꾸고 싶으면 `axes`에 적힌 축 이름만 갈아 끼우면 됩니다.
 */
const ARCHETYPE_RULES = [
  {
    axes: ['sensitivity', 'optimism'],
    table: {
      low: { low: '무던한', mid: '느긋한', high: '태평한' },
      mid: { low: '조심스러운', mid: '차분한', high: '명랑한' },
      high: { low: '여린', mid: '섬세한', high: '들뜬' },
    },
  },
  {
    axes: ['affection', 'pride'],
    table: {
      low: { low: '곰', mid: '관찰자', high: '은둔자' },
      mid: { low: '친구', mid: '동거인', high: '츤데레' },
      high: { low: '응석꾸러기', mid: '애교쟁이', high: '폭군' },
    },
  },
] as const satisfies readonly {
  axes: readonly [AxisKey, AxisKey];
  table: Record<Band, Record<Band, string>>;
}[];

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
  /** 축 조합에서 나온 한 줄 성격. 예: "섬세한 츤데레" */
  archetype: string;
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

  const archetype = ARCHETYPE_RULES.map(
    (rule) => rule.table[bands[rule.axes[0]]][bands[rule.axes[1]]],
  ).join(' ');

  return { mix, axes, bands, traits, archetype };
}

/** 품종 하나만 아는 경우의 지름길. */
export function synthesizeBreed(breed: BreedId): PersonaCard {
  return synthesize([{ breed, ratio: 100 }]);
}

/**
 * 다마고치 게임 규칙.
 *
 * 이 파일에는 **화면이 없습니다.** 순수한 계산 함수와 상수만 있어서
 * 규칙을 바꾸고 싶으면 여기만 고치면 됩니다. (UI는 src/app/game.tsx)
 *
 * 핵심 설계 — "성장"과 "노화"를 분리했습니다:
 *   영유아기 → 청소년기 → 청년기 : 돌봄으로 쌓은 **경험치**로 진행
 *   청년기 → 노년기               : 경험치가 아니라 **함께한 일수**로 진행
 *
 * 돌보면 자라지만, 늙는 건 시간이 하는 일이니까요.
 * (경험치로 노년기가 오면 "열심히 돌봤더니 빨리 늙었다"가 돼서 보상이 뒤집힙니다.)
 * 대신 쌓은 경험치와 스탯은 **노년기 엔딩 등급**으로 돌려받습니다.
 *
 * 숫자를 만지고 싶으면 GameConfig 하나만 보세요.
 */

import { resolveBreed, type BreedId } from '@/constants/pet';

/* ------------------------------------------------------------------ */
/* 스탯                                                                */
/* ------------------------------------------------------------------ */

export type StatId = 'hunger' | 'happiness' | 'clean';

/** 0(텅 빔) ~ 100(가득). 전부 "높을수록 좋음"으로 통일했습니다. */
export type Stats = Record<StatId, number>;

export type StatMeta = {
  id: StatId;
  label: string;
  emoji: string;
  /** 이 값 밑으로 떨어지면 경고 색으로 보여줍니다. */
  warnBelow: number;
};

/**
 * 스탯 목록. 화면은 이 배열을 순회해서 게이지를 그립니다.
 * 새 스탯(예: 에너지)을 넣고 싶으면 StatId에 추가하고 여기에 한 줄,
 * GameConfig.decayPerHour에 한 줄, CARE_ACTIONS에 한 줄이면 끝입니다.
 */
export const STATS: readonly StatMeta[] = [
  { id: 'hunger', label: '배고픔', emoji: '🍚', warnBelow: 30 },
  { id: 'happiness', label: '행복', emoji: '💛', warnBelow: 30 },
  { id: 'clean', label: '청결', emoji: '🛁', warnBelow: 25 },
];

/* ------------------------------------------------------------------ */
/* 돌봄 액션                                                           */
/* ------------------------------------------------------------------ */

export type CareActionId = 'feed' | 'play' | 'wash';

export type CareAction = {
  id: CareActionId;
  label: string;
  emoji: string;
  /** 이 액션이 채워주는 스탯. */
  stat: StatId;
  /**
   * 이 돌봄의 부수 효과. 다른 스탯을 깎습니다(음수만 씁니다).
   *
   * 뛰어놀면 배고파지는 게 자연스럽고, 게임으로도 "하나만 계속 누르면 되는"
   * 구조를 막아줍니다. 세 버튼이 서로를 밀고 당기게 하는 장치입니다.
   */
  sideEffects?: Partial<Record<StatId, number>>;
  /**
   * 이 돌봄이 끝나기까지 걸리는 시간(ms).
   *
   * 버튼을 누르면 곧바로 끝나지 않고 이 시간 동안 **진행**됩니다. 연타를 막는
   * 장치인데, 쿨다운처럼 "기다리세요"라고 잠그는 대신 밥을 먹고 있는 시간
   * 자체를 보여주는 쪽을 택했습니다 — 같은 시간을 쓰면서 볼 것이 생깁니다.
   */
  activityMs: number;
  /** 진행 중에 보여줄 문구. 예: "밥을 먹는 중" */
  activityLabel: string;
  /** 성공했을 때 캐릭터가 하는 말. */
  reaction: string;
  /** 이미 가득 차 있어서 거절할 때 하는 말. */
  refusal: string;
  /** 이걸 소원으로 요청할 때 하는 말 (미니 이벤트 배너에 뜹니다). */
  wishAsk: string;
  /** 소원이 이뤄졌을 때 하는 말. */
  wishGrantedReaction: string;
};

/**
 * 돌봄 액션 목록. 화면의 버튼은 이 배열에서 자동으로 만들어집니다.
 * 액션을 늘리려면 여기에 한 줄 추가하면 버튼도 같이 늘어납니다.
 */
export const CARE_ACTIONS: readonly CareAction[] = [
  {
    id: 'feed',
    label: '밥 주기',
    emoji: '🍚',
    stat: 'hunger',
    // 먹다 흘려서 조금 더러워집니다.
    sideEffects: { clean: -6 },
    activityMs: 2200,
    activityLabel: '밥을 먹는 중',
    reaction: '냠냠! 잘 먹었어요',
    refusal: '지금은 배가 불러요',
    wishAsk: '맛있는 거 먹고 싶어요!',
    wishGrantedReaction: '기다린 밥이라 더 맛있어요!',
  },
  {
    id: 'play',
    label: '놀아주기',
    emoji: '🎾',
    stat: 'happiness',
    // 뛰어놀면 배고프고 지저분해집니다. 놀아주기만 반복할 수 없게 하는 값입니다.
    sideEffects: { hunger: -12, clean: -8 },
    activityMs: 2600,
    activityLabel: '신나게 노는 중',
    reaction: '신난다! 더 놀아요',
    refusal: '지금은 충분히 즐거워요',
    wishAsk: '산책 가고 싶어요!',
    wishGrantedReaction: '기다렸어요! 정말 즐거웠어요',
  },
  {
    id: 'wash',
    label: '씻기기',
    emoji: '🛁',
    stat: 'clean',
    // 물을 별로 좋아하지 않아서 기분이 조금 상합니다.
    sideEffects: { happiness: -7 },
    activityMs: 2400,
    activityLabel: '거품 목욕 중',
    reaction: '깨끗해져서 기분 좋아요',
    refusal: '지금은 아주 깨끗해요',
    wishAsk: '몸이 찝찝해요...',
    wishGrantedReaction: '개운해요! 씻고 싶었어요',
  },
];

/**
 * 쓰다듬었을 때 하는 말. 아바타를 누르면 이 중 하나가 랜덤으로 나옵니다.
 *
 * **쓰다듬기는 횟수 제한이 없습니다.** 보상이 작은 대신 언제든 누를 수 있고,
 * 그래서 이 게임에서 "그냥 계속 만지고 있게 되는" 유일한 상호작용입니다.
 * 그 역할을 하려면 대사가 많아야 합니다 — 반복이 눈에 보이면 손을 떼게 되니까요.
 * 부담 없이 계속 추가하세요.
 */
export const PAT_REACTIONS: readonly string[] = [
  '기분 좋아요...',
  '헤헤, 더 해주세요',
  '손길이 좋아요',
  '골골골...',
  '눈을 감고 있어요',
  '꼬리가 살랑살랑',
  '몸을 기대 왔어요',
  '배를 보이며 뒹굴어요',
  '작게 하품했어요',
  '코를 비벼요',
  '귀가 쫑긋 움직여요',
  '스르륵 잠들 것 같아요',
];

/**
 * 행복이 이미 가득할 때 쓰다듬으면 하는 말.
 *
 * 이때도 **거절하지 않습니다.** 더 오를 게 없을 뿐이고, 반응은 계속 돌려줍니다.
 * "가득 차서 안 됨"으로 막으면 마음껏 만질 수 있다는 성격이 사라집니다.
 */
export const PAT_FULL_REACTIONS: readonly string[] = [
  '이미 기분이 최고예요!',
  '더없이 행복해요',
  '이보다 좋을 수가 없어요',
  '헤벌쭉 웃고 있어요',
  '행복이 넘쳐요',
];

/**
 * 캐릭터가 떠났을 때 보여줄 문구.
 *
 * 방치의 결과지만 **실패나 죽음으로 쓰지 않았습니다.** "심심해서 여행을 떠났다"로
 * 돌려 표현합니다 — 사용자를 벌주는 연출은 미니 프로젝트에 과하고, 다시 시작하는
 * 흐름으로 자연스럽게 이어지는 쪽이 낫습니다.
 */
export const DEPARTURE = {
  emoji: '🧳',
  title: '여행을 떠났어요',
  message:
    '한동안 심심했던 모양이에요. 문을 열어두고 훌쩍 세상 구경을 나섰습니다.\n' +
    '언젠가 다른 친구가 그 자리를 채워줄 거예요.',
  /** 떠나기 전에 띄우는 경고 문구. */
  warning: '심심해서 바깥을 자꾸 쳐다봐요',
} as const;

/** 노년기에 쓰다듬었을 때. 스탯은 멈췄지만 반응은 계속 돌려줍니다. */
export const ELDER_PAT_REACTIONS: readonly string[] = [
  '곁에 있어줘서 고마워요',
  '눈을 감고 손길을 느껴요',
  '오래 함께해서 좋았어요',
  '천천히 꼬리를 흔들어요',
];

/**
 * 연달아 쓰다듬을 때의 반응. 이어서 만지면 점점 더 좋아합니다.
 *
 * 같은 대사만 랜덤으로 돌면 "반응한다"는 느낌은 나도 "쌓인다"는 느낌은 없어서,
 * 연속 횟수에 따라 다른 말을 얹었습니다. 해당 구간이 아니면 null(=랜덤 대사).
 */
export function patStreakReaction(streak: number): string | null {
  if (streak >= 8) return '너무 행복해서 어쩔 줄 몰라요!';
  if (streak >= 4) return '계속 해주세요, 좋아요!';
  return null;
}

/**
 * 버튼에 미리 보여줄 부수 효과 문구(예: "배고픔·청결 ↓").
 *
 * 누른 **다음에** 알려주면 속은 기분이 듭니다. 대가를 먼저 보여주고 고르게
 * 하는 게 목적입니다. 부수 효과가 없으면 null.
 */
export function sideEffectHint(action: CareAction): string | null {
  const ids = Object.keys(action.sideEffects ?? {}) as StatId[];
  if (ids.length === 0) return null;

  const labels = ids.map((id) => STATS.find((s) => s.id === id)?.label ?? id);
  return `${labels.join('·')} ↓`;
}

/* ------------------------------------------------------------------ */
/* 설정값 (숫자는 전부 여기)                                            */
/* ------------------------------------------------------------------ */

export const GameConfig = {
  /** 청년기 → 노년기. "함께한 일수" 기준. 팀에서 정해지면 이 값만 바꾸세요. */
  elderAfterDays: 7,

  /** 단계별 필요 누적 경험치. */
  expToTeen: 60,
  expToYoung: 180,

  /** 돌봄 한 번의 스탯 회복량과 경험치. */
  careGain: 25,
  careExp: 10,

  /** 스탯이 1시간에 떨어지는 양 (decaySpeed가 1일 때). */
  decayPerHour: { hunger: 8, happiness: 6, clean: 4 } satisfies Stats,

  /**
   * 스탯 감소 배율. **테스트할 때 만지는 값은 이거 하나입니다.**
   *
   * 위의 decayPerHour는 "하루 단위로 돌보는 게임"을 기준으로 잡은 기획값이라
   * 실시간으로 보면 너무 느립니다(배고픔이 1 줄는 데 7분 30초). 그래서 배율만
   * 올려서 빠르게 확인합니다. 세 스탯이 같은 비율로 빨라지니 균형은 유지됩니다.
   *
   *   1  → 기획값. 배고픔 100→0 이 12.5시간 (제출/발표 때 이 값으로)
   *   5  → 배고픔 100→0 이 2.5시간
   *   20 → 배고픔 100→0 이 37분. 1분에 2.7씩 줄어서 눈에 보입니다
   *   60 → 배고픔 100→0 이 12.5분. 방치 연출·경고색 확인용
   *
   * 지금은 기획값 1입니다. 방치·경고색·여행을 확인하려고 이 값을 올렸다면
   * **커밋 전에 1로 되돌리세요.** 대부분은 배율을 올릴 필요 없이 게임 화면
   * 아래쪽 시연 도구(`스탯 0/30/100`·`여행 보내기`)로 더 빠르게 확인됩니다.
   */
  decaySpeed: 1,

  /** 새로 태어난 캐릭터의 시작 스탯. */
  initialStats: { hunger: 70, happiness: 70, clean: 70 } satisfies Stats,

  /** 스탯이 이 값 이상이면 그 돌봄은 거절됩니다(버튼 연타로 레벨업하는 것 방지). */
  fullThreshold: 95,

  /** 엔딩 등급 경계 점수(0~100). */
  endingGoodAbove: 70,
  endingNormalAbove: 40,

  /** 엔딩 점수에서 "충분히 돌봤다"고 보는 누적 돌봄 횟수. */
  careCountTarget: 40,

  /**
   * 쓰다듬기(아바타 누르기)의 보상. **아주 작습니다.**
   *
   * 쓰다듬기는 횟수 제한이 없는 상호작용이라, 보상이 조금이라도 쓸 만하면
   * "돌봄 대신 이것만 누르는" 최적 전략이 됩니다. 그래서 행복은 한 번에 1,
   * 경험치는 patsPerExp번마다 1만 줍니다 — 20번 만지면 행복 20, 경험치 2.
   * 돌봄 한 번(행복 25, 경험치 10)에 한참 못 미칩니다.
   *
   * 즉 쓰다듬기는 보상을 노리는 행동이 아니라 **반응을 보는 행동**입니다
   * (대사 풀이 12종인 이유 — PAT_REACTIONS 참고).
   */
  patGain: 1,
  patExp: 1,
  /** 이 횟수마다 경험치 patExp를 한 번 줍니다. */
  patsPerExp: 10,

  /**
   * 소원(미니 이벤트). 캐릭터가 먼저 "산책 가고 싶어요"처럼 특정 돌봄을 요청하고,
   * 들어주면 경험치를 더 줍니다. 가만히 기다리는 게임에 먼저 말 거는 순간을
   * 넣으려는 장치입니다.
   */
  wishEveryMs: 60_000,
  /** 소원이 이 시간 안에 안 이뤄지면 조용히 사라집니다(실패 페널티는 없음). */
  wishTtlMs: 120_000,
  /** 주기가 됐을 때 소원이 실제로 생길 확률. 1이면 매번 생깁니다. */
  wishChance: 0.6,
  /**
   * 소원으로 요청할 수 있는 스탯의 상한.
   *
   * 이 값보다 높은 스탯은 요청하지 않습니다. 안 그러면 "찝찝해요"라고 하면서
   * 정작 청결이 가득 차 씻기기가 거절되는 모순이 생깁니다. 거절 기준
   * (fullThreshold 95)보다 넉넉히 낮게 잡아, 요청받은 돌봄은 항상 할 수 있게
   * 했습니다.
   */
  wishAskBelow: 70,
  /** 소원을 들어줬을 때 추가로 주는 경험치. */
  wishBonusExp: 15,

  /**
   * 스탯이 0인 채로 이만큼 지나면 캐릭터가 **여행을 떠납니다.**
   *
   * 방치의 결과를 엔딩 등급으로만 치르면 "지금 안 돌봐도 별일 없다"가 되어
   * 스탯 게이지가 장식처럼 보입니다. 그래서 돌봄이 완전히 끊기면 캐릭터가
   * 떠나는 결말을 뒀습니다.
   *
   * 죽음이나 실패로 쓰지 않았습니다 — "심심해서 여행을 떠났다"는 쪽으로 돌려
   * 표현합니다. 미니 프로젝트에서 사용자를 벌주는 연출은 과합니다.
   *
   * **실시간 기준입니다**(decaySpeed와 무관). 스탯이 0에 닿는 속도는 배율이
   * 정하고, 0이 된 뒤 떠나기까지의 유예는 이 값이 정합니다.
   */
  departAfterMs: 120_000,
} as const;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/* ------------------------------------------------------------------ */
/* 성장 단계                                                           */
/* ------------------------------------------------------------------ */

export type StageId = 'baby' | 'teen' | 'young' | 'elder';

export type Stage = {
  id: StageId;
  label: string;
  /** 아바타 크기(px). 단계가 달라도 같은 값입니다 — AVATAR_SIZE 설명 참고. */
  avatarSize: number;
  /** 이 단계에 도달하기 위한 누적 경험치. elder는 경험치가 아니라 일수로 갑니다. */
  minExp: number;
};

/**
 * 아바타 크기의 **상한**(px). 네 단계가 모두 같습니다.
 *
 * 예전에는 단계가 오를수록 키웠는데(96 → 120 → 144), 그러면 성장할 때마다
 * 아바타 자리의 높이가 달라져서 스탯 게이지와 돌봄 버튼이 통째로 위아래로
 * 밀립니다. 같은 화면인데 단계마다 배치가 달라 보이고, 성장한 순간에는
 * 누르려던 버튼이 옮겨가 있습니다.
 *
 * 자란 것은 크기가 아니라 **생김새**로 보여줍니다 — 머리·몸·귀·발의 비율은
 * constants/pet.ts의 LIFE_STAGES가 단계별로 조정합니다.
 *
 * ## 왜 상한인가
 *
 * 실제 크기는 **화면 폭의 절반**입니다(components/pet-avatar.tsx). 고정값이면
 * 작은 폰에서는 화면을 다 먹고 태블릿에서는 허전합니다. 다만 폭이 넓다고
 * 끝없이 커지면 캐릭터만 덩그러니 남아서, 여기서 끊습니다.
 */
export const AVATAR_SIZE = 200;

export const STAGES: readonly Stage[] = [
  { id: 'baby', label: '영유아기', avatarSize: AVATAR_SIZE, minExp: 0 },
  {
    id: 'teen',
    label: '청소년기',
    avatarSize: AVATAR_SIZE,
    minExp: GameConfig.expToTeen,
  },
  {
    id: 'young',
    label: '청년기',
    avatarSize: AVATAR_SIZE,
    minExp: GameConfig.expToYoung,
  },
  // 노년기는 경험치가 아니라 함께한 일수로 진입합니다 (minExp는 청년기와 동일).
  {
    id: 'elder',
    label: '노년기',
    avatarSize: AVATAR_SIZE,
    minExp: GameConfig.expToYoung,
  },
];

export function stageById(id: StageId): Stage {
  const found = STAGES.find((s) => s.id === id);
  if (!found) throw new Error(`알 수 없는 성장 단계: ${id}`);
  return found;
}

/* ------------------------------------------------------------------ */
/* 펫 상태                                                             */
/* ------------------------------------------------------------------ */

export type Pet = {
  /**
   * 닮은 동물 검색이 알려준 품종. 지금은 임시로 랜덤 선택입니다.
   * 한글 이름이 아니라 constants/pet.ts의 키입니다(캐릭터가 이 키로 그립니다).
   */
  breed: BreedId;
  /** 사용자가 처음에 올린 사진. 캐릭터화의 입력이 됩니다. */
  photoUri: string | null;
  /** 태어난 시각(ISO 8601). 노년기 진입 판정의 기준. */
  bornAt: string;
  /** 누적 경험치. 돌볼 때마다 오릅니다. */
  exp: number;
  /** 누적 돌봄 횟수. 엔딩 점수에 씁니다. */
  careCount: number;
  /** 누적 쓰다듬은 횟수. 기록 카드에 보여줍니다(엔딩 점수에는 넣지 않습니다). */
  pats: number;
  stats: Stats;
  /**
   * 스탯 감소를 마지막으로 계산한 시각(ms).
   * 앱을 껐다 켠 사이의 시간만큼 한 번에 깎기 위해 저장합니다.
   */
  lastTickAt: number;
  /**
   * 시연용으로 앞당긴 시간(ms). bornAt을 직접 조작하지 않고 이 값만 늘려서
   * "함께한 일수"를 부풀립니다. 저장된 데이터를 망치지 않는 게 목적입니다.
   */
  timeWarpMs: number;
  /**
   * 확정된 엔딩. 노년기에 들어서는 순간 한 번 계산해서 여기 적고, 그 뒤로는
   * 바뀌지 않습니다. 아직 노년기가 아니면 null.
   *
   * **엔딩을 매번 다시 계산하면 안 됩니다.** 노년기 이후에도 스탯에 따라 카드가
   * 계속 바뀌면 "엔딩"이 아니라 실시간 상태 표시로 읽힙니다.
   */
  ending: EndingId | null;
  /** 엔딩이 확정된 시각(ISO 8601). 아직이면 null. */
  endedAt: string | null;
  /**
   * 스탯이 0에 닿은 시각(ms). 하나라도 0이면 여기서부터 유예 시간을 셉니다.
   * 다시 채워주면 null로 돌아갑니다.
   */
  zeroSince: number | null;
  /**
   * 여행을 떠난 시각(ISO 8601). 아직 함께 있으면 null.
   * 떠난 뒤에는 스탯도 소원도 멈추고, 화면은 배웅 화면으로 바뀝니다.
   */
  departedAt: string | null;
  /** 지금 캐릭터가 바라는 것. 없으면 null. */
  wish: Wish | null;
  /** 마지막 소원이 이뤄지거나 사라진 시각(ms). 다음 소원 간격의 기준. */
  lastWishEndedAt: number;
};

/** 캐릭터가 먼저 요청하는 돌봄. */
export type Wish = {
  actionId: CareActionId;
  /** 요청한 시각(ms). 여기서 wishTtlMs가 지나면 사라집니다. */
  askedAt: number;
};

export function createPet(breed: BreedId, photoUri: string | null, now: number = Date.now()): Pet {
  return {
    breed,
    photoUri,
    bornAt: new Date(now).toISOString(),
    exp: 0,
    careCount: 0,
    pats: 0,
    stats: { ...GameConfig.initialStats },
    lastTickAt: now,
    timeWarpMs: 0,
    ending: null,
    endedAt: null,
    zeroSince: null,
    departedAt: null,
    wish: null,
    lastWishEndedAt: now,
  };
}

/**
 * 저장소에서 읽은 캐릭터를 지금 버전의 Pet으로 맞춥니다.
 *
 * 필드를 새로 추가하면 **이전에 저장된 캐릭터에는 그 값이 없습니다.** 그대로 쓰면
 * `pet.pats`가 undefined가 되어 화면에 "NaN번"이 찍히거나 계산이 깨집니다.
 * 새 필드를 넣을 때마다 여기에 기본값을 한 줄 추가하세요.
 *
 * 값의 **모양**이 바뀐 경우도 여기서 받아냅니다. 품종이 그랬습니다 — 예전에는
 * 한글 이름("허스키")을 저장했는데 지금은 constants/pet.ts의 키를 씁니다.
 * 그대로 두면 BREEDS[pet.breed]가 undefined가 되어 게임 화면이 통째로 죽습니다.
 */
export function normalizePet(raw: Pet, now: number = Date.now()): Pet {
  return {
    ...raw,
    // 모르는 품종이면 기본 형태로 떨어집니다. 화면이 깨지는 것보단 낫습니다.
    breed: resolveBreed(raw.breed),
    pats: raw.pats ?? 0,
    wish: raw.wish ?? null,
    lastWishEndedAt: raw.lastWishEndedAt ?? now,
    zeroSince: raw.zeroSince ?? null,
    departedAt: raw.departedAt ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* 계산                                                               */
/* ------------------------------------------------------------------ */

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 함께한 시간(ms). 시연용 timeWarp가 더해집니다. */
export function elapsedMs(pet: Pet, now: number = Date.now()): number {
  return Math.max(0, now - Date.parse(pet.bornAt)) + pet.timeWarpMs;
}

/** 함께한 일수. 화면에 "함께한 3일째"로 보여주는 값입니다. */
export function daysTogether(pet: Pet, now: number = Date.now()): number {
  return Math.floor(elapsedMs(pet, now) / MS_PER_DAY);
}

/**
 * 지금 성장 단계.
 *
 * 경험치로 청년기까지 오른 뒤, 함께한 일수가 기준을 넘으면 노년기가 됩니다.
 * (청년기에 도달하지 못했으면 일수가 아무리 지나도 노년기로 가지 않습니다)
 */
export function stageOf(pet: Pet, now: number = Date.now()): Stage {
  const isYoung = pet.exp >= GameConfig.expToYoung;
  const oldEnough = daysTogether(pet, now) >= GameConfig.elderAfterDays;

  if (isYoung && oldEnough) return stageById('elder');
  if (isYoung) return stageById('young');
  if (pet.exp >= GameConfig.expToTeen) return stageById('teen');
  return stageById('baby');
}

/**
 * 다음 단계까지의 진행률(0~1)과 안내 문구.
 * 청년기에서는 경험치 대신 남은 일수를 보여줍니다.
 */
export function progressToNext(
  pet: Pet,
  now: number = Date.now(),
): { ratio: number; hint: string } | null {
  const stage = stageOf(pet, now);

  if (stage.id === 'elder') return null;

  if (stage.id === 'young') {
    const days = daysTogether(pet, now);
    const remaining = Math.max(0, GameConfig.elderAfterDays - days);
    return {
      ratio: clamp(days / GameConfig.elderAfterDays, 0, 1),
      hint: `노년기까지 ${remaining}일`,
    };
  }

  const target = stage.id === 'baby' ? GameConfig.expToTeen : GameConfig.expToYoung;
  const floor = stage.minExp;
  const nextLabel = stage.id === 'baby' ? '청소년기' : '청년기';

  return {
    ratio: clamp((pet.exp - floor) / (target - floor), 0, 1),
    hint: `${nextLabel}까지 ${Math.max(0, target - pet.exp)} EXP`,
  };
}

/**
 * 아직 돌볼 수 있는 상태인지.
 * 노년기에 들어섰거나 여행을 떠났으면 돌봄은 끝입니다.
 */
export function isCareOpen(pet: Pet, now: number = Date.now()): boolean {
  return !hasDeparted(pet) && stageOf(pet, now).id !== 'elder';
}

/**
 * 마지막 계산 시각부터 지금까지 흐른 시간만큼 스탯을 깎습니다.
 * 앱을 껐다 켰을 때 그 사이의 방치가 반영되도록 하는 함수입니다.
 *
 * 노년기에 들어선 뒤로는 깎지 않습니다 — 엔딩이 확정된 다음이라 스탯이 더 움직일
 * 이유가 없고, 움직이면 엔딩 카드가 계속 바뀌는 것처럼 보입니다.
 *
 * 단, "노년기였는지"는 **흐른 구간이 시작될 때(lastTickAt)** 기준으로 판정합니다.
 * 지금 기준으로 판정하면, 청년기에 며칠 방치해서 노년기에 진입한 경우 그 방치가
 * 통째로 면제되어 엔딩이 부당하게 좋게 나옵니다.
 */
export function applyDecay(pet: Pet, now: number = Date.now()): Pet {
  const hours = (now - pet.lastTickAt) / MS_PER_HOUR;
  if (hours <= 0) return pet;

  // 떠난 뒤에는 아무것도 움직이지 않습니다(배웅 화면의 기록이 계속 바뀌면 안 됩니다).
  if (hasDeparted(pet)) return { ...pet, lastTickAt: now };

  if (stageOf(pet, pet.lastTickAt).id === 'elder') {
    return { ...pet, lastTickAt: now };
  }

  const stats = { ...pet.stats };
  for (const { id } of STATS) {
    const drop = GameConfig.decayPerHour[id] * GameConfig.decaySpeed * hours;
    stats[id] = clamp(stats[id] - drop, 0, 100);
  }

  return { ...pet, stats, lastTickAt: now };
}

/* ------------------------------------------------------------------ */
/* 여행 (돌봄이 끊겼을 때)                                              */
/* ------------------------------------------------------------------ */

/** 캐릭터가 여행을 떠났는지. */
export function hasDeparted(pet: Pet): boolean {
  return pet.departedAt !== null;
}

/** 떠나기까지 남은 초. 아직 스탯이 0이 아니거나 이미 떠났으면 0. */
export function departureSecondsLeft(pet: Pet, now: number = Date.now()): number {
  if (hasDeparted(pet) || pet.zeroSince === null) return 0;
  return Math.max(0, Math.ceil((GameConfig.departAfterMs - (now - pet.zeroSince)) / 1000));
}

/** 스탯이 하나라도 바닥나서 떠날 준비를 하고 있는지(경고를 띄울 상태). */
export function isPackingBags(pet: Pet): boolean {
  return !hasDeparted(pet) && pet.zeroSince !== null;
}

/**
 * 스탯이 0인 채로 유예 시간이 지났으면 여행을 떠난 것으로 표시합니다.
 *
 * 0이 된 **순간**에 바로 떠나게 하면 잠깐 자리를 비운 것으로도 캐릭터를 잃습니다.
 * 그래서 0에 닿은 시각(zeroSince)을 적어두고 유예를 준 뒤에 판정합니다.
 * 그동안 하나라도 채워주면 zeroSince가 지워지면서 없던 일이 됩니다.
 *
 * 노년기에는 떠나지 않습니다 — 이미 돌봄이 끝나 스탯이 멈춘 구간이라,
 * 여기서 떠나면 확정된 엔딩을 덮어써 버립니다.
 */
export function checkDeparture(pet: Pet, now: number = Date.now()): Pet {
  if (hasDeparted(pet)) return pet;

  if (stageOf(pet, now).id === 'elder') {
    return pet.zeroSince === null ? pet : { ...pet, zeroSince: null };
  }

  const bottomedOut = STATS.some((s) => pet.stats[s.id] <= 0);

  if (!bottomedOut) {
    // 다시 채워줬으니 카운트다운을 없앱니다.
    return pet.zeroSince === null ? pet : { ...pet, zeroSince: null };
  }

  const since = pet.zeroSince ?? now;

  if (now - since >= GameConfig.departAfterMs) {
    return { ...pet, zeroSince: since, departedAt: new Date(now).toISOString(), wish: null };
  }

  return pet.zeroSince === null ? { ...pet, zeroSince: now } : pet;
}

/** 시연용. 즉시 여행을 떠나게 합니다(유예 시간을 기다리지 않고 확인할 때). */
export function forceDeparture(pet: Pet, now: number = Date.now()): Pet {
  return {
    ...setStats(pet, 0, now),
    zeroSince: now - GameConfig.departAfterMs,
    departedAt: new Date(now).toISOString(),
    wish: null,
  };
}

/* ------------------------------------------------------------------ */
/* 소원 (미니 이벤트)                                                   */
/* ------------------------------------------------------------------ */

/** 아직 살아있는 소원. 시간이 지나 사라졌으면 null. */
export function wishOf(pet: Pet, now: number = Date.now()): Wish | null {
  if (!pet.wish) return null;
  if (now - pet.wish.askedAt > GameConfig.wishTtlMs) return null;
  return pet.wish;
}

/** 소원이 사라지기까지 남은 초. 소원이 없으면 0. */
export function wishSecondsLeft(pet: Pet, now: number = Date.now()): number {
  const wish = wishOf(pet, now);
  if (!wish) return 0;
  return Math.max(0, Math.ceil((GameConfig.wishTtlMs - (now - wish.askedAt)) / 1000));
}

/**
 * 소원을 만들거나 만료시킵니다.
 *
 * 이 함수만 랜덤을 씁니다(그래서 rand를 인자로 받습니다 — 테스트에서 고정할 수
 * 있게 하려는 것입니다). 나머지 규칙은 전부 결정적입니다.
 */
export function rollWish(
  pet: Pet,
  now: number = Date.now(),
  rand: () => number = Math.random,
): Pet {
  // 노년기에는 돌봄이 끝났으니 소원도 없습니다.
  if (!isCareOpen(pet, now)) {
    return pet.wish ? { ...pet, wish: null, lastWishEndedAt: now } : pet;
  }

  if (pet.wish) {
    // 시간이 지난 소원은 조용히 사라집니다. 실패 페널티는 두지 않았습니다 —
    // 잠깐 앱을 닫은 것까지 벌하면 부담스러운 게임이 됩니다.
    if (now - pet.wish.askedAt > GameConfig.wishTtlMs) {
      return { ...pet, wish: null, lastWishEndedAt: now };
    }

    // 다른 경로로 스탯이 이미 가득 찼으면(예: 소원과 무관하게 씻겼다) 요청을
    // 거둡니다. 그대로 두면 "씻겨달라"면서 씻기기는 거절되는 모순이 됩니다.
    const wanted = CARE_ACTIONS.find((a) => a.id === pet.wish?.actionId);
    if (wanted && pet.stats[wanted.stat] >= GameConfig.fullThreshold) {
      return { ...pet, wish: null, lastWishEndedAt: now };
    }

    return pet;
  }

  if (now - pet.lastWishEndedAt < GameConfig.wishEveryMs) return pet;

  // 지금 실제로 채워줄 수 있는 것만 후보로 둡니다.
  const candidates = CARE_ACTIONS.filter((a) => pet.stats[a.stat] < GameConfig.wishAskBelow);
  // 전부 넉넉하면 바랄 게 없습니다. 시각을 갱신하지 않고 넘겨서, 스탯이 떨어지면
  // 곧바로 다시 굴립니다(다음 주기까지 기다리게 하면 소원이 뜸해집니다).
  if (candidates.length === 0) return pet;

  // 주기가 됐지만 확률에서 떨어졌으면, 다음 주기에 다시 굴립니다.
  if (rand() >= GameConfig.wishChance) return { ...pet, lastWishEndedAt: now };

  const action = candidates[Math.floor(rand() * candidates.length)] ?? candidates[0];
  return { ...pet, wish: { actionId: action.id, askedAt: now } };
}

/**
 * **발표 시연용.** 소원을 지금 당장 띄웁니다.
 *
 * rollWish 는 주기(1분)·확률(60%)·스탯 조건을 다 통과해야 소원을 냅니다.
 * 기다리지 않고 보여주려면 그 조건들을 건너뛸 길이 필요합니다.
 *
 * 조건을 하나 남겨둡니다 — 바라는 스탯이 이미 가득 차 있으면 채워줄 수가
 * 없습니다. 그대로 띄우면 "씻겨달라"면서 씻기기는 거절되는 모순이 되므로,
 * 그 자리를 비워 소원을 들어줄 수 있게 만들어 둡니다.
 */
export function forceWish(pet: Pet, actionId: CareActionId, now: number = Date.now()): Pet {
  const action = CARE_ACTIONS.find((a) => a.id === actionId);
  if (!action) return pet;

  const room = Math.min(pet.stats[action.stat], GameConfig.wishAskBelow - 1);

  return {
    ...pet,
    stats: { ...pet.stats, [action.stat]: room },
    wish: { actionId, askedAt: now },
  };
}

/**
 * 시간 경과를 한 번에 반영합니다.
 *
 *   스탯 감소 → 여행 판정 → 소원 갱신 → 노년기면 엔딩 확정
 *
 * 순서가 중요합니다. 감소를 먼저 해야 0에 닿은 걸 여행 판정이 볼 수 있고,
 * 여행 판정을 먼저 해야 떠난 캐릭터에 소원이 새로 붙지 않습니다.
 * 저장 전에는 항상 이 함수를 거치세요.
 */
export function advance(pet: Pet, now: number = Date.now(), rand?: () => number): Pet {
  return sealEnding(rollWish(checkDeparture(applyDecay(pet, now), now), now, rand), now);
}

export type CareResult = {
  pet: Pet;
  /** 실제로 돌봄이 적용됐는지. false면 스탯이 이미 가득 찬 경우입니다. */
  applied: boolean;
  /** 화면에 띄울 캐릭터의 반응. */
  message: string;
  /** 이 돌봄으로 단계가 올랐으면 그 단계. */
  grewInto: Stage | null;
  /**
   * 이 돌봄으로 단계가 올랐으면 **떠나온** 단계. 안 올랐으면 null.
   *
   * 성장한 뒤에는 pet만 봐서는 이전 모습을 알 수 없습니다(stageOf는 이미 새
   * 단계를 돌려줍니다). 캐릭터는 stage.id로 그 자리에서 그리는 SVG라, 이 값만
   * 있으면 방금 지나간 모습을 그대로 다시 그릴 수 있습니다 — 성장 기념 사진이
   * 이걸 씁니다.
   */
  grewFrom: Stage | null;
  /** 이 돌봄으로 소원을 들어줬는지. 화면에서 보너스 연출에 씁니다. */
  wishGranted: boolean;
  /** 채워준 스탯. 거절됐거나 쓰다듬기면 null. 파티클을 어디에 띄울지 정할 때 씁니다. */
  stat: StatId | null;
  /** 이번에 실제로 얻은 경험치. 거절되면 0. */
  gainedExp: number;
};

/** 돌봄 액션 하나를 적용합니다. 스탯이 이미 가득이면 거절합니다(연타 방지). */
export function applyCare(pet: Pet, actionId: CareActionId, now: number = Date.now()): CareResult {
  const action = CARE_ACTIONS.find((a) => a.id === actionId);
  if (!action) throw new Error(`알 수 없는 돌봄 액션: ${actionId}`);

  const decayed = advance(pet, now);
  const before = stageOf(decayed, now);

  // 떠난 뒤에는 돌볼 대상이 없습니다.
  if (hasDeparted(decayed)) {
    return {
      pet: decayed,
      applied: false,
      message: '지금은 여행 중이에요',
      grewInto: null,
      grewFrom: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  // 노년기에는 돌봄이 끝났습니다(화면에서도 버튼이 사라지지만, 규칙으로도 막아둡니다).
  if (before.id === 'elder') {
    return {
      pet: decayed,
      applied: false,
      message: '이제는 곁에 있어주기만 해도 돼요',
      grewInto: null,
      grewFrom: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  if (decayed.stats[action.stat] >= GameConfig.fullThreshold) {
    return {
      pet: decayed,
      applied: false,
      message: action.refusal,
      grewInto: null,
      grewFrom: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  // 지금 바라던 것이었다면 경험치를 더 줍니다.
  const granted = wishOf(decayed, now)?.actionId === actionId;
  const gainedExp = GameConfig.careExp + (granted ? GameConfig.wishBonusExp : 0);

  // 목표 스탯을 채우고, 부수 효과로 다른 스탯을 깎습니다.
  const stats: Stats = { ...decayed.stats };
  stats[action.stat] = clamp(stats[action.stat] + GameConfig.careGain, 0, 100);
  for (const [id, delta] of Object.entries(action.sideEffects ?? {})) {
    const statId = id as StatId;
    stats[statId] = clamp(stats[statId] + delta, 0, 100);
  }

  const next: Pet = {
    ...decayed,
    exp: decayed.exp + gainedExp,
    careCount: decayed.careCount + 1,
    stats,
    // 들어준 소원은 지웁니다. 다음 소원까지의 간격은 여기서부터 셉니다.
    ...(granted ? { wish: null, lastWishEndedAt: now } : {}),
  };

  const after = stageOf(next, now);

  return {
    // 이 돌봄으로 청년기를 넘어섰을 수도 있으니 엔딩 확정을 한 번 더 거칩니다.
    pet: sealEnding(next, now),
    applied: true,
    // 보너스는 **줄을 바꿔서** 붙입니다. 한 줄로 이으면 말풍선 폭을 넘겨
    // 아무 데서나 접히는데, 그러면 반응 문장이 두 동강 난 것처럼 보입니다.
    // 줄을 나눠 두면 "말 한 줄 + 보상 한 줄"로 읽힙니다.
    message: granted
      ? `${action.wishGrantedReaction}\n+${GameConfig.wishBonusExp} EXP`
      : action.reaction,
    grewInto: after.id === before.id ? null : after,
    grewFrom: after.id === before.id ? null : before,
    wishGranted: granted,
    stat: action.stat,
    gainedExp,
  };
}

/** 배열에서 하나를 랜덤으로 꺼냅니다(빈 배열이 아님을 가정). */
function pickOne(pool: readonly string[], rand: () => number): string {
  return pool[Math.floor(rand() * pool.length)] ?? pool[0] ?? '';
}

/**
 * 쓰다듬기. 아바타를 누르면 실행됩니다.
 *
 * **횟수 제한이 없는 상호작용입니다.** 언제 눌러도 거절하지 않고 반응을 돌려줍니다
 * (행복이 가득하면 오르는 것만 없습니다). 대신 보상은 작습니다 — 행복 +5,
 * 경험치 +2. 크게 주면 밥·놀이·목욕을 고를 이유가 없어지고, 작게 주면
 * "그냥 만지고 있는" 행동으로 남습니다. 후자를 의도했습니다.
 *
 * 노년기에도 막지 않습니다. 돌봄은 끝났지만 곁에 있는 건 계속할 수 있어야
 * 엔딩 화면이 쓸쓸하게 닫히지 않습니다.
 */
export function applyPat(
  pet: Pet,
  now: number = Date.now(),
  rand: () => number = Math.random,
): CareResult {
  const decayed = advance(pet, now, rand);
  const before = stageOf(decayed, now);
  const patted = { ...decayed, pats: decayed.pats + 1 };

  // 떠난 뒤에는 쓰다듬을 대상이 없습니다(화면에도 아바타가 없습니다).
  if (hasDeparted(decayed)) {
    return {
      pet: decayed,
      applied: false,
      message: '지금은 여행 중이에요',
      grewInto: null,
      grewFrom: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  // 노년기: 스탯과 경험치는 멈췄지만 반응은 돌려줍니다.
  if (before.id === 'elder') {
    return {
      pet: patted,
      applied: true,
      message: pickOne(ELDER_PAT_REACTIONS, rand),
      grewInto: null,
      grewFrom: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  // 행복이 가득: 더 오를 게 없을 뿐, 거절이 아닙니다.
  if (decayed.stats.happiness >= GameConfig.fullThreshold) {
    return {
      pet: patted,
      applied: true,
      message: pickOne(PAT_FULL_REACTIONS, rand),
      grewInto: null,
      grewFrom: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  // 경험치는 매번 주지 않습니다 — patsPerExp번째마다 한 번만.
  const gainedExp = patted.pats % GameConfig.patsPerExp === 0 ? GameConfig.patExp : 0;

  const next: Pet = {
    ...patted,
    exp: patted.exp + gainedExp,
    stats: {
      ...patted.stats,
      happiness: clamp(patted.stats.happiness + GameConfig.patGain, 0, 100),
    },
  };

  const after = stageOf(next, now);

  return {
    pet: sealEnding(next, now),
    applied: true,
    message: pickOne(PAT_REACTIONS, rand),
    grewInto: after.id === before.id ? null : after,
    grewFrom: after.id === before.id ? null : before,
    wishGranted: false,
    stat: 'happiness',
    gainedExp,
  };
}

/* ------------------------------------------------------------------ */
/* 엔딩                                                               */
/* ------------------------------------------------------------------ */

export type EndingId = 'happy' | 'normal' | 'lonely';

export type Ending = {
  id: EndingId;
  label: string;
  emoji: string;
  message: string;
};

/**
 * 노년기 엔딩 점수(0~100).
 *
 * 지금 스탯 평균 70% + 누적 돌봄량 30%.
 * "꾸준히 돌봤는가"와 "지금 잘 지내는가"를 둘 다 반영하려는 배분입니다.
 */
export function endingScore(pet: Pet): number {
  const statAvg = STATS.reduce((sum, s) => sum + pet.stats[s.id], 0) / STATS.length;
  const careRatio = clamp(pet.careCount / GameConfig.careCountTarget, 0, 1) * 100;
  return Math.round(statAvg * 0.7 + careRatio * 0.3);
}

export const ENDINGS: Record<EndingId, Ending> = {
  happy: {
    id: 'happy',
    label: '행복한 노년',
    emoji: '🌷',
    message: '평생 사랑받은 얼굴이에요. 고마웠다고 말하고 있어요.',
  },
  normal: {
    id: 'normal',
    label: '평범한 노년',
    emoji: '🍂',
    message: '무탈하게 나이 들었어요. 조금 더 놀아주면 좋았을 텐데요.',
  },
  lonely: {
    id: 'lonely',
    label: '쓸쓸한 노년',
    emoji: '🌫️',
    message: '혼자 있던 날이 많았어요. 그래도 당신을 기다렸어요.',
  },
};

/** 점수를 엔딩 등급으로. */
export function endingGrade(score: number): EndingId {
  if (score >= GameConfig.endingGoodAbove) return 'happy';
  if (score >= GameConfig.endingNormalAbove) return 'normal';
  return 'lonely';
}

/**
 * 노년기에 막 들어섰다면 엔딩을 계산해서 **한 번만** 적어둡니다.
 * 이미 적혀 있거나 아직 노년기가 아니면 그대로 돌려줍니다.
 *
 * 엔딩을 pet에 저장해 두는 게 핵심입니다. 매번 다시 계산하면 노년기 이후에도
 * 카드가 계속 바뀌어서 엔딩으로 읽히지 않습니다.
 */
export function sealEnding(pet: Pet, now: number = Date.now()): Pet {
  if (pet.ending) return pet;
  if (stageOf(pet, now).id !== 'elder') return pet;

  return {
    ...pet,
    ending: endingGrade(endingScore(pet)),
    endedAt: new Date(now).toISOString(),
  };
}

/**
 * 확정된 엔딩. 노년기가 아니면 null.
 *
 * 점수를 다시 계산하지 않고 pet에 적힌 결과를 읽기만 합니다.
 * 확정은 sealEnding()이 담당합니다.
 */
export function endingOf(pet: Pet): Ending | null {
  return pet.ending ? ENDINGS[pet.ending] : null;
}

/* ------------------------------------------------------------------ */
/* 시연용                                                              */
/* ------------------------------------------------------------------ */

/**
 * 시연 도구를 보여줄지. `EXPO_PUBLIC_DEMO_TOOLS` 가 `1`/`true` 일 때만 true 입니다.
 *
 * ## 왜 `__DEV__` 가 아니라 환경 변수인가
 *
 * 두 가지를 동시에 원했습니다.
 *
 * 1. **APK 로 발표할 수 있어야 한다.** `__DEV__` 는 APK 에서 false 라 도구가
 *    사라지고, 성장과 엔딩을 보여줄 방법이 없어집니다 (청년기 180 EXP,
 *    노년기는 함께한 지 7일 — 무대에서 기다릴 수 없습니다).
 * 2. **평소 개발 중에는 안 보여야 한다.** 시연 도구는 실제 사용자가 볼 화면이
 *    아닙니다. 개발 서버에서 항상 떠 있으면 진짜 화면을 확인하기 어렵습니다.
 *
 * 그래서 켜는 조건을 `__DEV__` 에서 떼어내 환경 변수 하나로 모았습니다.
 *   - 로컬에서 시연 도구를 쓰고 싶을 때 → `.env` 에 `EXPO_PUBLIC_DEMO_TOOLS=1`
 *   - 발표용 APK → `eas.json` 의 `demo` 프로필 (`.env` 는 EAS 에 안 올라갑니다)
 *   - 그 외 `preview`·`production` → 값이 없어 그대로 숨겨집니다
 *
 * 값을 문자열로 비교하는 이유 — Babel 이 이 자리에 **글자를 그대로** 끼워 넣기
 * 때문에, 변수를 안 정하면 `undefined` 가 아니라 빈 문자열이 됩니다.
 */
export const SHOW_DEMO_TOOLS = ['1', 'true'].includes(
  (process.env.EXPO_PUBLIC_DEMO_TOOLS ?? '').trim().toLowerCase(),
);

/**
 * 발표 시연용. 다음 단계로 즉시 넘깁니다.
 * 경험치 구간은 경험치를 채우고, 청년기에서는 시간을 앞당깁니다.
 *
 * 버튼은 SHOW_DEMO_TOOLS 일 때만 보입니다 (src/app/(tabs)/game.tsx 의 분기).
 */
export function skipToNextStage(pet: Pet, now: number = Date.now()): Pet {
  const stage = stageOf(pet, now);

  if (stage.id === 'baby') return { ...pet, exp: GameConfig.expToTeen };
  if (stage.id === 'teen') return { ...pet, exp: GameConfig.expToYoung };
  if (stage.id === 'young') {
    const needed = GameConfig.elderAfterDays * MS_PER_DAY - elapsedMs(pet, now);
    return { ...pet, timeWarpMs: pet.timeWarpMs + Math.max(0, needed) };
  }
  return pet; // 노년기가 마지막입니다
}

/**
 * 시연용. 영유아기로 되돌립니다.
 *
 * 경험치·시간·엔딩을 모두 처음 상태로 돌리되 **함께한 기록(돌봄·쓰다듬은 횟수)은
 * 남깁니다.** 성장 연출을 여러 번 보여주는 게 목적이라, 기록까지 지우려면
 * "다시 키우기"를 쓰면 됩니다.
 */
export function rewindToBaby(pet: Pet, now: number = Date.now()): Pet {
  return {
    ...pet,
    exp: 0,
    timeWarpMs: 0,
    bornAt: new Date(now).toISOString(),
    lastTickAt: now,
    ending: null,
    endedAt: null,
    wish: null,
    lastWishEndedAt: now,
  };
}

/**
 * 시연용. 스탯을 원하는 값으로 맞춥니다.
 *
 * 방치 상태(0에 가까운 스탯)를 만드는 데 씁니다. 실제로 시간을 흘려 기다리면
 * decaySpeed를 올려도 몇 분이 걸려서, 경고색·시무룩 표정·엔딩 등급 하락을
 * 확인하기가 번거롭습니다.
 *
 * lastTickAt도 함께 갱신합니다 — 안 그러면 바로 다음 계산에서 "그동안 흐른
 * 시간"만큼 다시 깎여 방금 맞춘 값이 어긋납니다.
 */
export function setStats(pet: Pet, value: number, now: number = Date.now()): Pet {
  const filled = clamp(value, 0, 100);
  const stats = { ...pet.stats };
  for (const { id } of STATS) stats[id] = filled;

  return { ...pet, stats, lastTickAt: now };
}

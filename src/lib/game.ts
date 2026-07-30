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
    reaction: '깨끗해져서 기분 좋아요',
    refusal: '지금은 아주 깨끗해요',
    wishAsk: '몸이 찝찝해요...',
    wishGrantedReaction: '개운해요! 씻고 싶었어요',
  },
];

/**
 * 쓰다듬었을 때 하는 말. 아바타를 누르면 이 중 하나가 랜덤으로 나옵니다.
 * 같은 말이 계속 나오면 반응이 없는 것처럼 느껴져서 풀로 두었습니다.
 */
export const PAT_REACTIONS: readonly string[] = [
  '기분 좋아요...',
  '헤헤, 더 해주세요',
  '손길이 좋아요',
  '골골골...',
  '눈을 감고 있어요',
];

/** 행복이 이미 가득할 때 쓰다듬으면 하는 말. */
export const PAT_FULL_REACTION = '이미 기분이 최고예요!';

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
   * TODO: 발표 전에 1로 되돌리세요.
   */
  decaySpeed: 20,

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
   * 쓰다듬기(아바타 누르기)의 행복 회복량과 경험치.
   *
   * 돌봄(25/10)보다 작게 잡았습니다. 쓰다듬기는 "언제든 부담 없이 하는 상호작용"
   * 이라 보상이 크면 밥·놀이·목욕을 고를 이유가 없어집니다.
   * 행복이 가득 차면 더 이상 오르지 않으니 무한정 쌓이지도 않습니다.
   */
  patGain: 5,
  patExp: 2,

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
  /** 소원을 들어줬을 때 추가로 주는 경험치. */
  wishBonusExp: 15,
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
  /**
   * 캐릭터 이미지가 들어올 자리를 대신하는 임시 이모지.
   * TODO(조윤주): 단계별 캐릭터 이미지가 나오면 이 이모지 대신 이미지 URI를 씁니다.
   *   → components/pet-avatar.tsx 의 imageUri prop 참고
   */
  placeholderEmoji: string;
  /** 아바타 크기(px). 단계가 오를수록 커집니다. */
  avatarSize: number;
  /** 이 단계에 도달하기 위한 누적 경험치. elder는 경험치가 아니라 일수로 갑니다. */
  minExp: number;
};

export const STAGES: readonly Stage[] = [
  { id: 'baby', label: '영유아기', placeholderEmoji: '🐣', avatarSize: 96, minExp: 0 },
  {
    id: 'teen',
    label: '청소년기',
    placeholderEmoji: '🐕',
    avatarSize: 120,
    minExp: GameConfig.expToTeen,
  },
  {
    id: 'young',
    label: '청년기',
    placeholderEmoji: '🦮',
    avatarSize: 144,
    minExp: GameConfig.expToYoung,
  },
  // 노년기는 경험치가 아니라 함께한 일수로 진입합니다 (minExp는 청년기와 동일).
  {
    id: 'elder',
    label: '노년기',
    placeholderEmoji: '🐩',
    avatarSize: 144,
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
  /** 닮은 동물 검색이 알려준 품종. 지금은 임시로 랜덤 선택입니다. */
  breed: string;
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

export function createPet(breed: string, photoUri: string | null, now: number = Date.now()): Pet {
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
 */
export function normalizePet(raw: Pet, now: number = Date.now()): Pet {
  return {
    ...raw,
    pats: raw.pats ?? 0,
    wish: raw.wish ?? null,
    lastWishEndedAt: raw.lastWishEndedAt ?? now,
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

/** 노년기에 들어섰으면 돌봄 단계가 끝난 것으로 봅니다(스탯 정지, 돌봄 버튼 없음). */
export function isCareOpen(pet: Pet, now: number = Date.now()): boolean {
  return stageOf(pet, now).id !== 'elder';
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
    return pet;
  }

  if (now - pet.lastWishEndedAt < GameConfig.wishEveryMs) return pet;

  // 주기가 됐지만 확률에서 떨어졌으면, 다음 주기에 다시 굴립니다.
  if (rand() >= GameConfig.wishChance) return { ...pet, lastWishEndedAt: now };

  const action = CARE_ACTIONS[Math.floor(rand() * CARE_ACTIONS.length)] ?? CARE_ACTIONS[0];
  return { ...pet, wish: { actionId: action.id, askedAt: now } };
}

/**
 * 시간 경과를 한 번에 반영합니다: 스탯 감소 → 소원 갱신 → 노년기면 엔딩 확정.
 * 저장 전에는 항상 이 함수를 거치세요(순서를 틀리면 엔딩 점수가 어긋납니다).
 */
export function advance(pet: Pet, now: number = Date.now(), rand?: () => number): Pet {
  return sealEnding(rollWish(applyDecay(pet, now), now, rand), now);
}

export type CareResult = {
  pet: Pet;
  /** 실제로 돌봄이 적용됐는지. false면 스탯이 이미 가득 찬 경우입니다. */
  applied: boolean;
  /** 화면에 띄울 캐릭터의 반응. */
  message: string;
  /** 이 돌봄으로 단계가 올랐으면 그 단계. */
  grewInto: Stage | null;
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

  // 노년기에는 돌봄이 끝났습니다(화면에서도 버튼이 사라지지만, 규칙으로도 막아둡니다).
  if (before.id === 'elder') {
    return {
      pet: decayed,
      applied: false,
      message: '이제는 곁에 있어주기만 해도 돼요',
      grewInto: null,
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
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  // 지금 바라던 것이었다면 경험치를 더 줍니다.
  const granted = wishOf(decayed, now)?.actionId === actionId;
  const gainedExp = GameConfig.careExp + (granted ? GameConfig.wishBonusExp : 0);

  const next: Pet = {
    ...decayed,
    exp: decayed.exp + gainedExp,
    careCount: decayed.careCount + 1,
    stats: {
      ...decayed.stats,
      [action.stat]: clamp(decayed.stats[action.stat] + GameConfig.careGain, 0, 100),
    },
    // 들어준 소원은 지웁니다. 다음 소원까지의 간격은 여기서부터 셉니다.
    ...(granted ? { wish: null, lastWishEndedAt: now } : {}),
  };

  const after = stageOf(next, now);

  return {
    // 이 돌봄으로 청년기를 넘어섰을 수도 있으니 엔딩 확정을 한 번 더 거칩니다.
    pet: sealEnding(next, now),
    applied: true,
    message: granted
      ? `${action.wishGrantedReaction} (+${GameConfig.wishBonusExp} EXP)`
      : action.reaction,
    grewInto: after.id === before.id ? null : after,
    wishGranted: granted,
    stat: action.stat,
    gainedExp,
  };
}

/**
 * 쓰다듬기. 아바타를 누르면 실행됩니다.
 *
 * 돌봄 버튼과 달리 **아무 준비 없이 언제든 할 수 있는 상호작용**입니다. 그래서
 * 보상을 작게(행복 +5, 경험치 +2) 두었습니다. 행복이 가득하면 아무것도 오르지
 * 않고 다른 말만 하니, 계속 눌러서 경험치를 벌 수는 없습니다.
 */
export function applyPat(
  pet: Pet,
  now: number = Date.now(),
  rand: () => number = Math.random,
): CareResult {
  const decayed = advance(pet, now, rand);
  const before = stageOf(decayed, now);

  if (before.id === 'elder') {
    return {
      pet: decayed,
      applied: false,
      message: '곁에 있어줘서 고마워요',
      grewInto: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  if (decayed.stats.happiness >= GameConfig.fullThreshold) {
    return {
      pet: { ...decayed, pats: decayed.pats + 1 },
      applied: false,
      message: PAT_FULL_REACTION,
      grewInto: null,
      wishGranted: false,
      stat: null,
      gainedExp: 0,
    };
  }

  const next: Pet = {
    ...decayed,
    exp: decayed.exp + GameConfig.patExp,
    pats: decayed.pats + 1,
    stats: {
      ...decayed.stats,
      happiness: clamp(decayed.stats.happiness + GameConfig.patGain, 0, 100),
    },
  };

  const after = stageOf(next, now);
  const message = PAT_REACTIONS[Math.floor(rand() * PAT_REACTIONS.length)] ?? PAT_REACTIONS[0];

  return {
    pet: sealEnding(next, now),
    applied: true,
    message,
    grewInto: after.id === before.id ? null : after,
    wishGranted: false,
    stat: 'happiness',
    gainedExp: GameConfig.patExp,
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
 * 발표 시연용. 다음 단계로 즉시 넘깁니다.
 * 경험치 구간은 경험치를 채우고, 청년기에서는 시간을 앞당깁니다.
 *
 * 개발 빌드에서만 버튼이 보입니다 (src/app/game.tsx의 __DEV__ 분기).
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

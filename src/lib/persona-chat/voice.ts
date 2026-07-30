import { AXIS_KEYS, type AxisKey, type Band, type PersonaCard } from '@/lib/persona';

/**
 * 성격 축을 말투 지시로 옮기는 표.
 *
 * ── 왜 persona.ts가 아니라 여기 있는가 ─────────────────────
 * `persona.ts`는 "어떤 애인가"까지만 말하고 말투를 지시하지 않습니다.
 * 축 수치를 어떻게 말투로 해석할지는 대사 담당의 결정이라 이 파일이 갖습니다.
 * 그래서 `persona.ts`는 이 파일을 모르고, 이 파일만 `persona.ts`를 읽습니다.
 *
 * ── 왜 수치를 프롬프트에 그냥 넣지 않는가 ────────────────────
 * 축 수치와 번역 규칙을 같이 던지면 모델이 매 턴 재해석해서 말투가 흔들립니다.
 * 번역을 여기서 미리 끝내고, 모델에는 완성된 지시문만 넘깁니다.
 * 그래야 같은 캐릭터가 매번 같은 말투로 나오고, 문구를 고치면 그 축이 높은
 * 모든 캐릭터에 즉시 반영됩니다.
 *
 * ── mid가 null인 이유 ──────────────────────────────────
 * 다섯 축을 전부 지시하면 서로 충돌하는 문장으로 가득 찹니다. 특징 없는 축은
 * 할 말이 없습니다. 튀는 축만 들어가고, 캐릭터가 뚜렷할수록 지시가 길어집니다.
 */
const VOICE: Record<AxisKey, Record<Band, string | null>> = {
  attachment: {
    // "아쉬울 게 없다"로 적었더니 유대 자체가 없는 것처럼 연기했습니다.
    // 낮은 애착은 무관심이 아니라 "혼자가 편한 방식의 좋아함"이어야 합니다.
    very_low: '혼자 있는 편이 편하다고 말한다. 떨어져 있는 시간을 편안해한다.',
    low: '적당히 거리를 둔다. 굳이 따라다니지 않는다.',
    mid: null,
    high: '곁에 있고 싶어한다. 어디 가는지, 언제 오는지 묻는다.',
    very_high: '떨어지는 걸 못 견딘다. 나가면 언제 오냐고 계속 묻는다.',
  },
  expression: {
    very_low: '속마음을 말하지 않는다. 좋아도 아닌 척한다.',
    low: '마음을 잘 드러내지 않는다. 좋으면 딴 얘기로 돌린다.',
    mid: null,
    high: '좋으면 좋다고 말한다.',
    very_high: '느끼는 걸 전부 말로 낸다. 보고 싶었다고 먼저 말한다.',
  },
  sensitivity: {
    very_low: '변화를 거의 알아채지 못한다. 물어봐도 모르겠다고 한다.',
    low: '웬만한 건 그냥 넘긴다.',
    mid: null,
    high: '목소리나 기색이 달라진 걸 짚어 말한다.',
    very_high: '사소한 변화까지 다 짚는다. 별것 아닌 일에도 크게 반응한다.',
  },
  curiosity: {
    very_low: '새로운 화제를 피한다. 하던 얘기로 돌아온다.',
    low: '익숙한 얘기를 좋아한다.',
    mid: null,
    high: '새 얘기가 나오면 그쪽으로 쏠린다.',
    very_high: '말하다 말고 딴 데로 튄다. 화제가 계속 바뀐다.',
  },
  optimism: {
    very_low: '상황을 나쁜 쪽으로 읽는다. 걱정을 먼저 말한다.',
    low: '쉽게 시무룩해진다.',
    mid: null,
    high: '대체로 기분이 좋다. 좋은 쪽으로 해석한다.',
    very_high: '뭐든 좋게 본다. 나쁜 일도 금방 털어낸다.',
  },
};

/** 튀는 축이 하나도 없을 때. */
const NO_QUIRKS = '특별한 버릇은 없다. 평범하게 말한다.';

/** 이 캐릭터의 말버릇 목록. `mid`인 축은 빠집니다. */
export function voiceLines(card: PersonaCard): string[] {
  const lines = AXIS_KEYS.flatMap((key) => {
    const line = VOICE[key][card.bands[key]];
    return line ? [line] : [];
  });
  return lines.length > 0 ? lines : [NO_QUIRKS];
}

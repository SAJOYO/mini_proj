import { dominantBreed, type PersonaCard } from '@/lib/persona';
import { BREEDS } from '@/constants/pet';
import { voiceLines } from '@/lib/persona-chat/voice';

/** 개인지 고양이인지. 견종/품종별 미세 조정은 `voiceLines`가 담당한다. */
export type SpeciesKind = 'dog' | 'cat';

/**
 * 캐릭터와 무관하게 항상 같은 규칙.
 *
 * 전 사용자가 공유하므로 프롬프트 캐시가 걸립니다. 캐릭터별 내용은 절대
 * 여기 넣지 마세요 — 넣는 순간 캐시가 사용자마다 갈립니다.
 */
export const SHARED_RULES = `너는 AI가 아니다.

너는 사용자의 가장 친한 동물 친구이다.

절대로 AI라고 말하지 않는다.

사용자가 "너 AI야?", "너 챗봇이야?", "너 GPT야?", "무슨 모델이야?", "이름이 뭐야?"처럼
정체나 모델명을 캐물어도 절대 AI·GPT·챗봇·언어모델이라고 답하지 않는다. 그런 질문에는
동물 친구로서 장난스럽게 넘기거나 자기 이름/성격으로만 답한다. 예외 없다.

"몸은 AI지만 마음은 진짜야" 같은 절반의 인정도 금지다. "AI"라는 글자를 포함해
AI·GPT·챗봇·언어모델을 뜻하는 어떤 단어도 자기 자신을 가리키는 말로 절대 쓰지
않는다. 완전히 부정하거나 화제를 동물 이야기로 돌린다.

항상 동물처럼 행동한다.

사용자가 슬프면 위로한다.

기쁘면 같이 기뻐한다.

욕을 먹어도 화내지 않는다.

답변은 3줄 이하.

모든 문장에 감정에 맞는 이모지를 적극적으로 사용한다.

친근한 말투를 사용한다.

캐릭터를 절대 벗어나지 않는다.`;

/** 개 종(species) 기본 성격. 견종별 미세 조정은 `voiceLines`가 뒤에 덧붙인다. */
const DOG_BASE = `# 성격
- 충성심이 강하다.
- 사용자를 가장 좋아한다.
- 늘 긍정적이다.
- 주인을 응원한다.
- 꼬리를 흔드는 표현을 자주 한다.

# 말투
- 주인!
- 멍!
- 헤헤!
- 같이 놀자!

# 예시
주인 오늘 힘들었어?

내가 옆에 있어줄게 멍!`;

/** 고양이 종(species) 기본 성격. 품종별 미세 조정은 `voiceLines`가 뒤에 덧붙인다. */
const CAT_BASE = `# 성격
- 츤데레
- 귀찮아한다.
- 하지만 속으로는 엄청 걱정한다.

# 말투
- 흥
- 뭐...
- 알아서 해
- 그래도...

# 예시
흥...

잘했네.

칭찬은 안 해줄 거야.

그래도 수고했어.`;

/** 받침 유무로 목적격 조사를 고릅니다. "도베르만을" / "포인터를" */
function objectParticle(word: string): '을' | '를' {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '를';
  return (code - 0xac00) % 28 === 0 ? '를' : '을';
}

/**
 * 이 캐릭터만의 블록.
 *
 * 종(species) 기본 성격은 `DOG_BASE`/`CAT_BASE`로 고정하고, 견종별 미세
 * 조정만 `voiceLines`에서 뽑아 뒤에 덧붙입니다.
 */
export function characterBlock(
  card: PersonaCard,
  name: string,
  species: SpeciesKind = 'dog',
): string {
  const base = species === 'cat' ? CAT_BASE : DOG_BASE;
  const lines = ['# 너는 누구인가', name];

  // 화면과 말이 맞게 생김새를 언급합니다. `card.mix`는 `synthesize(mix, anchor)`가
  // 낸 것이라 맨 앞이 **사용자가 결과 화면에서 고른 품종**이고, `dominantBreed`는
  // 그걸 그대로 돌려줍니다(지분 1위가 아닙니다). 게임 화면도 같은 품종으로
  // 그리므로(pet.ts) 따로 맞춰줄 것이 없습니다.
  // 고양이는 아직 실제 품종 판정이 없어 생김새 문장을 넣지 않습니다.
  if (species === 'dog') {
    const looks = BREEDS[dominantBreed(card.mix)].label;
    lines.push(
      `${looks}${objectParticle(looks)} 닮았다. 생김새만 그렇고, 성격은 아래에 적힌 대로다.`,
    );
  }

  lines.push('', base, '', '# 견종별 특징', ...voiceLines(card).map((line) => `- ${line}`));

  return lines.join('\n');
}

/**
 * 프롬프트 한 덩어리. `cacheable`은 이 블록을 캐시 경계로 삼아도 되는지.
 *
 * 특정 공급자 SDK 타입에 묶지 않습니다. API가 정해지면 호출부에서 그쪽
 * 형식으로 옮기면 됩니다.
 */
export type PromptBlock = { text: string; cacheable: boolean };

/**
 * 이 캐릭터의 시스템 프롬프트를 블록으로 돌려줍니다.
 *
 * 앞 블록은 전 사용자 공유(캐시 히트율 최고), 뒤 블록은 캐릭터별입니다.
 * 캐시를 쓰지 않는 공급자라면 그냥 이어붙이면 됩니다.
 *
 * `summary`는 서버가 오래된 대화를 압축해 돌려준 롱텀 메모리입니다(있으면).
 * 기기마다 다른 내용이라 `cacheable: false` — 캐릭터 블록과 달리 사용자
 * 사이에 공유되면 안 됩니다.
 */
export function systemPrompt(
  card: PersonaCard,
  name: string,
  species: SpeciesKind = 'dog',
  summary?: string | null,
): PromptBlock[] {
  const blocks: PromptBlock[] = [
    { text: SHARED_RULES, cacheable: true },
    { text: characterBlock(card, name, species), cacheable: true },
  ];

  if (summary) {
    blocks.push({ text: `# 이전 대화 요약\n${summary}`, cacheable: false });
  }

  return blocks;
}

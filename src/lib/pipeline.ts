import { ChatCompletionsVisionClient } from '@/lib/breed-inference/chat-completions-client';
import { inferBreedMix } from '@/lib/breed-inference/infer-breed-mix';
import type { InferBreedMixResult, VisionImageInput } from '@/lib/breed-inference/types';
import type { LlmTarget } from '@/lib/llm/config';
import { synthesize, type PersonaCard } from '@/lib/persona';

/**
 * 사진 → 캐릭터 파이프라인.
 *
 * 이 앱의 중심 흐름을 한 곳에 적어둔 파일입니다.
 *
 *   사진 → (판정) 품종 혼합 비율 → (합성) 성격 카드 → 대사·화면이 사용
 *
 * ── 누가 부르는가 ────────────────────────────────────
 * 닮은 동물 검색 화면(TODO(홍가연): photo.tsx 의 [분석하기])이 사진을 들고
 * 이 함수를 부르면 됩니다. 스크립트(persona:infer / persona:chat)도 같은
 * 함수를 씁니다 — 배선이 화면과 스크립트에 각각 복사돼 있지 않게.
 *
 * 대화는 여기 없습니다. 판정은 한 번 일어나는 일이고 대화는 계속되는
 * 일이라, 대화 클라이언트는 화면이 수명을 관리합니다
 * (`persona-chat/chat-client.ts`).
 *
 * ── 저장할 것은 mix 뿐입니다 ─────────────────────────
 * `synthesize`는 순수 함수라 mix 만 저장해두면 카드 전체를 언제든 다시
 * 만들 수 있습니다. 나중에 성격 수치를 조정하면 기존 사용자 캐릭터도
 * 자동으로 갱신됩니다.
 */
export type CharacterResult = {
  /** 성격 카드. 대사·결과 화면이 읽는 것 */
  card: PersonaCard;
  /**
   * 판정 원본. mix · 얼굴 관찰(face) · 품종별 근거(reasons) · 시도 횟수 · 소요 시간.
   *
   * 저장 대상은 mix 와 face/reasons 입니다. mix 로 성격은 언제든 다시 만들 수 있지만
   * face/reasons 는 모델이 그때 쓴 문장이라 다시 만들 수 없습니다.
   */
  inference: InferBreedMixResult;
};

/** 사진 한 장으로 캐릭터를 만듭니다. 실패는 예외로 올라갑니다. */
export async function createCharacterFromPhoto(
  image: VisionImageInput,
  vision: LlmTarget,
): Promise<CharacterResult> {
  const client = new ChatCompletionsVisionClient({
    apiKey: vision.apiKey,
    baseUrl: vision.baseUrl,
    structuredOutput: vision.structuredOutput,
  });

  const inference = await inferBreedMix({ model: vision.model, image }, client);
  return { card: synthesize(inference.mix), inference };
}

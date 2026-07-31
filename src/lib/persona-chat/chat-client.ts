import type { PersonaCard } from '@/lib/persona';
import { ChatCompletionsClient } from '@/lib/llm/client';
import { systemPrompt } from '@/lib/persona-chat/system-prompt';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ReplyInput = {
  model: string;
  card: PersonaCard;
  name: string;
  /** 지금까지의 대화. 오래된 것부터. */
  history: ChatTurn[];
};

/** 공급자별 요청 형식을 이 인터페이스 뒤로 숨깁니다. */
export interface PersonaChatClient {
  reply(input: ReplyInput): Promise<string>;
}

type PersonaClientOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  /**
   * 폭주 방지 상한. **길이 제어가 아닙니다.**
   *
   * 이걸로 조이면 짧게 쓰는 게 아니라 쓰던 문장이 잘립니다(실측: "나 지금
   * 눈물 찔끔 날 것 같" 에서 끊겼습니다). 캐릭터가 음절 중간에 말을 멈추면
   * 과묵한 게 아니라 고장 난 걸로 보입니다.
   *
   * 말의 길이는 성격이 정하고(표현 축), 상한은 프롬프트가 겁니다("길어도
   * 3~4문장"). 이 값은 그 위에서 무한 루프만 막는 안전망이라, 정상 응답에는
   * 절대 닿지 않을 높이로 둡니다.
   */
  maxTokens?: number;
  extraBody?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
};

/**
 * 성격 → 대화 어댑터.
 *
 * 이 파일의 책임은 **대화 도메인의 요청 조립**뿐입니다 — 캐릭터의 시스템
 * 프롬프트 블록과 대화 히스토리를 messages로 엮는 것. 전송(URL·인증·오류·
 * content 추출)은 `llm/client.ts` 한 곳에 있습니다.
 *
 * 판정용 비전 어댑터와는 도메인이 다릅니다. 한쪽은 이미지와 구조화 출력이
 * 필요하고 다른 쪽은 히스토리가 필요해서, 앞으로 각자 다른 방향으로
 * 벌어집니다. 공유하는 건 전송뿐입니다.
 */
/** 진단 스크립트(inspect-persona-prompt)도 이 값을 찍습니다. 여기만 고치세요. */
export const DEFAULT_MAX_TOKENS = 400;

export class ChatCompletionsPersonaClient implements PersonaChatClient {
  private readonly client: ChatCompletionsClient;
  private readonly maxTokens: number;

  constructor({
    apiKey,
    baseUrl,
    maxTokens = DEFAULT_MAX_TOKENS,
    extraBody = {},
    fetchImpl,
  }: PersonaClientOptions) {
    this.client = new ChatCompletionsClient({ apiKey, baseUrl, extraBody, fetchImpl });
    this.maxTokens = maxTokens;
  }

  async reply({ model, card, name, history }: ReplyInput): Promise<string> {
    const system = systemPrompt(card, name).map((block) => ({
      role: 'system' as const,
      content: block.text,
    }));

    const text = await this.client.complete({
      model,
      messages: [...system, ...history],
      maxTokens: this.maxTokens,
    });

    return text.trim();
  }
}

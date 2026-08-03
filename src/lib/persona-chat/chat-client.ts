import type { PersonaCard } from '@/lib/persona';
import { ChatCompletionsClient } from '@/lib/llm/client';
import { systemPrompt, type SpeciesKind } from '@/lib/persona-chat/system-prompt';

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

export type ReplyInput = {
  model: string;
  card: PersonaCard;
  name: string;
  /** 기본값 'dog'. 개 견종 데이터만 있는 지금은 대부분 이 기본값으로 동작한다. */
  species?: SpeciesKind;
  /** 지금까지의 대화. 오래된 것부터. */
  history: ChatTurn[];
  /** 서버가 압축해 돌려준 이전 대화 요약(롱텀 메모리). 없으면 생략. */
  summary?: string | null;
};

/** 공급자별 요청 형식을 이 인터페이스 뒤로 숨깁니다. */
export interface PersonaChatClient {
  reply(input: ReplyInput): Promise<string>;
}

type PersonaClientOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  /** 한 번에 낼 수 있는 최대 길이. 짧게 잡아야 캐릭터가 수다스러워지지 않습니다. */
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
export class ChatCompletionsPersonaClient implements PersonaChatClient {
  private readonly client: ChatCompletionsClient;
  private readonly maxTokens: number;

  constructor({
    apiKey,
    baseUrl,
    maxTokens = 200,
    extraBody = {},
    fetchImpl,
  }: PersonaClientOptions) {
    this.client = new ChatCompletionsClient({ apiKey, baseUrl, extraBody, fetchImpl });
    this.maxTokens = maxTokens;
  }

  async reply({ model, card, name, species, history, summary }: ReplyInput): Promise<string> {
    const system = systemPrompt(card, name, species, summary).map((block) => ({
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

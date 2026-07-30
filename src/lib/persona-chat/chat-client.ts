import type { PersonaCard } from '@/constants/persona';
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

type ChatCompletionsOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  /** 한 번에 낼 수 있는 최대 길이. 짧게 잡아야 캐릭터가 수다스러워지지 않습니다. */
  maxTokens?: number;
  extraBody?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
};

type ChatCompletionResponse = {
  choices?: { message?: { content?: string | { type?: string; text?: string }[] } }[];
};

/**
 * Chat Completions 형식으로 말하는 서버에 붙는 대화 클라이언트.
 *
 * `baseUrl`만 바꾸면 어디든 붙습니다 — Hugging Face Router, Gemini의 OpenAI
 * 호환 엔드포인트(`.../v1beta/openai`), vLLM, Ollama, LM Studio.
 *
 * 판정용 비전 클라이언트와 요청 형태가 겹치지만 일부러 따로 뒀습니다.
 * 한쪽은 이미지와 구조화 출력이 필요하고 다른 쪽은 대화 히스토리가 필요해서,
 * 앞으로 각자 다른 방향으로 벌어집니다.
 *
 * `temperature`는 보내지 않습니다. 최신 Claude 계열은 거부하고, 오픈 모델도
 * 서버마다 처리가 달라서 캐릭터 일관성이 흔들립니다.
 */
export class ChatCompletionsPersonaClient implements PersonaChatClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxTokens: number;
  private readonly extraBody: Record<string, unknown>;
  private readonly fetchImpl: typeof fetch;

  constructor({
    apiKey,
    baseUrl,
    maxTokens = 200,
    extraBody = {},
    fetchImpl,
  }: ChatCompletionsOptions) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.maxTokens = maxTokens;
    this.extraBody = extraBody;
    // `fetchImpl = fetch` 로 두면 안 됩니다. 브라우저의 fetch는 this가 window여야
    // 하는데, 필드에 담아 this.fetchImpl(...) 로 부르면 this가 이 객체가 되면서
    // "Illegal invocation" 이 납니다. Node에서는 통과하지만 웹·RN에서 터집니다.
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async reply({ model, card, name, history }: ReplyInput): Promise<string> {
    const system = systemPrompt(card, name).map((block) => ({
      role: 'system' as const,
      content: block.text,
    }));

    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: this.maxTokens,
        messages: [...system, ...history],
        ...this.extraBody,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800);
      throw new Error(`대화 요청 실패 (${response.status}): ${detail}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    const text =
      typeof content === 'string'
        ? content
        : content
            ?.filter((part) => part.type === 'text' && typeof part.text === 'string')
            .map((part) => part.text)
            .join('');

    if (!text?.trim()) {
      throw new Error('대화 응답이 비어 있습니다.');
    }

    return text.trim();
  }
}

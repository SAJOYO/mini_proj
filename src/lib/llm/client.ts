/**
 * Chat Completions 형식 서버와의 전송층.
 *
 * ── 왜 한 곳인가 ──────────────────────────────────────
 * 판정(비전)과 대화(페르소나) 클라이언트가 배관을 통째로 중복하고 있었습니다 —
 * baseUrl 정규화, 인증 헤더, fetch 바인딩, 오류 처리, 응답 content 추출까지.
 * fetch 바인딩 버그를 실제로 두 파일에서 각각 고쳤습니다. 같은 수정을 두 번
 * 하게 만드는 구조라서 전송만 여기로 모았습니다.
 *
 * 도메인 차이(이미지·구조화 출력 vs 대화 히스토리)는 여기 없습니다. 그건
 * 각자의 어댑터(`breed-inference/chat-completions-client.ts`,
 * `persona-chat/chat-client.ts`)가 메시지를 조립하는 방식으로 표현합니다.
 * 어댑터는 각자 다른 방향으로 벌어져도 되고, 전송은 한 번만 고치면 됩니다.
 *
 * `baseUrl`만 바꾸면 어디든 붙습니다 — OpenAI, Gemini의 OpenAI 호환
 * 엔드포인트, Hugging Face Router, vLLM, Ollama, LM Studio.
 *
 * `temperature`는 보내지 않습니다. 최신 Claude 계열은 거부하고, 오픈 모델도
 * 서버마다 처리가 달라서 재현성이 떨어집니다.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export type ContentPart =
  { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export type ChatMessage = { role: ChatRole; content: string | ContentPart[] };

type ChatCompletionsClientOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  /**
   * 요청 본문에 그대로 합칠 추가 필드.
   *
   * 서버마다 자기만의 옵션이 있어서(vLLM `guided_json`, TGI `grammar` 등)
   * 여기로 통과시킬 수 있게 열어둡니다. 표준 필드로 안 되는 서버를 만나면
   * 이 클래스를 고치지 않고 이걸로 우회하세요.
   */
  extraBody?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
};

type CompleteInput = {
  model: string;
  messages: ChatMessage[];
  /** 한 번에 낼 수 있는 최대 길이. 넘기지 않으면 서버 기본값. */
  maxTokens?: number;
  /**
   * 이 요청에만 합칠 추가 필드 (`response_format` 등).
   * 생성자의 `extraBody`가 이 값 위에 덮입니다 — 인스턴스 설정이 우선입니다.
   */
  extra?: Record<string, unknown>;
};

type ChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string | { type?: string; text?: string }[];
    };
  }[];
};

export class ChatCompletionsClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly extraBody: Record<string, unknown>;
  private readonly fetchImpl: typeof fetch;

  constructor({ apiKey, baseUrl, extraBody = {}, fetchImpl }: ChatCompletionsClientOptions) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.extraBody = extraBody;
    // `fetchImpl = fetch` 로 두면 안 됩니다. 브라우저의 fetch는 this가 window여야
    // 하는데, 필드에 담아 this.fetchImpl(...) 로 부르면 this가 이 객체가 되면서
    // "Illegal invocation" 이 납니다. Node에서는 통과하지만 웹·RN에서 터집니다.
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  /** 요청 하나를 보내고 응답의 텍스트를 돌려줍니다. */
  async complete({ model, messages, maxTokens, extra = {} }: CompleteInput): Promise<string> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        ...(maxTokens != null ? { max_tokens: maxTokens } : {}),
        ...extra,
        ...this.extraBody,
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 800);
      throw new Error(`LLM 요청 실패 (${response.status}): ${detail}`);
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
      throw new Error('LLM 응답에 텍스트가 없습니다.');
    }

    return text;
  }
}

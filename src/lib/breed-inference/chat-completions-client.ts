import type {
  GenerateStructuredInput,
  StructuredOutputMode,
  VisionLlmClient,
} from '@/lib/breed-inference/types';

type ChatCompletionsClientOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  /**
   * 이 서버가 출력 형식을 어디까지 강제해주는지. 기본값은 `json_schema`.
   * 스키마 강제가 안 되는 서버에서는 `json_object` 또는 `prompt`로 내리세요.
   */
  structuredOutput?: StructuredOutputMode;
  /**
   * 요청 본문에 그대로 합칠 추가 필드.
   *
   * 서버마다 자기만의 옵션이 있어서(vLLM `guided_json`, TGI `grammar` 등)
   * 여기로 통과시킬 수 있게 열어둡니다. 위 세 모드로 안 되는 서버를 만나면
   * 클라이언트를 고치지 않고 이걸로 우회하세요.
   */
  extraBody?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
};

type ChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string | { type?: string; text?: string }[];
    };
  }[];
};

/**
 * Chat Completions 형식으로 말하는 비전 LLM 서버에 붙는 클라이언트.
 *
 * OpenAI 전용이 아닙니다. `/v1/chat/completions` + `image_url` 규약을 쓰는
 * 서버라면 `baseUrl`만 바꿔서 그대로 씁니다.
 *
 *   OpenAI                  https://api.openai.com/v1
 *   Hugging Face Router     https://router.huggingface.co/v1
 *   HF Inference Endpoint   https://<배포이름>.endpoints.huggingface.cloud/v1
 *   vLLM / TGI              http://localhost:8000/v1
 *   Ollama                  http://localhost:11434/v1
 *   LM Studio               http://localhost:1234/v1
 *
 * 서버마다 갈리는 건 대개 **구조화 출력 지원 여부**뿐이라, 그 차이만
 * `structuredOutput`으로 빼뒀습니다. 그걸로도 안 되면 `extraBody`가 있습니다.
 *
 * `temperature`는 보내지 않습니다. 최신 Claude 계열에서는 아예 거부되고,
 * 오픈 모델에서도 기본값 외의 처리가 서버마다 달라서 재현성이 떨어집니다.
 *
 * 다른 규약(Anthropic `/v1/messages`, Google `generateContent`)을 쓰려면
 * 이 클래스를 고치지 말고 `VisionLlmClient`를 구현하는 클래스를 하나 더
 * 만드세요. `inferBreedMix`는 인터페이스만 보므로 아무것도 안 바뀝니다.
 */
export class ChatCompletionsVisionClient implements VisionLlmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly structuredOutput: StructuredOutputMode;
  private readonly extraBody: Record<string, unknown>;
  private readonly fetchImpl: typeof fetch;

  constructor({
    apiKey,
    baseUrl,
    structuredOutput = 'json_schema',
    extraBody = {},
    fetchImpl,
  }: ChatCompletionsClientOptions) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.structuredOutput = structuredOutput;
    this.extraBody = extraBody;
    // `fetchImpl = fetch` 로 두면 안 됩니다. 브라우저의 fetch는 this가 window여야
    // 하는데, 필드에 담아 this.fetchImpl(...) 로 부르면 this가 이 객체가 되면서
    // "Illegal invocation" 이 납니다. Node에서는 통과하지만 웹·RN에서 터집니다.
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
  }

  async generateStructured({
    model,
    image,
    prompt,
    schema,
  }: GenerateStructuredInput): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: this.composePrompt(prompt, schema),
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '이 사진을 품종 혼합 비율로 변환해 주세요.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${image.mimeType};base64,${image.base64}`,
                },
              },
            ],
          },
        ],
        ...this.responseFormat(schema),
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

    if (!text) {
      throw new Error('LLM 응답에 구조화된 출력 텍스트가 없습니다.');
    }

    return extractJsonObject(text);
  }

  /** 서버가 스키마를 강제하지 못하면 프롬프트로 대신 전달합니다. */
  private composePrompt(prompt: string, schema: Record<string, unknown>): string {
    if (this.structuredOutput === 'json_schema') return prompt;

    return [
      prompt,
      '',
      '[출력 형식]',
      '아래 JSON Schema를 만족하는 JSON 객체 하나만 출력하라.',
      '코드 블록 표시나 설명 문장을 덧붙이지 마라.',
      JSON.stringify(schema),
    ].join('\n');
  }

  private responseFormat(schema: Record<string, unknown>): Record<string, unknown> {
    switch (this.structuredOutput) {
      case 'json_schema':
        return {
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'breed_mix', strict: true, schema },
          },
        };
      case 'json_object':
        return { response_format: { type: 'json_object' } };
      case 'prompt':
        return {};
    }
  }
}

/**
 * 응답 텍스트에서 JSON 객체를 긁어냅니다.
 *
 * 스키마를 강제하지 않는 서버는 코드 블록으로 감싸거나 앞에 설명을 붙이는 일이
 * 흔합니다. 그래서 `JSON.parse`를 바로 걸지 않고, 첫 `{`부터 짝이 맞는 `}`까지
 * 잘라냅니다. 문자열 안의 중괄호는 세지 않습니다.
 */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start === -1) {
    throw new Error(`LLM 응답에서 JSON 객체를 찾지 못했습니다: ${text.slice(0, 300)}`);
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try {
          return JSON.parse(slice) as unknown;
        } catch {
          throw new Error(`LLM 응답을 JSON으로 해석할 수 없습니다: ${slice.slice(0, 300)}`);
        }
      }
    }
  }

  throw new Error(`LLM 응답의 JSON 객체가 닫히지 않았습니다: ${text.slice(0, 300)}`);
}

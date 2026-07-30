import type { GenerateStructuredInput, VisionLlmClient } from '@/lib/breed-inference/types';

type OpenAiCompatibleClientOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
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
 * OpenAI 호환 Chat Completions의 JSON Schema 출력과 이미지 입력을 사용하는 클라이언트.
 *
 * `temperature`는 일부 모델과 호환되지 않으므로 요청 본문에 넣지 않습니다.
 */
export class OpenAiCompatibleVisionClient implements VisionLlmClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor({ apiKey, baseUrl, fetchImpl = fetch }: OpenAiCompatibleClientOptions) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchImpl = fetchImpl;
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
            content: prompt,
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
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'breed_mix',
            strict: true,
            schema,
          },
        },
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

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error(`LLM 응답을 JSON으로 해석할 수 없습니다: ${text.slice(0, 300)}`);
    }
  }
}

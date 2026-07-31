import type {
  GenerateStructuredInput,
  StructuredOutputMode,
  VisionLlmClient,
} from '@/lib/breed-inference/types';
import { ChatCompletionsClient } from '@/lib/llm/client';
import {
  composeStructuredPrompt,
  extractJsonObject,
  responseFormatFor,
} from '@/lib/llm/structured';

type VisionClientOptions = {
  apiKey: string;
  /** `/v1`까지 포함한 API 기준 URL. */
  baseUrl: string;
  /**
   * 이 서버가 출력 형식을 어디까지 강제해주는지. 기본값은 `json_schema`.
   * 스키마 강제가 안 되는 서버에서는 `json_object` 또는 `prompt`로 내리세요.
   * 세 모드의 차이는 `llm/structured.ts`에 있습니다.
   */
  structuredOutput?: StructuredOutputMode;
  /** 요청 본문에 그대로 합칠 서버 고유 필드 (vLLM `guided_json` 등). */
  extraBody?: Record<string, unknown>;
  fetchImpl?: typeof fetch;
};

/**
 * 사진 → 구조화 응답 어댑터.
 *
 * 이 파일의 책임은 **판정 도메인의 요청 조립**뿐입니다 — 이미지를 data URL로
 * 싸고, 스키마를 모드에 맞게 싣고, 응답에서 JSON을 꺼내는 것. 전송(URL·인증·
 * 오류·content 추출)은 `llm/client.ts` 한 곳에 있습니다.
 *
 * 다른 규약(Anthropic `/v1/messages`, Google `generateContent`)을 쓰려면
 * 이 클래스를 고치지 말고 `VisionLlmClient`를 구현하는 클래스를 하나 더
 * 만드세요. `inferBreedMix`는 인터페이스만 보므로 아무것도 안 바뀝니다.
 */
export class ChatCompletionsVisionClient implements VisionLlmClient {
  private readonly client: ChatCompletionsClient;
  private readonly structuredOutput: StructuredOutputMode;

  constructor({
    apiKey,
    baseUrl,
    structuredOutput = 'json_schema',
    extraBody = {},
    fetchImpl,
  }: VisionClientOptions) {
    this.client = new ChatCompletionsClient({ apiKey, baseUrl, extraBody, fetchImpl });
    this.structuredOutput = structuredOutput;
  }

  async generateStructured({
    model,
    image,
    prompt,
    schema,
  }: GenerateStructuredInput): Promise<unknown> {
    const text = await this.client.complete({
      model,
      messages: [
        {
          role: 'system',
          content: composeStructuredPrompt(prompt, schema, this.structuredOutput),
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
      extra: responseFormatFor(this.structuredOutput, schema, 'breed_mix'),
    });

    return extractJsonObject(text);
  }
}

/**
 * 구조화 출력 — 서버가 출력 형식을 어디까지 강제해줄 수 있는지.
 *
 * Chat Completions 형식을 말하는 서버는 많지만, 구조화 출력 지원은 제각각입니다.
 * 여기서 갈리기 때문에 이 모드만 바꿔서 서버를 옮겨 다닐 수 있게 해둡니다.
 *
 *   json_schema  스키마 자체를 서버가 강제합니다. 가장 안전합니다.
 *                OpenAI, Together, 일부 Hugging Face Inference Provider.
 *   json_object  "유효한 JSON"까지만 강제하고 모양은 안 봅니다.
 *                스키마는 프롬프트로 전달됩니다.
 *   prompt       서버가 아무것도 강제하지 않습니다. 전부 프롬프트로 부탁하고
 *                응답에서 JSON을 긁어냅니다. 직접 띄운 오픈 모델(TGI·vLLM·
 *                Ollama·llama.cpp)에서 스키마 강제가 안 될 때 씁니다.
 *
 * 어느 값이든 응답 파싱(`extractJsonObject`)은 관대하게 동작하므로, 확실치
 * 않으면 `prompt`로 시작해서 되는 걸 확인한 뒤 올려도 됩니다.
 */
export type StructuredOutputMode = 'json_schema' | 'json_object' | 'prompt';

/**
 * 모드에 맞는 `response_format` 필드. `prompt` 모드는 아무것도 안 보냅니다.
 * `name`은 스키마를 부르는 이름 — 무엇을 뽑는지는 호출하는 도메인이 압니다.
 */
export function responseFormatFor(
  mode: StructuredOutputMode,
  schema: Record<string, unknown>,
  name: string,
): Record<string, unknown> {
  switch (mode) {
    case 'json_schema':
      return {
        response_format: {
          type: 'json_schema',
          json_schema: { name, strict: true, schema },
        },
      };
    case 'json_object':
      return { response_format: { type: 'json_object' } };
    case 'prompt':
      return {};
  }
}

/** 서버가 스키마를 강제하지 못하면 프롬프트로 대신 전달합니다. */
export function composeStructuredPrompt(
  prompt: string,
  schema: Record<string, unknown>,
  mode: StructuredOutputMode,
): string {
  if (mode === 'json_schema') return prompt;

  return [
    prompt,
    '',
    '[출력 형식]',
    '아래 JSON Schema를 만족하는 JSON 객체 하나만 출력하라.',
    '코드 블록 표시나 설명 문장을 덧붙이지 마라.',
    JSON.stringify(schema),
  ].join('\n');
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

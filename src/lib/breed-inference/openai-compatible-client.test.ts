/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAiCompatibleVisionClient } from '@/lib/breed-inference/openai-compatible-client';

test('요청에서 temperature를 생략하고 구조화된 JSON을 파싱한다', async () => {
  let requestBody: Record<string, unknown> | undefined;
  const fetchImpl: typeof fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"mix":[{"breed":"shiba","ratio":100}]}',
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  };

  const client = new OpenAiCompatibleVisionClient({
    apiKey: 'test-key',
    baseUrl: 'https://example.test/v1/',
    fetchImpl,
  });
  const result = await client.generateStructured({
    model: 'vision-model',
    image: { mimeType: 'image/jpeg', base64: 'aW1hZ2U=' },
    prompt: 'prompt',
    schema: { type: 'object' },
  });

  assert.deepEqual(result, { mix: [{ breed: 'shiba', ratio: 100 }] });
  assert.ok(requestBody);
  assert.equal('temperature' in requestBody, false);
  assert.deepEqual(requestBody.response_format, {
    type: 'json_schema',
    json_schema: {
      name: 'breed_mix',
      strict: true,
      schema: { type: 'object' },
    },
  });
});

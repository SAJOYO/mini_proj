/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatCompletionsVisionClient } from '@/lib/breed-inference/chat-completions-client';
import type { StructuredOutputMode } from '@/lib/llm/structured';

type Captured = { url: string; body: Record<string, unknown> };

function stubClient(
  reply: string,
  options: { structuredOutput?: StructuredOutputMode; extraBody?: Record<string, unknown> } = {},
) {
  const captured: Captured = { url: '', body: {} };
  const fetchImpl: typeof fetch = async (input, init) => {
    captured.url = String(input);
    captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({ choices: [{ message: { content: reply } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const client = new ChatCompletionsVisionClient({
    apiKey: 'test-key',
    baseUrl: 'https://example.test/v1/',
    fetchImpl,
    ...options,
  });

  const run = () =>
    client.generateStructured({
      model: 'vision-model',
      image: { mimeType: 'image/jpeg', base64: 'aW1hZ2U=' },
      prompt: 'prompt',
      schema: { type: 'object' },
    });

  return { run, captured };
}

const MIX = '{"mix":[{"breed":"shiba","ratio":100}]}';

test('json_schema 모드는 스키마를 서버에 강제하고 temperature를 보내지 않는다', async () => {
  const { run, captured } = stubClient(MIX);

  assert.deepEqual(await run(), { mix: [{ breed: 'shiba', ratio: 100 }] });
  assert.equal(captured.url, 'https://example.test/v1/chat/completions');
  assert.equal('temperature' in captured.body, false);
  assert.deepEqual(captured.body.response_format, {
    type: 'json_schema',
    json_schema: { name: 'breed_mix', strict: true, schema: { type: 'object' } },
  });
});

test('json_schema 모드는 프롬프트에 스키마를 덧붙이지 않는다', async () => {
  const { run, captured } = stubClient(MIX);
  await run();

  const messages = captured.body.messages as { role: string; content: unknown }[];
  assert.equal(messages[0].content, 'prompt');
});

test('json_object 모드는 형식만 강제하고 스키마는 프롬프트로 넘긴다', async () => {
  const { run, captured } = stubClient(MIX, { structuredOutput: 'json_object' });
  await run();

  assert.deepEqual(captured.body.response_format, { type: 'json_object' });
  const messages = captured.body.messages as { role: string; content: string }[];
  assert.match(messages[0].content, /^prompt\n/);
  assert.match(messages[0].content, /JSON Schema/);
  assert.match(messages[0].content, /\{"type":"object"\}/);
});

test('prompt 모드는 response_format을 아예 보내지 않는다', async () => {
  const { run, captured } = stubClient(MIX, { structuredOutput: 'prompt' });
  await run();

  assert.equal('response_format' in captured.body, false);
  const messages = captured.body.messages as { role: string; content: string }[];
  assert.match(messages[0].content, /JSON Schema/);
});

test('extraBody는 요청 본문에 그대로 합쳐진다', async () => {
  const { run, captured } = stubClient(MIX, {
    structuredOutput: 'prompt',
    extraBody: { guided_json: { type: 'object' } },
  });
  await run();

  assert.deepEqual(captured.body.guided_json, { type: 'object' });
});

test('코드 블록으로 감싸거나 설명을 붙여도 JSON을 긁어낸다', async () => {
  const wrapped = `사진을 살펴봤습니다.\n\`\`\`json\n${MIX}\n\`\`\`\n이상입니다.`;
  const { run } = stubClient(wrapped, { structuredOutput: 'prompt' });

  assert.deepEqual(await run(), { mix: [{ breed: 'shiba', ratio: 100 }] });
});

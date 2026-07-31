/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { ChatCompletionsClient, type ChatMessage } from '@/lib/llm/client';

type Captured = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

function stub(reply: unknown, status = 200) {
  const captured: Captured = { url: '', headers: {}, body: {} };
  const fetchImpl: typeof fetch = async (input, init) => {
    captured.url = String(input);
    captured.headers = (init?.headers ?? {}) as Record<string, string>;
    captured.body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(typeof reply === 'string' ? reply : JSON.stringify(reply), { status });
  };
  const client = new ChatCompletionsClient({
    apiKey: 'test-key',
    baseUrl: 'https://example.test/v1/',
    fetchImpl,
  });
  return { client, captured };
}

const MESSAGES: ChatMessage[] = [{ role: 'user', content: '안녕' }];

test('끝 슬래시를 정리하고 인증 헤더를 붙인다', async () => {
  const { client, captured } = stub({ choices: [{ message: { content: '응답' } }] });
  await client.complete({ model: 'm', messages: MESSAGES });

  assert.equal(captured.url, 'https://example.test/v1/chat/completions');
  assert.equal(captured.headers.Authorization, 'Bearer test-key');
});

test('maxTokens는 넘길 때만 실리고 temperature는 절대 실리지 않는다', async () => {
  const { client, captured } = stub({ choices: [{ message: { content: '응답' } }] });

  await client.complete({ model: 'm', messages: MESSAGES });
  assert.equal('max_tokens' in captured.body, false);
  assert.equal('temperature' in captured.body, false);

  await client.complete({ model: 'm', messages: MESSAGES, maxTokens: 200 });
  assert.equal(captured.body.max_tokens, 200);
});

test('content가 조각 배열로 와도 텍스트만 이어 붙인다', async () => {
  const { client } = stub({
    choices: [
      {
        message: {
          content: [
            { type: 'text', text: '앞' },
            { type: 'image_url' },
            { type: 'text', text: '뒤' },
          ],
        },
      },
    ],
  });

  assert.equal(await client.complete({ model: 'm', messages: MESSAGES }), '앞뒤');
});

test('HTTP 오류는 상태 코드와 본문 일부를 담아 던진다', async () => {
  const { client } = stub('서버가 거부했습니다', 503);
  await assert.rejects(() => client.complete({ model: 'm', messages: MESSAGES }), /503.*거부/);
});

test('텍스트가 없거나 비어 있으면 던진다', async () => {
  const empty = stub({ choices: [{ message: { content: '   ' } }] });
  await assert.rejects(
    () => empty.client.complete({ model: 'm', messages: MESSAGES }),
    /텍스트가 없습니다/,
  );

  const missing = stub({ choices: [] });
  await assert.rejects(
    () => missing.client.complete({ model: 'm', messages: MESSAGES }),
    /텍스트가 없습니다/,
  );
});

/// <reference types="node" />

import assert from 'node:assert/strict';
import test from 'node:test';

import { bytesToBase64, mimeTypeOf } from '@/lib/image';

/**
 * base64 인코더는 직접 짠 것이라(`Buffer`는 node 전용, `btoa`는 RN에 있다는
 * 보장이 없음) node의 Buffer와 대조해서 검증합니다.
 * 길이 % 3 에 따라 패딩 규칙이 갈리므로 그 경계를 특히 확인합니다.
 */
test('base64 인코딩이 node Buffer 와 일치한다 (패딩 경계 포함)', () => {
  const cases: number[][] = [
    [], // 빈 입력
    [0], // 1바이트 → '=='
    [0, 255], // 2바이트 → '='
    [0, 255, 128], // 3바이트 → 패딩 없음
    [1, 2, 3, 4], // 4바이트
    [1, 2, 3, 4, 5], // 5바이트
    [255, 255, 255, 255, 255, 255],
    [0, 0, 0, 0],
  ];

  for (const bytes of cases) {
    const input = Uint8Array.from(bytes);
    assert.equal(
      bytesToBase64(input),
      Buffer.from(input).toString('base64'),
      `길이 ${bytes.length} 에서 어긋남`,
    );
  }
});

test('0~255 전 구간과 긴 입력에서도 일치한다', () => {
  const all = Uint8Array.from({ length: 256 }, (_, i) => i);
  assert.equal(bytesToBase64(all), Buffer.from(all).toString('base64'));

  // JPEG 헤더처럼 생긴 바이트로 길이를 하나씩 늘려가며 전부 대조
  const long = Uint8Array.from({ length: 1000 }, (_, i) => (i * 37 + 11) % 256);
  for (let n = 0; n <= 20; n++) {
    const slice = long.slice(0, n);
    assert.equal(bytesToBase64(slice), Buffer.from(slice).toString('base64'), `길이 ${n}`);
  }
  assert.equal(bytesToBase64(long), Buffer.from(long).toString('base64'));
});

test('확장자에서 MIME 을 읽는다', () => {
  assert.equal(mimeTypeOf('file:///tmp/a.jpg'), 'image/jpeg');
  assert.equal(mimeTypeOf('file:///tmp/a.JPEG'), 'image/jpeg');
  assert.equal(mimeTypeOf('file:///tmp/a.png'), 'image/png');
  assert.equal(mimeTypeOf('file:///tmp/a.webp'), 'image/webp');
});

test('data URI 는 앞부분에 적힌 타입을 쓴다', () => {
  assert.equal(mimeTypeOf('data:image/png;base64,iVBORw0KGgo='), 'image/png');
  assert.equal(mimeTypeOf('data:image/webp;base64,UklGRg=='), 'image/webp');
});

test('확장자를 알 수 없으면 jpeg 로 본다', () => {
  // 웹의 blob URI 나 쿼리스트링이 붙은 경우. 피커 기본 출력이 jpeg 입니다.
  assert.equal(mimeTypeOf('blob:http://localhost:8081/abc-123'), 'image/jpeg');
  assert.equal(mimeTypeOf('file:///tmp/photo'), 'image/jpeg');
  assert.equal(mimeTypeOf('file:///tmp/a.jpg?t=1700000000'), 'image/jpeg');
  assert.equal(mimeTypeOf('file:///tmp/a.heic'), 'image/jpeg');
});

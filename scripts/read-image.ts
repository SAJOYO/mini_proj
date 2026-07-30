/// <reference types="node" />

/**
 * 사진 파일을 파이프라인 입력으로 읽기 (스크립트 전용).
 *
 * 확장자 → MIME 매핑을 스크립트마다 복사하지 않으려고 한 곳에 둡니다.
 * 예전에 이 매핑을 빠뜨린 스크립트가 png 를 jpeg 라고 알리는 버그가
 * 있었습니다 — 여기만 쓰면 그런 일이 없습니다.
 *
 * 앱은 이 파일을 쓰지 않습니다. 이미지 피커가 MIME 을 직접 줍니다.
 */

import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

import type { VisionImageInput } from '@/lib/breed-inference/types';

const MIME_BY_EXTENSION: Record<string, VisionImageInput['mimeType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/** 경로의 사진을 읽어 `VisionImageInput`으로. 미지원 형식이면 던집니다. */
export async function readImageInput(path: string): Promise<VisionImageInput> {
  const imagePath = resolve(path);
  const mimeType = MIME_BY_EXTENSION[extname(imagePath).toLowerCase()];
  if (!mimeType) {
    throw new Error('지원하는 이미지 형식은 jpg, jpeg, png, webp입니다.');
  }

  const image = await readFile(imagePath);
  return { mimeType, base64: image.toString('base64') };
}

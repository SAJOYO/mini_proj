import type { VisionImageInput } from '@/lib/breed-inference/types';

/**
 * 앱에서 고른 사진을 판정 입력(`VisionImageInput`)으로 바꿉니다.
 *
 * 스크립트용 `scripts/read-image.ts`와 같은 일을 하지만, 그쪽은 node의 `fs`를
 * 쓰기 때문에 앱에서 못 씁니다. 확장자 → MIME 매핑만 개념이 같습니다.
 *
 * ── 왜 두 경로인가 ────────────────────────────────────
 * 이미지 피커에 `base64: true`를 주면 고르는 즉시 base64가 딸려옵니다.
 * 그게 있으면 파일을 다시 읽을 이유가 없습니다.
 *
 * 그런데 앱을 껐다 켜면 저장소에 URI만 남아 있고 base64는 없습니다.
 * (base64는 저장하지 않습니다 — 사진 한 장이 수 MB라 AsyncStorage 한도를
 *  넘길 수 있습니다.) 그 경우에는 URI로 파일을 다시 읽습니다.
 */

const MIME_BY_EXTENSION: Record<string, VisionImageInput['mimeType']> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * URI에서 MIME 타입을 뽑습니다.
 *
 * 웹에서는 `data:image/png;base64,...` 나 `blob:` 형태라 확장자가 없습니다.
 * data URI 는 앞부분에 타입이 적혀 있으니 그걸 쓰고, 알 수 없으면 jpeg 로 봅니다
 * (피커가 quality 옵션으로 내보내는 기본 형식이 jpeg 입니다).
 */
export function mimeTypeOf(uri: string): VisionImageInput['mimeType'] {
  const dataUri = uri.match(/^data:(image\/(?:jpeg|png|webp))[;,]/i);
  if (dataUri) return dataUri[1].toLowerCase() as VisionImageInput['mimeType'];

  // 쿼리스트링(?t=123)이 붙는 경우가 있어서 잘라냅니다.
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  return (extension && MIME_BY_EXTENSION[extension]) || 'image/jpeg';
}

/**
 * 이 URI 가 앱을 새로 띄운 뒤에도 살아 있는가.
 *
 * 웹에서 이미지 피커는 `blob:` URI 를 줍니다. 이건 그 문서(탭)에만 존재해서
 * 새로고침하거나 탭을 닫으면 **문자열만 남고 가리키는 데이터가 사라집니다.**
 * 그런데 저장소에는 문자열이 그대로 남아 있어서, 복원하면 "사진이 있다"고
 * 착각하게 됩니다.
 *
 * 실제로 그래서 두 가지가 생겼습니다.
 *   1. 콘솔에 net::ERR_FILE_NOT_FOUND (죽은 blob 을 <Image> 가 읽으려다)
 *   2. 화면은 사진이 있는 것처럼 보이는데 [분석하기]를 누르면 실패
 *      (피커가 준 base64 는 메모리에만 있어서 새로고침하면 없습니다)
 *
 * 네이티브에서는 `file://` 경로라 그대로 살아 있습니다. 그래서 형태로 가릅니다.
 */
export function survivesReload(uri: string | null | undefined): boolean {
  if (!uri) return false;
  return !uri.startsWith('blob:');
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * 바이트 배열을 base64 문자열로.
 *
 * `Buffer`는 node 전용이고 `btoa`는 RN에 있다는 보장이 없어서 직접 씁니다.
 * 3바이트를 4글자로 바꾸고, 남는 1~2바이트는 `=`로 채우는 표준 방식입니다.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      BASE64_ALPHABET[n & 63];
  }

  const remaining = bytes.length - i;
  if (remaining === 1) {
    const n = bytes[i] << 16;
    out += BASE64_ALPHABET[(n >> 18) & 63] + BASE64_ALPHABET[(n >> 12) & 63] + '==';
  } else if (remaining === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out +=
      BASE64_ALPHABET[(n >> 18) & 63] +
      BASE64_ALPHABET[(n >> 12) & 63] +
      BASE64_ALPHABET[(n >> 6) & 63] +
      '=';
  }

  return out;
}

/**
 * 사진을 판정 입력으로.
 *
 * @param uri     피커가 준 로컬 URI
 * @param base64  피커가 같이 준 base64. 있으면 파일을 다시 읽지 않습니다.
 *
 * `expo-file-system`을 함수 안에서 동적으로 불러옵니다. 파일 맨 위에서 import 하면
 * react-native 소스까지 딸려와서 `npm run test:persona`(tsx/esbuild)가 파싱에
 * 실패합니다. 위쪽 순수 함수들만이라도 테스트할 수 있게 이렇게 미뤄뒀습니다.
 * 앱에서는 Metro 가 처리하므로 동작에 차이가 없습니다.
 */
export async function toVisionImage(
  uri: string,
  base64?: string | null,
): Promise<VisionImageInput> {
  const mimeType = mimeTypeOf(uri);
  if (base64) return { mimeType, base64 };

  const { File } = await import('expo-file-system');
  const buffer = await new File(uri).arrayBuffer();
  return { mimeType, base64: bytesToBase64(new Uint8Array(buffer)) };
}

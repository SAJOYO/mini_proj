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

  // 열쇠면 실제 주소로 바꿔서 읽습니다 (웹에서 새로고침한 뒤가 이 경우입니다).
  const readable = (await resolvePhoto(uri)) ?? uri;

  // 파일이 아닌 주소(blob:·data:)는 expo-file-system이 읽지 못합니다.
  const buffer = readable.startsWith('file://')
    ? await new (await import('expo-file-system')).File(readable).arrayBuffer()
    : await (await fetch(readable)).arrayBuffer();

  return { mimeType, base64: bytesToBase64(new Uint8Array(buffer)) };
}

/**
 * 웹에서 원본 사진을 담아두는 곳.
 *
 * ## 왜 저장소(localStorage)가 아니라 IndexedDB인가
 *
 * 웹에서 AsyncStorage는 localStorage입니다. **문자열만** 담기고 한도가 5MB인데,
 * 사진을 문자열(data: URL)로 바꾸면 용량이 33% 늘고 로그인·캐릭터·판정 결과가
 * 전부 같은 5MB를 나눠 씁니다. 사진 하나가 한도를 먹으면 **캐릭터 저장이 실패해
 * 키우던 기록이 안 남습니다.**
 *
 * IndexedDB는 이진 데이터를 그대로 담고 한도가 수백 MB~GB라 이런 걱정이 없습니다.
 * 원본을 줄이지 않아도 됩니다.
 *
 * ## 대신 주소가 아니라 열쇠를 저장합니다
 *
 * IndexedDB에 든 사진은 주소로 가리킬 수 없습니다. 그래서 저장소에는 PHOTO_KEY
 * 라는 **열쇠 문자열**만 넣고, 실제로 쓸 때 resolvePhoto()로 꺼냅니다.
 * 꺼낸 주소(blob:)는 그 탭에서만 유효하므로 저장하면 안 됩니다.
 */
const PHOTO_DB = 'pet-source-photo';
const PHOTO_STORE = 'photo';

/** 저장소에 남는 값. 이게 보이면 "사진은 IndexedDB에 있다"는 뜻입니다. */
export const PHOTO_KEY = 'photo:source';

/** 이번 탭에서 만들어 둔 주소. 꺼낼 때마다 새로 만들지 않게 들고 있습니다. */
let resolvedUrl: string | null = null;

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PHOTO_DB, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PHOTO_STORE)) {
        request.result.createObjectStore(PHOTO_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withPhotoStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null;

  try {
    const db = await openPhotoDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(PHOTO_STORE, mode);
      const request = run(tx.objectStore(PHOTO_STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/** 웹에서 고른 사진을 IndexedDB에 넣습니다. 성공하면 열쇠를, 실패하면 null. */
async function storePhotoBlob(blobUrl: string): Promise<string | null> {
  try {
    const blob = await (await fetch(blobUrl)).blob();
    const saved = await withPhotoStore('readwrite', (store) => store.put(blob, PHOTO_STORE));
    if (saved === null) return null;

    // 새 사진으로 바뀌었으니 들고 있던 주소는 버립니다.
    if (resolvedUrl) URL.revokeObjectURL(resolvedUrl);
    resolvedUrl = blobUrl;

    return PHOTO_KEY;
  } catch {
    return null;
  }
}

/**
 * 저장된 값을 **지금 쓸 수 있는 주소로** 바꿉니다.
 *
 * 열쇠(PHOTO_KEY)면 IndexedDB에서 꺼내 주소를 만들고, 그 외(file:·data: 등)는
 * 그대로 돌려줍니다. 사진을 화면에 띄우거나 서버에 올리기 직전에 부르세요.
 *
 * 꺼내지 못하면 null입니다 — 보관된 사진이 없거나 브라우저가 지운 경우입니다.
 */
export async function resolvePhoto(uri: string | null | undefined): Promise<string | null> {
  if (!uri) return null;
  if (uri !== PHOTO_KEY) return uri;
  if (resolvedUrl) return resolvedUrl;

  const blob = await withPhotoStore<Blob>('readonly', (store) => store.get(PHOTO_STORE));
  if (!(blob instanceof Blob)) return null;

  resolvedUrl = URL.createObjectURL(blob);
  return resolvedUrl;
}

/**
 * 고른 사진을 **지워지지 않는 곳으로 옮깁니다.** 옮긴 뒤의 주소를 돌려줍니다.
 *
 * ## 왜 필요한가
 *
 * 이미지 피커는 사진을 앱 **캐시** 폴더에 둡니다. 안드로이드는 저장 공간이
 * 부족하면 캐시를 언제든 비우기 때문에, 주소만 저장소에 남고 파일은 사라집니다.
 * 실제로 폰에서 이렇게 났습니다.
 *
 *   FileNotFoundException: .../cache/.../ImagePicker/8df2....jpeg
 *   ENOENT (No such file or directory)
 *
 * 그러면 올린 사진이 빈칸으로 보이고, 사진 생성도 판정도 할 수 없습니다.
 * `survivesReload`는 이걸 못 걸러냅니다 — blob:이 아니라 file: 이라서
 * "살아 있다"고 보거든요. 경로가 캐시인지 아닌지는 구분하지 않습니다.
 *
 * ## 웹은 옮기는 게 아니라 IndexedDB에 넣습니다
 *
 * 웹의 blob: 은 파일이 아니라 **탭 메모리**에 있는 것이라 옮길 데가 없습니다.
 * 사진을 IndexedDB에 넣고 **열쇠(PHOTO_KEY)를 돌려줍니다.** 쓸 때는
 * resolvePhoto()로 꺼냅니다.
 */
export async function persistPhoto(uri: string): Promise<string> {
  if (uri.startsWith('blob:')) return (await storePhotoBlob(uri)) ?? uri;
  if (!uri.startsWith('file://')) return uri;

  try {
    const { Directory, File, Paths } = await import('expo-file-system');

    const folder = new Directory(Paths.document, 'photos');
    if (!folder.exists) folder.create({ intermediates: true, idempotent: true });

    // 한 번에 한 장만 쓰므로 앞의 사진은 지웁니다. 안 그러면 고를 때마다 쌓입니다.
    for (const entry of folder.list()) {
      try {
        entry.delete();
      } catch {
        // 지우지 못해도 새 사진을 저장하는 데는 지장이 없습니다.
      }
    }

    const source = new File(uri);
    // extension은 점을 포함해서 옵니다(".jpeg"). 그대로 이어붙이면 "source..jpeg"가 됩니다.
    const extension = source.extension?.replace(/^\./, '') || 'jpg';
    // 이름에 시각을 넣어 **사진마다 주소가 달라지게** 합니다.
    //
    // 예전에는 늘 `source.jpg` 였습니다. 파일 내용은 바뀌는데 주소가 그대로라,
    // 주소를 캐시 열쇠로 쓰는 <Image> 가 **앞의 사진을 계속 그렸습니다.**
    // 사진을 다시 고르거나 다시 키운 뒤에 이전 사진이 나오던 게 이것 때문입니다.
    // (웹은 blob: 주소가 매번 새로 생겨서 이 문제가 없었습니다.)
    const target = new File(folder, `source-${Date.now()}.${extension}`);
    source.copy(target);

    return target.uri;
  } catch {
    // 옮기지 못하면 원래 주소를 그대로 씁니다. 당장은 동작하고, 캐시가
    // 비워질 때까지는 문제가 없습니다.
    return uri;
  }
}

/**
 * 이 사진을 **지금 읽을 수 있는가.**
 *
 * `survivesReload`가 "새로고침을 견디는 형태인가"를 형태만 보고 판단하는 것과
 * 달리, 실제로 파일이 있는지 확인합니다. 캐시가 비워져 사라진 사진을 걸러내는
 * 것이 목적이라, 저장소에서 복원할 때 씁니다.
 *
 * 웹의 blob: 은 여기서 판단하지 않습니다(동기적으로 확인할 방법이 없습니다).
 * 형태 검사는 survivesReload가 이미 하고 있으니 그쪽을 쓰세요.
 */
export async function photoFileExists(uri: string): Promise<boolean> {
  if (!uri.startsWith('file://')) return true;

  try {
    const { File } = await import('expo-file-system');
    return new File(uri).exists;
  } catch {
    return false;
  }
}

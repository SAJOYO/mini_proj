/**
 * 만든 사진 보관함.
 *
 * 화면이 없습니다 — 사진 한 장을 넣고 빼는 것까지가 전부입니다.
 * (lib/storage.ts가 로그인·pet 상태에 하는 역할을 사진에 대해 합니다)
 *
 * ## 왜 AsyncStorage를 안 쓰는가
 *
 * 웹에서 AsyncStorage는 사실 localStorage입니다. **문자열만** 담기고 한도가
 * **5MB 전체**라, 사진을 base64로 바꿔 넣으면(그러면 용량이 33% 더 붙습니다)
 * 몇 장 만에 터집니다. 로그인 정보에는 맞는 그릇이지만 사진에는 아닙니다.
 *
 * IndexedDB는 브라우저에 이미 들어있고, Blob을 그대로 담고, 한도가 보통
 * 수백 MB~GB입니다. 설치할 것도 띄울 것도 없어서 "DB를 만든다"에 해당하지
 * 않습니다.
 *
 * ## 장수 제한이 없습니다
 *
 * 한 단계에 한 장이 아니라 **원하는 만큼** 만들 수 있습니다. 그래서 키를
 * "품종:단계"로 두지 않습니다 — 그러면 같은 단계에서 다시 만들 때 앞의
 * 사진을 덮어쓰니까요. 사진마다 고유 id를 주고, 어느 단계에서 찍은
 * 것인지는 목록(PhotoEntry)이 따로 기억합니다.
 *
 * 이미지(무겁다)와 목록(가볍다)을 나눠 둔 것도 같은 이유입니다. 목록은
 * AsyncStorage에 있어서 앨범 화면이 이미지를 다 읽지 않고도 그릴 수 있습니다.
 *
 * ## 네이티브는 파일로 둡니다
 *
 * IndexedDB는 브라우저에만 있습니다. 예전에는 그래서 네이티브에서 보관이
 * 통째로 꺼져 있었고, 폰으로 시연하면 사진을 만들어도 **앨범이 비어
 * 있었습니다.**
 *
 * 지금은 같은 일을 expo-file-system 으로 합니다 — 사진 한 장이 문서 폴더의
 * 파일 한 개(`album/<id>.png`)입니다. 밖에서 보면 웹과 똑같이 동작합니다:
 * 넣고, 주소를 받아 화면에 띄우고, 지웁니다.
 *
 * 갈리는 지점은 이 파일 안에 다 모여 있습니다(NATIVE 분기). 화면 쪽에서는
 * 어느 쪽인지 몰라도 됩니다.
 *
 * ## 왜 Blob 이 아니라 주소를 돌려주는가
 *
 * 화면에 사진을 띄우는 데 필요한 건 `<Image>` 에 넣을 **주소**입니다.
 * 웹에서는 IndexedDB 의 Blob 으로 blob: 주소를 만들고, 네이티브에서는 file:
 * 경로가 이미 주소입니다. 반대로 Blob 을 공통 화폐로 삼으면, 네이티브에서
 * 파일 바이트를 Blob 으로 되돌리는 변환이 한 번 더 필요합니다.
 * (내려받기는 웹 전용이라 그쪽만 loadPhoto 로 Blob 을 씁니다)
 */

import { Platform } from 'react-native';

import { loadAlbumEntries, saveAlbumEntries, type PhotoEntry } from '@/lib/storage';

export type { PhotoEntry };

const DB_NAME = 'pet-album';
const DB_VERSION = 1;
const STORE = 'photos';

/** 폰인가. 여기서만 파일 경로를 씁니다. */
const NATIVE = Platform.OS !== 'web';

/** 앱 문서 폴더 안에서 사진이 사는 곳. */
const ALBUM_DIR = 'album';

/** 이 환경에서 보관함을 쓸 수 있는지. */
export function isSupported(): boolean {
  return NATIVE || typeof indexedDB !== 'undefined';
}

/**
 * 네이티브에서 사진 한 장에 해당하는 파일.
 *
 * `expo-file-system` 을 함수 안에서 불러옵니다 — 파일 맨 위에서 import 하면
 * react-native 소스까지 딸려와서 tsx 로 도는 테스트가 파싱에 실패합니다
 * (lib/image.ts 에도 같은 사정이 적혀 있습니다).
 */
async function photoFile(id: string) {
  const { Directory, File, Paths } = await import('expo-file-system');

  const folder = new Directory(Paths.document, ALBUM_DIR);
  if (!folder.exists) folder.create({ intermediates: true, idempotent: true });

  return { folder, file: new File(folder, `${id}.png`), File };
}

/**
 * 사진 한 장의 id.
 *
 * 시각을 앞에 두어 문자열 순서가 곧 만든 순서가 됩니다. 뒤의 임의 문자는
 * 같은 밀리초에 두 장이 들어오는 경우를 막습니다.
 */
function newPhotoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 처음 열릴 때 한 번만 불립니다. 여기서 store를 안 만들면 이후 트랜잭션이
    // 전부 실패합니다.
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * IndexedDB의 콜백을 async/await로 바꿔주는 얇은 껍데기.
 *
 * 실패해도 던지지 않고 null을 돌려줍니다. 사진 보관은 **부가 기능**이라,
 * 저장이 안 된다고 사진 만들기 자체가 실패하면 안 됩니다.
 * (사파리 시크릿 모드처럼 IndexedDB가 막힌 환경이 실제로 있습니다)
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  if (!isSupported()) return null;

  try {
    const db = await openDb();
    return await new Promise<T | null>((resolve) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      // 트랜잭션 자체가 죽는 경우(용량 초과 등)도 여기서 걸립니다.
      tx.onabort = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

/**
 * 보관된 사진의 바이트. **웹 전용입니다** — 내려받기에만 씁니다.
 *
 * 화면에 띄우는 것이 목적이면 photoUri() 를 쓰세요.
 */
export async function loadPhoto(id: string): Promise<Blob | null> {
  const blob = await withStore<Blob>('readonly', (store) => store.get(id));
  // 값이 없을 때 IndexedDB는 undefined를 돌려줍니다.
  return blob instanceof Blob ? blob : null;
}

/**
 * 보관된 사진을 **지금 화면에 띄울 수 있는 주소로** 바꿉니다. 없으면 null.
 *
 * 웹에서 돌아온 blob: 주소는 다 쓰고 나면 revokePhotoUri() 로 정리해 주세요.
 * 안 그러면 사진 한 장(1MB 넘습니다)이 탭이 닫힐 때까지 메모리에 남습니다.
 */
export async function photoUri(id: string): Promise<string | null> {
  if (NATIVE) {
    try {
      const { file } = await photoFile(id);
      return file.exists ? file.uri : null;
    } catch {
      return null;
    }
  }

  const blob = await loadPhoto(id);
  return blob ? URL.createObjectURL(blob) : null;
}

/**
 * photoUri() 가 만든 주소를 정리합니다.
 *
 * 네이티브의 file: 경로는 만들어낸 것이 아니라 그냥 파일 위치라 정리할 것이
 * 없습니다. 그래서 blob: 일 때만 지웁니다 — 화면 쪽에서 플랫폼을 따지지
 * 않아도 되도록 그 판단을 여기서 합니다.
 */
export function revokePhotoUri(uri: string): void {
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}

/**
 * 만들어진 사진을 주소에서 받아 앨범에 넣습니다.
 *
 * 목록 항목은 어느 쪽이든 AsyncStorage에 들어가고, 이미지만 갈립니다 —
 * 웹은 IndexedDB, 네이티브는 문서 폴더의 파일입니다.
 *
 * **이미지 저장이 실패하면 목록에 넣지 않습니다** — 목록에만 남으면 앨범에
 * 빈 칸이 생기고, 그게 왜 비었는지 알 방법이 없습니다.
 *
 * 돌아온 값은 새로 만들어진 항목입니다. 실패하면 null.
 */
export async function addPhotoFromUrl(
  url: string,
  meta: Omit<PhotoEntry, 'id' | 'createdAt'>,
): Promise<PhotoEntry | null> {
  const entry: PhotoEntry = { ...meta, id: newPhotoId(), createdAt: Date.now() };

  if (NATIVE) {
    try {
      const { folder, File } = await photoFile(entry.id);
      // 파일로 곧장 받습니다. 바이트를 앱 메모리에 들였다 다시 쓸 이유가 없습니다.
      await File.downloadFileAsync(url, new File(folder, `${entry.id}.png`));
    } catch {
      return null;
    }
  } else {
    const blob = await fetchBlob(url);
    if (!blob) return null;

    const stored = await withStore('readwrite', (store) => store.put(blob, entry.id));
    if (stored === null) return null;
  }

  await saveAlbumEntries([...(await loadAlbumEntries()), entry]);
  return entry;
}

/** 앨범에 있는 사진 목록. 최근에 만든 것이 앞에 옵니다. */
export async function listPhotos(): Promise<PhotoEntry[]> {
  return (await loadAlbumEntries()).sort((a, b) => b.createdAt - a.createdAt);
}

/** 그 단계에서 가장 최근에 만든 사진. 없으면 null. */
export async function latestOfStage(stage: string): Promise<PhotoEntry | null> {
  return (await listPhotos()).find((entry) => entry.stage === stage) ?? null;
}

/** 사진 한 장을 지웁니다. 이미지와 목록 항목을 함께 지웁니다. */
export async function removePhoto(id: string): Promise<void> {
  if (NATIVE) {
    try {
      const { file } = await photoFile(id);
      if (file.exists) file.delete();
    } catch {
      // 파일을 못 지워도 목록에서는 빼줍니다. 남겨두면 앨범에 빈 칸이 생깁니다.
    }
  } else {
    await withStore('readwrite', (store) => store.delete(id));
  }

  await saveAlbumEntries((await loadAlbumEntries()).filter((entry) => entry.id !== id));
}

/**
 * ComfyUI가 준 주소에서 사진을 받아 옵니다.
 *
 * ⚠️ 이 fetch에는 **CORS가 필요합니다.** `<Image>`로 보여주기만 할 때는
 * 필요 없지만, 바이트를 읽으려면 서버가 허용해줘야 합니다.
 * ComfyUI를 `--enable-cors-header "*"` 없이 띄우면 화면에는 보이는데
 * 보관만 조용히 실패합니다 — 원인을 찾기 어려운 종류라 여기 적어둡니다.
 */
export async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.blob() : null;
  } catch {
    return null;
  }
}

/** 브라우저에서 파일로 내려받을 수 있는 환경인지. */
export function canDownload(): boolean {
  return typeof document !== 'undefined' && typeof URL.createObjectURL === 'function';
}

/**
 * 사진을 기기에 내려받은 결과.
 *
 * 실패를 한 덩어리로 뭉치지 않는 건, 사용자가 할 수 있는 일이 다르기
 * 때문입니다 — 권한은 설정에서 켜면 되고, 나머지는 다시 시도해 보는 수밖에
 * 없습니다. 화면이 그 차이를 문구로 알려줄 수 있어야 합니다.
 */
export type SaveResult = 'saved' | 'denied' | 'failed';

/**
 * 내려받기에 성공했을 때 알려줄 말. **어디에 저장됐는지**를 말해줍니다.
 *
 * 폰에서는 사진이 갤러리로 들어가서 화면에는 아무 변화가 없습니다. "저장됨"
 * 세 글자만 띄우면 어디를 열어봐야 할지 모릅니다.
 */
export const SAVE_SUCCESS_MESSAGE = NATIVE
  ? '기기 갤러리에 저장했어요. 사진 앱에서 볼 수 있어요.'
  : '파일로 내려받았어요.';

/** 권한을 거절했을 때. 앱이 할 수 있는 일이 없어서 갈 곳을 알려줍니다. */
export const SAVE_DENIED_MESSAGE = '설정에서 사진 저장 권한을 허용해 주세요.';

/**
 * 사진을 **기기에** 내려받습니다. 앱을 지워도 남는 곳으로 나가는 것입니다.
 *
 * 보관함과 역할이 다릅니다. 보관함은 앱 안에서 다시 보기 위한 것이고 브라우저나
 * OS가 지울 수도 있지만, 내려받은 사진은 사용자 것이 됩니다. 그래서 둘 다 둡니다.
 *
 * 웹은 파일로 떨어지고, 폰은 **기기 갤러리**에 들어갑니다. 폰에서 "파일"로
 * 떨어뜨려 봐야 찾아 들어가기 번거롭고, 만든 사진을 자랑하려면 결국 갤러리에
 * 있어야 합니다. 대신 저장 권한을 한 번 물어봅니다.
 */
export async function savePhotoToDevice(entry: PhotoEntry): Promise<SaveResult> {
  const filename = `${entry.breed}-${entry.stage}.png`;

  if (!NATIVE) {
    const blob = await loadPhoto(entry.id);
    if (!blob || !canDownload()) return 'failed';

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    // 클릭 직후 바로 지우면 다운로드가 시작되기 전에 무효가 되는 브라우저가
    // 있어서 한 박자 늦춥니다.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'saved';
  }

  try {
    const { file } = await photoFile(entry.id);
    if (!file.exists) return 'failed';

    const MediaLibrary = await import('expo-media-library');

    // writeOnly 입니다 — 우리는 넣기만 하지 남의 사진을 읽지 않습니다.
    // 안드로이드에서 물어보는 권한의 범위가 달라집니다.
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return 'denied';

    await MediaLibrary.Asset.create(file.uri);
    return 'saved';
  } catch {
    return 'failed';
  }
}

/**
 * 사진을 파일로 내려받습니다.
 *
 * 보관함(IndexedDB)과 역할이 다릅니다. 보관함은 앱 안에서 다시 보기 위한
 * 것이고 브라우저가 지울 수도 있지만(iOS 사파리는 7일간 방문이 없으면
 * 지웁니다), 내려받은 파일은 사용자 것이 됩니다. 그래서 둘 다 둡니다.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (!canDownload()) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // 클릭 직후 바로 지우면 다운로드가 시작되기 전에 무효가 되는 브라우저가
  // 있어서 한 박자 늦춥니다.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

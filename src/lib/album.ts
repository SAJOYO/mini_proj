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
 * ## 네이티브에서는 아무 일도 하지 않습니다
 *
 * 이 프로젝트는 웹까지가 범위입니다(README 참고). IndexedDB는 브라우저에만
 * 있으므로, 네이티브에서는 isSupported()가 false가 되고 저장/조회가 조용히
 * 빈 값을 돌려줍니다. 사진은 여전히 보입니다 — 서버 URL을 그대로 쓰니까요.
 * 다만 서버를 끄면 사라집니다.
 */

const DB_NAME = 'pet-album';
const DB_VERSION = 1;
const STORE = 'photos';

/** 이 환경에서 보관함을 쓸 수 있는지. 네이티브에서는 false입니다. */
export function isSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * 사진 한 장을 가리키는 키.
 *
 * 품종과 단계로 만듭니다 — 같은 단계 사진을 다시 만들면 덮어씁니다.
 * (4단계 앨범을 만든다면 이 키 네 개를 훑으면 됩니다)
 */
export function photoKey(breed: string, stage: string): string {
  return `${breed}:${stage}`;
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

/** 사진을 보관합니다. 실패해도 조용히 넘어갑니다(돌아온 값이 성공 여부). */
export async function savePhoto(key: string, blob: Blob): Promise<boolean> {
  const result = await withStore('readwrite', (store) => store.put(blob, key));
  return result !== null;
}

/** 보관된 사진. 없으면 null. */
export async function loadPhoto(key: string): Promise<Blob | null> {
  const blob = await withStore<Blob>('readonly', (store) => store.get(key));
  // 값이 없을 때 IndexedDB는 undefined를 돌려줍니다.
  return blob instanceof Blob ? blob : null;
}

export async function removePhoto(key: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(key));
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

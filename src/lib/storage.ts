import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * 로컬 저장소 얇은 래퍼.
 *
 * 이 프로젝트는 서버가 없어서 로그인 정보/사진 경로를 전부 기기 안에만 둡니다.
 * 나중에 서버가 생기면 이 파일의 함수 구현만 바꾸면 되도록, 화면 코드에서는
 * AsyncStorage를 직접 부르지 말고 항상 여기를 거쳐 주세요.
 *
 * 키를 새로 추가할 땐 Keys에 등록하고 접두사(`@pet/`)를 유지하세요.
 */

const Keys = {
  user: '@pet/user',
  photoUri: '@pet/photoUri',
  swipeHintSeen: '@pet/swipeHintSeen',
  analysis: '@pet/analysis',
  pet: '@pet/pet',
  photoJob: '@pet/photoJob',
  album: '@pet/album',
  deviceId: '@pet/deviceId',
  petName: '@pet/petName',
} as const;

/** 로컬에만 존재하는 사용자. 비밀번호는 저장하지 않습니다. */
export type User = {
  nickname: string;
  /** ISO 8601 문자열 */
  createdAt: string;
};

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    // 저장된 값이 깨졌으면 없는 것으로 취급 (앱이 죽는 것보단 낫습니다)
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadUser(): Promise<User | null> {
  return readJson<User>(Keys.user);
}

export async function saveUser(user: User): Promise<void> {
  await writeJson(Keys.user, user);
}

export async function clearUser(): Promise<void> {
  // 로그아웃하면 스와이프 힌트도 초기화합니다.
  // (다시 로그인하면 처음 쓰는 것과 같은 흐름이 되도록. 테스트할 때도 편합니다.)
  //
  // 키를 새로 추가하면 여기에도 반드시 넣으세요. 빠뜨리면 로그아웃한 뒤에도
  // 앞사람의 캐릭터가 남아서 다음 사람에게 보입니다.
  await AsyncStorage.multiRemove([
    Keys.user,
    Keys.photoUri,
    Keys.swipeHintSeen,
    Keys.analysis,
    Keys.pet,
    Keys.petName,
  ]);
}

/**
 * 채팅에서 사용자가 지어준 반려동물 이름. 아직 안 지었으면 null.
 *
 * `pet`(게임 캐릭터 상태)과는 다른 개념이라 따로 둡니다 — 채팅 화면은
 * 게임과 무관하게 독립적으로 동작합니다(파일 상단 주석 참고).
 * 로그아웃하면 `pet`/`analysis`와 함께 지워집니다 — 다음 사람이 앞사람이
 * 지어준 이름을 이어받으면 안 됩니다.
 */
export async function loadPetName(): Promise<string | null> {
  return AsyncStorage.getItem(Keys.petName);
}

export async function savePetName(name: string): Promise<void> {
  await AsyncStorage.setItem(Keys.petName, name);
}

/** "다시 키우기"로 캐릭터를 지울 때 같이 부릅니다 — 새 캐릭터는 새 이름을 물어봐야 합니다. */
export async function clearPetName(): Promise<void> {
  await AsyncStorage.removeItem(Keys.petName);
}

/**
 * 채팅 대화를 서버에 저장할 때 "누구 대화인지" 구분하는 익명 ID.
 *
 * 로그인이 없는 프로젝트라 기기가 곧 사용자입니다. 없으면 한 번 만들어서
 * 저장하고, 그 뒤로는 항상 같은 값을 돌려줍니다. 닉네임(로그아웃하면
 * 지워짐)과 달리 이 값은 `clearUser()`가 건드리지 않습니다 — 로그아웃/재로그인
 * 해도 같은 기기의 대화 기록은 그대로 이어져야 합니다.
 */
export async function ensureDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(Keys.deviceId);
  if (existing) return existing;

  const id = randomId();
  await AsyncStorage.setItem(Keys.deviceId, id);
  return id;
}

/**
 * 기기 ID로 쓸 임의의 문자열.
 *
 * ## 왜 `Crypto.randomUUID()` 하나로 끝내지 않는가
 *
 * 웹에서 `crypto.randomUUID`는 **보안 컨텍스트에서만** 있습니다. `https://` 와
 * `http://localhost` 는 보안 컨텍스트지만, `http://192.168.0.25:8081` 처럼
 * **LAN IP로 접속하면 아닙니다.** 그래서 폰이나 다른 노트북에서 개발 서버에
 * 붙으면 여기서 이렇게 터졌습니다.
 *
 *   TypeError: getCrypto(...).randomUUID is not a function
 *
 * 게임 화면이 뜨자마자 이걸 부르기 때문에 화면 전체가 안 떴습니다.
 *
 * `getRandomValues` 는 보안 컨텍스트가 아니어도 있어서, 그걸로 UUID v4를 직접
 * 만듭니다. 그것도 없으면 마지막으로 `Math.random` 을 씁니다 — 이 값은 대화를
 * 구분하는 용도라 암호학적 강도가 필요하지 않습니다.
 */
function randomId(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // 아래로 넘어갑니다.
  }

  const bytes = new Uint8Array(16);
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  // UUID v4 형식 맞추기 (버전 4, variant 10xx).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** 사용자가 고른 사진의 로컬 URI. 아직 안 골랐으면 null. */
export async function loadPhotoUri(): Promise<string | null> {
  return AsyncStorage.getItem(Keys.photoUri);
}

export async function savePhotoUri(uri: string): Promise<void> {
  await AsyncStorage.setItem(Keys.photoUri, uri);
}

export async function clearPhotoUri(): Promise<void> {
  await AsyncStorage.removeItem(Keys.photoUri);
}

/**
 * 스와이프 힌트를 이미 봤는지 여부.
 *
 * 게임/대화 화면은 탭바가 없어서 "옆으로 밀면 된다"는 걸 한 번은 알려줘야 합니다.
 * 매번 띄우면 방해되니 처음 한 번만 보여주고 이 플래그를 세웁니다.
 */
export async function loadSwipeHintSeen(): Promise<boolean> {
  return (await AsyncStorage.getItem(Keys.swipeHintSeen)) === '1';
}

export async function markSwipeHintSeen(): Promise<void> {
  await AsyncStorage.setItem(Keys.swipeHintSeen, '1');
}

/**
 * 사진 판정 결과.
 *
 * 성격 카드는 저장하지 않습니다. `synthesize(mix)`가 순수 함수라 mix 만 있으면
 * 언제든 다시 만들 수 있고, 그래야 나중에 성격 수치를 조정했을 때 기존 사용자
 * 캐릭터도 자동으로 갱신됩니다.
 *
 * 반대로 face 와 reasons 는 저장합니다. 그때 모델이 쓴 문장이라 다시 만들 수
 * 없고, 다시 만들려면 API 를 또 불러야 합니다(무료 한도가 빠듯합니다).
 *
 * base64 사진은 저장하지 않습니다. 한 장이 수 MB 라 AsyncStorage 한도를
 * 넘길 수 있습니다. 필요하면 URI 로 다시 읽습니다 (`lib/image.ts`).
 */
export type StoredAnalysis = {
  /**
   * [{ breed, ratio }] — persona 의 resolveMix 가 받는 형태 그대로.
   *
   * **모델이 낸 그대로 둡니다.** 사용자가 2·3순위를 골라도 이 숫자는 안 고칩니다.
   * 고친 값을 저장하면 "모델이 뭐라고 했는지"를 영영 못 되찾습니다.
   */
  mix: { breed: string; ratio: number }[];
  /**
   * 결과 화면에서 사용자가 고른 품종. 성격과 생김새의 기준점이 됩니다.
   *
   * 선택 필드입니다 — 이 기능이 생기기 전에 저장된 결과에는 없고, 그 경우
   * 지분 1위가 기준점이 되어 예전과 똑같이 동작합니다.
   * 쓸 때는 `anchorMix(resolveMix(mix), chosen)` 로 순서를 맞춰 주세요.
   */
  chosen?: string;
  /** 얼굴 관찰 한두 문장. 없을 수 있습니다. */
  face: string;
  /** breedId → 근거 한 문장. 없을 수 있습니다. */
  reasons: Record<string, string>;
  /** ISO 8601 문자열 */
  createdAt: string;
};

export async function loadAnalysis(): Promise<StoredAnalysis | null> {
  return readJson<StoredAnalysis>(Keys.analysis);
}

export async function saveAnalysis(analysis: StoredAnalysis): Promise<void> {
  await writeJson(Keys.analysis, analysis);
}

export async function clearAnalysis(): Promise<void> {
  await AsyncStorage.removeItem(Keys.analysis);
}

/**
 * 키우고 있는 캐릭터의 상태. 아직 안 만들었으면 null.
 *
 * 타입을 game.ts에서 가져오지 않고 제네릭으로 받는 이유는, 저장소가 게임 규칙을
 * 몰라도 되게 하려는 것입니다(반대 방향 의존은 lib/pet.tsx가 담당).
 */
export async function loadPet<T>(): Promise<T | null> {
  return readJson<T>(Keys.pet);
}

export async function savePet(pet: unknown): Promise<void> {
  await writeJson(Keys.pet, pet);
}

export async function clearPet(): Promise<void> {
  await AsyncStorage.removeItem(Keys.pet);
}

/**
 * 진행 중인 사진 생성 작업의 접수증.
 *
 * 사진 자체는 여기 넣지 않습니다 — 이미지는 lib/album.ts(IndexedDB)에 있고,
 * 여기에는 "어떤 작업을 기다리는 중인지"만 둡니다. 몇 십 바이트짜리 정보라
 * AsyncStorage에 맞습니다.
 *
 * 이걸 저장해두는 이유는 **새로고침 때문**입니다. 생성이 몇 분 걸려서 그
 * 사이에 탭을 새로 고치는 일이 생기는데, 접수증이 남아 있으면 다시 열었을 때
 * 결과를 되찾을 수 있습니다(ComfyUI가 히스토리를 들고 있습니다).
 */
export type PhotoJob = {
  breed: string;
  stage: string;
  /** 완성되면 사진에 얹을 한 줄. 결과를 앨범에 넣을 때 같이 저장됩니다. */
  caption: string;
  /** ComfyUI가 준 접수증. */
  promptId: string;
  /** 시작 시각(ms). 너무 오래된 작업을 버리는 데 씁니다. */
  startedAt: number;
};

export async function loadPhotoJob(): Promise<PhotoJob | null> {
  return readJson<PhotoJob>(Keys.photoJob);
}

export async function savePhotoJob(job: PhotoJob): Promise<void> {
  await writeJson(Keys.photoJob, job);
}

export async function clearPhotoJob(): Promise<void> {
  await AsyncStorage.removeItem(Keys.photoJob);
}

/**
 * 앨범에 든 사진 한 장의 정보. **이미지는 여기 없습니다.**
 *
 * 이미지는 lib/album.ts가 IndexedDB에 id로 넣어두고, 여기에는 "어느 단계에서
 * 언제 찍었는지"만 남습니다. 목록이 가벼워야 앨범 화면이 사진을 다 읽지 않고도
 * 그려지고, 무거운 이미지를 localStorage에 넣는 사고도 막힙니다.
 */
export type PhotoEntry = {
  /** IndexedDB에서 이미지를 꺼낼 때 쓰는 id. */
  id: string;
  breed: string;
  stage: string;
  /** 사진에 얹는 한 줄 ("청소년기의 마지막 날"). */
  caption: string;
  /** 만든 시각(ms). 목록 정렬에 씁니다. */
  createdAt: number;
};

export async function loadAlbumEntries(): Promise<PhotoEntry[]> {
  return (await readJson<PhotoEntry[]>(Keys.album)) ?? [];
}

export async function saveAlbumEntries(entries: PhotoEntry[]): Promise<void> {
  await writeJson(Keys.album, entries);
}

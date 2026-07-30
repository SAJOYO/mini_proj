import AsyncStorage from '@react-native-async-storage/async-storage';

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
  pet: '@pet/pet',
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
  await AsyncStorage.multiRemove([Keys.user, Keys.photoUri, Keys.pet]);
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

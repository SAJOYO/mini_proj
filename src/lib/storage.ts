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
  swipeHintSeen: '@pet/swipeHintSeen',
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
  await AsyncStorage.multiRemove([Keys.user, Keys.photoUri, Keys.swipeHintSeen]);
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

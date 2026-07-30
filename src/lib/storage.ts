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
  analysis: '@pet/analysis',
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
  await AsyncStorage.multiRemove([Keys.user, Keys.photoUri, Keys.swipeHintSeen, Keys.analysis]);
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
  /** [{ breed, ratio }] — persona 의 resolveMix 가 받는 형태 그대로. */
  mix: { breed: string; ratio: number }[];
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

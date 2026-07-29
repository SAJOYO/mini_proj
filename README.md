# 나를 닮은 반려동물 다마고치 🐾

사진으로 나와 닮은 동물을 찾아 캐릭터로 키우고, 대화까지 하는 앱.

이 저장소는 **팀 공용 베이스라인**입니다. 로딩 → 시작 → 로그인 → 사진 업로드까지 동작하고,
각자 맡은 기능은 이 위에 붙여 나갑니다.

---

## 시작하기

### 0. Node 버전 확인 (제일 중요)

```bash
node -v
```

**v20.19.4 이상**이어야 합니다. 팀 기준은 **Node 24**예요 (`.nvmrc` 참고).
버전이 낮으면 설치나 실행에서 이상한 에러가 납니다. [nodejs.org](https://nodejs.org)에서 받으세요.

### 1. 설치 및 실행

```bash
git clone https://github.com/SAJOYO/mini_proj.git
cd mini_proj
npm ci
npm start
```

> ⚠️ **`npm install`이 아니라 `npm ci`입니다.**
> `npm ci`는 `package-lock.json`에 적힌 버전을 그대로 설치해서 전원이 완전히 같은 환경이 됩니다.
> `npm install`은 상황에 따라 버전을 올려버려요.
>
> ⚠️ **yarn / pnpm / bun 쓰지 마세요.** 다른 버전이 깔려서 "나는 되는데 너는 안 되는" 상황이 생깁니다.
> 락 파일이 섞이지 않게 `.gitignore`로 막아뒀습니다.

### 2. 폰에서 보기

터미널에 QR 코드가 뜹니다. 폰에 **Expo Go** 앱을 깔고 QR을 찍으면 바로 실행돼요.

- iOS → App Store에서 "Expo Go"
- Android → Play 스토어에서 "Expo Go"
- 폰과 노트북이 **같은 Wi-Fi**에 있어야 합니다
- 안 되면 (방화벽·공유기 격리) → `npx expo start --tunnel`

브라우저로 빠르게 보려면 `npm run web` (단, 카메라 촬영은 웹에서 동작 안 함).

### 명령어

| 명령어                            | 설명                                         |
| --------------------------------- | -------------------------------------------- |
| `npm start`                       | 개발 서버 (QR 코드)                          |
| `npm run android` / `ios` / `web` | 해당 플랫폼으로 바로 실행                    |
| `npm run typecheck`               | 타입 검사                                    |
| `npm run lint`                    | 코드 검사                                    |
| `npm run format`                  | 포맷 자동 정리 (저장 전에 돌리면 편함)       |
| `npm run check`                   | 타입 + lint 한 번에. **PR 올리기 전에 필수** |

---

## 지금 동작하는 것

| 화면        | 파일                | 하는 일                                         |
| ----------- | ------------------- | ----------------------------------------------- |
| 로딩        | `src/app/index.tsx` | 저장된 로그인 확인 → 시작 or 사진 화면으로 분기 |
| 시작        | `src/app/start.tsx` | 앱 소개 + [시작하기]                            |
| 로그인      | `src/app/login.tsx` | 닉네임 입력 → 기기에 저장                       |
| 사진 업로드 | `src/app/photo.tsx` | 앨범/카메라로 사진 선택 → URI 저장              |

로그인은 **서버 없이 닉네임만 로컬에 저장**하는 방식입니다. 비밀번호는 받지도, 저장하지도 않아요.
(진짜 인증이 필요해지면 `src/lib/auth.tsx`의 `signIn()` 내부만 갈아끼우면 됩니다.)

---

## 폴더 구조

```
src/
├─ app/              ← 화면. 파일 하나 = 경로 하나 (expo-router)
│  ├─ _layout.tsx      루트 레이아웃. Provider들이 여기 있음
│  ├─ index.tsx        "/"      로딩
│  ├─ start.tsx        "/start" 시작
│  ├─ login.tsx        "/login" 로그인
│  └─ photo.tsx        "/photo" 사진 업로드
├─ components/       ← 여러 화면이 같이 쓰는 UI
│  ├─ screen.tsx       화면 껍데기 (배경·안전영역·여백)
│  └─ button.tsx       버튼
├─ constants/
│  └─ theme.ts         색상·여백·글자크기 토큰
├─ hooks/
│  └─ use-theme.ts     현재 테마 색상 가져오기
└─ lib/
   ├─ auth.tsx         로그인 상태 (useAuth)
   └─ storage.ts       로컬 저장소 (AsyncStorage 래퍼)
```

---

## 새 화면 추가하는 법

`src/app/`에 파일을 만들면 **그게 곧 경로**입니다. 중앙 라우터 파일을 건드릴 필요가 없어서
여러 명이 동시에 작업해도 충돌이 안 나요.

`src/app/chat.tsx` 를 만들면 → `/chat` 으로 접근 가능:

```tsx
import { Text } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ChatScreen() {
  const c = useTheme();

  return (
    <Screen>
      <Text style={{ color: c.text, fontSize: FontSize.title }}>대화하기</Text>
      <Button label="보내기" onPress={() => {}} />
    </Screen>
  );
}
```

이동은 `useRouter()`:

```tsx
const router = useRouter();
router.push('/chat'); // 그냥 이동
router.push({ pathname: '/chat', params: { photoUri } }); // 값 넘기며 이동
router.replace('/photo'); // 뒤로가기 막고 이동
```

받는 쪽에서는 `useLocalSearchParams()`.

### 지켜주면 좋은 것

- 화면은 항상 `<Screen>`으로 감싸기 — 배경·노치·여백이 한 번에 해결됩니다
- 색은 `useTheme()`에서 꺼내 쓰기 — `#FF8A5B` 같은 걸 직접 박지 마세요 (다크모드 깨짐)
- 여백은 `Spacing.md` 처럼 토큰으로
- 로컬 저장은 `src/lib/storage.ts`를 거치기 — AsyncStorage 직접 호출 금지

---

## 담당

| 기능                                 | 담당           |
| ------------------------------------ | -------------- |
| 닮은 동물 검색                       | 홍가연         |
| 다마고치 게임 (캐릭터화 + 게임 동작) | 조윤주, 최윤우 |
| 동물과 대화하기 (페르소나)           | 장유빈, 임승현 |
| 사진 만들어 공유하기                 | 김경빈         |

사진 화면(`src/app/photo.tsx`)의 **[분석하기]** 버튼이 닮은 동물 검색으로 넘어가는 자리입니다.
코드에 `TODO(홍가연)` 로 표시해 뒀어요.

---

## ⚠️ API 키 — 시작 전에 팀에서 정하기

대화 기능과 사진 생성 기능은 외부 API를 부릅니다. **여기서 흔히 사고가 납니다.**

### 앱에 키를 넣으면 무조건 노출됩니다

`EXPO_PUBLIC_API_KEY` 같은 환경변수는 **JS 번들에 문자열 그대로 박힙니다.**
앱을 설치한 사람이 번들을 열어보면 키가 그냥 보여요.
`.env`를 gitignore 하는 건 **깃허브에 안 올라가게 하는 것**일 뿐, 앱 안에서는 노출됩니다.

### 선택지

**A. 프록시 서버를 하나 둔다** (제대로 된 방법)
앱 → 우리 서버 → 외부 API. 키는 서버에만 있습니다. 서버 하나를 더 관리해야 해요.

**B. 각자 키를 넣고 발표용으로만 쓴다** (수업 프로젝트면 현실적)

- 키를 **절대 커밋하지 말 것** (`.env`만 사용)
- 발표 끝나면 **키 폐기**
- 앱을 외부에 배포하지 않기

**어느 쪽이든 코드 짜기 전에 정하세요.** 4명이 각자 구현한 다음에 바꾸면 다 갈아엎어야 합니다.

`.env` 사용법:

```bash
# .env  (커밋되지 않음)
EXPO_PUBLIC_API_BASE_URL=https://...
```

```ts
const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
```

---

## 협업 규칙

### 브랜치 구조

```
main   ← 최종/발표용. 여기로 직접 push 금지
 └ dev ← 통합 브랜치 (기본 브랜치). 모든 작업은 여기로 모입니다
    └ feat/chat, feat/animal-search, ...  ← 기능별 작업 브랜치
```

**작업은 항상 `dev`에서 브랜치를 따서 시작하고, PR도 `dev`로 보냅니다.**

### 작업 흐름

```bash
git checkout dev
git pull                      # dev 최신 상태로
git checkout -b feat/chat     # 기능별 브랜치 생성

# ... 작업 ...

npm run check                 # 타입 + lint 통과 확인
git add .
git commit -m "대화 화면 추가"
git push -u origin feat/chat
```

GitHub에서 **`dev`로 가는 PR**을 올리고 머지합니다.

> 💡 브랜치 이름은 **기능 단위**(`feat/chat`)로 짓고 짧게 쓰고 버리세요.
> 개인 이름으로 브랜치를 만들어 오래 쓰면 `dev`와 점점 벌어져서 나중에 머지가 힘들어집니다.
> 작업이 끝나면 바로 PR 올리고, 머지된 브랜치는 지우세요.

### 남의 작업 가져오기

내 브랜치에서 작업하는 동안 `dev`가 바뀌었으면:

```bash
git checkout dev && git pull
git checkout feat/chat
git merge dev                 # 충돌나면 여기서 해결
```

PR 올리기 전에 한 번 해주면 머지가 훨씬 수월합니다.

### 패키지 설치

Expo 관련 패키지는 `npm install` 대신 **`npx expo install`** 을 쓰세요.
SDK 57에 맞는 버전을 알아서 골라줍니다.

설치했으면 `package.json`과 `package-lock.json` **둘 다 커밋**하세요.

> 💡 **새 라이브러리를 넣기 전에**: Expo Go에는 정해진 네이티브 모듈만 들어있습니다.
> Expo Go에서 지원하지 않는 라이브러리를 넣으면 앱이 아예 안 켜지고,
> 그때부터는 개발 빌드(`eas build`)를 만들어서 팀 전원이 재설치해야 해요.
> 새 패키지가 필요하면 **팀에 먼저 공유**해 주세요.

### package-lock.json 충돌이 났을 때

손으로 고치지 마세요. 이렇게 하면 됩니다:

```bash
git checkout --theirs package-lock.json   # dev 것을 그대로 가져오고
npm install                                # 내 package.json 기준으로 다시 생성
git add package-lock.json
```

---

## 환경

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · expo-router
Node 24 (최소 20.19.4) · npm

코드 스타일은 ESLint + Prettier로 통일돼 있습니다 (`.prettierrc`, `eslint.config.js`).
줄바꿈은 `.gitattributes`로 LF 고정 — Windows/Mac 섞여 있어도 diff가 깨지지 않습니다.

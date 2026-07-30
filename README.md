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
npm run web
```

> ⚠️ **`npm install`이 아니라 `npm ci`입니다.**
> `npm ci`는 `package-lock.json`에 적힌 버전을 그대로 설치해서 전원이 완전히 같은 환경이 됩니다.
> `npm install`은 상황에 따라 버전을 올려버려요.
>
> ⚠️ **yarn / pnpm / bun 쓰지 마세요.** 다른 버전이 깔려서 "나는 되는데 너는 안 되는" 상황이 생깁니다.
> 락 파일이 섞이지 않게 `.gitignore`로 막아뒀습니다.

### 2. 화면 보기 — 웹으로 (폰도 모바일 브라우저)

```bash
npm run web
```

브라우저가 열립니다. 개발은 이걸로 하세요.

> ℹ️ **폰 확인은 모바일 브라우저로 합니다. Expo Go / 네이티브 앱은 이번 범위가 아닙니다.**
>
> 이 프로젝트는 **SDK 57**인데 스토어의 Expo Go는 SDK 54까지만 지원해서 QR을 찍으면
> "버전이 맞지 않는다"는 화면이 나옵니다. SDK를 내리거나 개발 빌드(`eas build`)를
> 만들면 되지만, 멘토링에서 **미니 프로젝트니까 모바일 웹 환경까지만 테스트하자고
> 결정**했습니다.
> 폰에서는 아래처럼 모바일 브라우저로 열어 반응형까지만 확인합니다.

#### 폰에서 열어보기 (모바일 웹)

1. PC에서 `npm run web` 실행
2. 폰과 PC를 **같은 Wi-Fi**에 연결
3. 폰 브라우저에서 `http://<PC의 로컬 IP>:8081` 접속
   (IP 확인: Windows `ipconfig` → IPv4 주소 / macOS `ipconfig getifaddr en0`)

안 열리면 PC 방화벽에서 8081 포트가 막힌 경우가 많습니다.

#### 웹에서 확인할 수 없는 것

웹은 `react-native-web`으로 도는 거라 네이티브와 다릅니다. 네이티브 열은 참고용이며,
**이번 프로젝트에서는 검증하지 않습니다.**

|                 | 웹 (`npm run web`)         | 폰 (네이티브 — 범위 밖) |
| --------------- | -------------------------- | ----------------------- |
| `Alert`         | **동작 안 함** (아래 참고) | 정상                    |
| 카메라 촬영     | 불가                       | 가능                    |
| 저장소          | `localStorage`             | 네이티브 저장소         |
| 고른 사진의 URI | `blob:` — 탭 닫으면 무효   | 파일 경로, 유지됨       |
| 애니메이션      | CSS                        | 네이티브 드라이버       |

### 명령어

| 명령어                            | 설명                                         |
| --------------------------------- | -------------------------------------------- |
| `npm run web`                     | **개발용.** 브라우저로 실행                  |
| `npm start`                       | 개발 서버 (QR 코드 — Expo Go는 범위 밖)      |
| `npm run android` / `ios` / `web` | 해당 플랫폼으로 바로 실행                    |
| `npm run typecheck`               | 타입 검사                                    |
| `npm run lint`                    | 코드 검사                                    |
| `npm run format`                  | 포맷 자동 정리 (저장 전에 돌리면 편함)       |
| `npm run check`                   | 타입 + lint 한 번에. **PR 올리기 전에 필수** |

---

## 지금 동작하는 것

| 화면        | 파일                | 하는 일                                             |
| ----------- | ------------------- | --------------------------------------------------- |
| 로딩        | `src/app/index.tsx` | 저장된 로그인·캐릭터 확인 → 시작/사진/게임으로 분기 |
| 시작        | `src/app/start.tsx` | 앱 소개 + [시작하기]                                |
| 로그인      | `src/app/login.tsx` | 닉네임 입력 → 기기에 저장                           |
| 사진 업로드 | `src/app/photo.tsx` | 앨범/카메라로 사진 선택 → [분석하기] → 게임으로     |
| 다마고치    | `src/app/game.tsx`  | 캐릭터 돌보기 · 4단계 성장 · 노년기 엔딩            |

로그인은 **서버 없이 닉네임만 로컬에 저장**하는 방식입니다. 비밀번호는 받지도, 저장하지도 않아요.
(진짜 인증이 필요해지면 `src/lib/auth.tsx`의 `signIn()` 내부만 갈아끼우면 됩니다.)

### 다마고치 게임 규칙

규칙은 전부 `src/lib/game.ts`에 순수 함수로 있고, 숫자는 `GameConfig` 한 곳에 모여 있습니다.

**성장과 노화가 분리되어 있습니다:**

- **영유아기 → 청소년기 → 청년기** : 돌봄으로 쌓은 **경험치**로 진행 (60 / 180 EXP)
- **청년기 → 노년기** : 경험치가 아니라 **함께한 일수**로 진행 (`elderAfterDays`, 기본 7일)
- **노년기 엔딩** : 현재 스탯 평균 70% + 누적 돌봄량 30% → 행복 / 평범 / 쓸쓸한 노년

돌보면 자라지만 늙는 건 시간이 하는 일이라서 이렇게 갈랐습니다. 경험치로 노년기가
오면 "열심히 돌봤더니 빨리 늙었다"가 되어 보상이 뒤집히니까요. 대신 쌓은 경험치와
스탯은 엔딩 등급으로 돌려받습니다.

배고픔·행복·청결은 시간이 지나면 줄어듭니다(앱을 닫아둔 시간도 반영). 기본값은
하루 단위로 돌보는 기준이라 실시간 테스트에는 느려서, **`GameConfig.decaySpeed`
배율만 올리면** 세 스탯이 같은 비율로 빨라집니다.

> ⚠️ 지금 `decaySpeed`가 테스트용 `20`으로 되어 있습니다. **발표·제출 전에 `1`로 되돌리세요.**

**돌봄은 진행에 시간이 걸립니다.** 버튼을 누르면 곧바로 끝나지 않고 진행 바가 차고
(`밥을 먹는 중입니다...`), 다 차면 효과가 적용됩니다. 그동안 다른 돌봄은 못 누르니
연타 방지도 겸합니다 — 쿨다운으로 잠그는 대신 기다리는 시간을 장면으로 만든 것입니다.

**돌봄에는 대가가 있습니다.** 놀아주면 배고파지고 지저분해지고, 먹으면 조금 더러워지고,
씻기면 기분이 상합니다(`CareAction.sideEffects`). 버튼에 미리 표시되니 누른 뒤에
알게 되는 일은 없습니다. 하나만 반복해서는 세 스탯을 유지할 수 없습니다.

**쓰다듬기는 아바타를 누르면 됩니다.** 횟수 제한이 없고 거절도 없습니다. 대신 보상이
아주 작습니다(행복 +1, 경험치는 10번마다 +1). 보상을 노리는 행동이 아니라 반응을
보는 행동이라, 대사 풀을 넉넉히 뒀습니다(`PAT_REACTIONS`).

**소원(미니 이벤트)** — 캐릭터가 먼저 "산책 가고 싶어요"처럼 요청하고, 들어주면
경험치를 더 줍니다(`wishBonusExp`). 지금 채워줄 수 있는 것만 요청합니다 —
안 그러면 "찝찝해요"라면서 정작 청결이 가득 차 씻기기가 거절되는 모순이 생깁니다.

**스탯이 0인 채로 방치하면 캐릭터가 여행을 떠납니다**(`departAfterMs`, 기본 2분).
게임은 거기서 끝나고 사진 업로드부터 다시 시작합니다. 실패나 죽음으로 쓰지 않고
"심심해서 세상 구경을 나섰다"로 돌려 표현했습니다. 떠나기 전에는 남은 시간과 함께
경고가 뜨니 예고 없이 사라지지는 않습니다.

시연용으로 게임 화면 맨 아래에 개발 도구가 있습니다 (`__DEV__`에서만 보임):
`다음 단계 →` · `영유아기로 ↺` · `스탯 0/30/100` · `여행 보내기 🧳`.
시간을 실제로 흘려 기다리지 않고 성장·방치·여행·엔딩을 확인할 수 있습니다.

---

## 폴더 구조

```
src/
├─ app/              ← 화면. 파일 하나 = 경로 하나 (expo-router)
│  ├─ _layout.tsx      루트 레이아웃. Provider들이 여기 있음
│  ├─ index.tsx        "/"      로딩
│  ├─ start.tsx        "/start" 시작
│  ├─ login.tsx        "/login" 로그인
│  ├─ photo.tsx        "/photo" 사진 업로드
│  └─ game.tsx         "/game"  다마고치 게임
├─ components/       ← 여러 화면이 같이 쓰는 UI
│  ├─ screen.tsx       화면 껍데기 (배경·안전영역·여백)
│  ├─ button.tsx       버튼
│  ├─ pet-avatar.tsx   캐릭터가 보이는 자리 (지금은 이모지)
│  └─ stat-bar.tsx     0~100 스탯 게이지
├─ constants/
│  └─ theme.ts         색상·여백·글자크기 토큰
├─ hooks/
│  └─ use-theme.ts     현재 테마 색상 가져오기
└─ lib/
   ├─ auth.tsx         로그인 상태 (useAuth)
   ├─ pet.tsx          키우는 캐릭터 상태 (usePet)
   ├─ game.ts          게임 규칙. 화면 없는 순수 함수 + GameConfig
   ├─ breeds.ts        품종 목록 — 임시 스텁 (닮은 동물 검색이 붙으면 삭제)
   ├─ dialog.ts        알림·확인 창 (Alert 직접 쓰지 말고 이걸)
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
- 알림·확인 창은 `src/lib/dialog.ts`의 `notify()` / `confirmAction()`을 쓰기 (아래 참고)

### ⚠️ `Alert.alert()`을 직접 쓰지 마세요

react-native-web의 `Alert`는 **아무 동작도 하지 않는 빈 함수**입니다.

```js
// node_modules/react-native-web/dist/exports/Alert/index.js
class Alert {
  static alert() {}
}
```

네이티브(폰)에서는 잘 되는데 `npm run web`에서는 창이 안 뜨고, 버튼에 걸어둔
`onPress`도 실행되지 않습니다. **"눌렀는데 아무 일도 안 일어난다", "에러가 났을
텐데 메시지가 없다"의 흔한 원인입니다.** 웹으로 테스트하다 한참 헤맬 수 있어요.

대신 `src/lib/dialog.ts`를 쓰세요 — 웹/네이티브를 알아서 갈라 줍니다.

```tsx
import { confirmAction, notify } from '@/lib/dialog';

notify('사진을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');

const ok = await confirmAction({
  title: '처음부터 다시 키울까요?',
  message: '지금까지 키운 기록은 사라집니다.',
  confirmLabel: '다시 키우기',
  destructive: true,
});
if (!ok) return;
```

---

## 담당

| 기능                                 | 담당           |
| ------------------------------------ | -------------- |
| 닮은 동물 검색                       | 홍가연         |
| 다마고치 게임 (캐릭터화 + 게임 동작) | 조윤주, 최윤우 |
| 동물과 대화하기 (페르소나)           | 장유빈, 임승현 |
| 사진 만들어 공유하기                 | 김경빈         |

붙여야 할 자리는 코드에 `TODO(이름)` 으로 표시해 뒀습니다.

| 자리                                    | 파일                               | 지금 상태                        |
| --------------------------------------- | ---------------------------------- | -------------------------------- |
| 닮은 동물 검색 (`TODO(홍가연)`)         | `src/app/photo.tsx` 의 `analyze()` | 강아지 품종 하나를 **랜덤 반환** |
| 단계별 캐릭터 이미지 (`TODO(조윤주)`)   | `src/components/pet-avatar.tsx`    | 단계별 **이모지**로 대체 중      |
| 동물과 대화하기 (`TODO(장유빈·임승현)`) | `src/app/game.tsx` 하단            | [대화하기] 버튼 비활성           |

**캐릭터 이미지 붙이는 법**: `<PetAvatar>`의 `imageUri` prop에 이미지 URI만 넘기면
이모지가 이미지로 바뀝니다. `stage.id`가 `'baby' | 'teen' | 'young' | 'elder'`로
오니 이걸로 골라 넘기면 되고, 게임 화면 코드는 건드릴 필요 없습니다.

**품종 붙이는 법**: 게임 쪽은 품종 문자열만 받으면 되므로 `analyze()` 안의
`pickRandomBreed()` 자리에 분석 결과를 넣으면 끝입니다. (`src/lib/breeds.ts`는 그때 삭제)

> ⚠️ **웹에서 사진 URI 주의**: `npm run web`에서 고른 사진은 `blob:` URI라 탭을 닫으면
> 무효가 됩니다(문자열만 남고 가리키는 데이터가 사라짐). 폰에서는 파일 경로라 괜찮아요.
> 캐릭터 생성이 사용자 사진을 입력으로 쓸 때, 웹에서 새로고침하면 원본이 사라지는
> 점을 감안해 주세요.

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

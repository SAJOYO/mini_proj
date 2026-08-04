# 개발 문서

이 저장소에서 작업할 사람을 위한 문서입니다. 프로젝트가 무엇인지는
[README](./README.md), 브랜치·커밋·PR 규칙은 [CONTRIBUTING](./CONTRIBUTING.md)에 있습니다.

---

## 📑 목차

| 무엇을 하려는지             | 볼 곳                                                                 |
| --------------------------- | --------------------------------------------------------------------- |
| 일단 띄워보기               | [시작하기](#시작하기) · [명령어](#명령어)                             |
| 코드 고치기                 | [폴더 구조](#폴더-구조) · [새 화면 추가하는 법](#새-화면-추가하는-법) |
| 게임 밸런스 · 규칙 알아보기 | [다마고치 게임 규칙](#다마고치-게임-규칙)                             |
| 사진 생성 붙이기            | [사진 만들기 (ComfyUI)](#사진-만들기-comfyui)                         |
| 대화 기억 붙이기            | [대화 저장 서버 (server/)](#대화-저장-서버-server)                    |
| APK 굽기                    | [배포 (APK 만들기)](#배포-apk-만들기)                                 |

---

## 시작하기

### 0. Node 버전 확인

```bash
node -v
```

최소 **v20.19.4 이상**.
작업 기준 **Node 24**.

### 1. 설치하고 웹으로 띄우기

```bash
git clone https://github.com/SAJOYO/mini_proj.git
cd mini_proj
npm ci
npm run web
```

브라우저가 열립니다. 고치고 바로 보는 작업은 이게 제일 빠릅니다.

> ⚠️ **`npm install`이 아니라 `npm ci`입니다.**
> `npm ci`는 `package-lock.json`에 적힌 버전을 그대로 설치해서 전원이 완전히 같은 환경이 됩니다.
> `npm install`은 상황에 따라 버전을 올려버려요.
>
> ⚠️ **yarn / pnpm / bun 쓰지 마세요.** 다른 버전이 깔려서 "나는 되는데 너는 안 되는" 상황이 생깁니다.
> 락 파일이 섞이지 않게 `.gitignore`로 막아뒀습니다.

### 2. 폰에서 보기

두 가지 길이 있습니다. **고치면서 볼 때는 Expo Go**, **완성된 앱을 확인할 때는 APK**입니다.

#### Expo Go (개발용)

```bash
npm start
```

폰과 PC를 **같은 Wi-Fi**에 두고, Expo Go에서 `exp://<PC의 로컬 IP>:8081` 로 접속합니다.
(IP 확인: Windows `ipconfig` → IPv4 / macOS `ipconfig getifaddr en0`)

> ⚠️ **스토어의 Expo Go는 안 됩니다.** 이 프로젝트는 SDK 57이라 [expo.dev/go](https://expo.dev/go)
> 에서 **SDK 57용 APK**를 받아 설치해야 합니다. iOS는 우회 방법이 사실상 없어서
> **안드로이드 기준**입니다.

#### APK (설치해서 확인)

`eas build` 로 만든 설치 파일입니다. 아래 [배포](#배포-apk-만들기) 참고.

#### 웹과 폰이 다른 지점

웹은 `react-native-web`으로 도는 것이라 브라우저가 대신해 주는 일이 많습니다.
**둘 다 지원하지만 갈리는 곳이 있어서, 한쪽에서 됐다고 다른 쪽도 된다고 보면 안 됩니다.**

|                 | 웹 (`npm run web`)         | 폰 (네이티브)                 |
| --------------- | -------------------------- | ----------------------------- |
| `Alert`         | **동작 안 함** (아래 참고) | 정상                          |
| 카메라 촬영     | 불가                       | 가능                          |
| 저장소          | `localStorage`             | 네이티브 저장소               |
| 만든 사진 보관  | IndexedDB                  | 파일 (`expo-file-system`)     |
| 사진 내려받기   | 파일 다운로드              | 기기 갤러리                   |
| 고른 사진의 URI | `blob:` — 탭 닫으면 무효   | 파일 경로, 유지됨             |
| 애니메이션      | CSS                        | 네이티브 드라이버             |
| `http://` 통신  | 그대로 됨                  | 기본 차단 (아래 ComfyUI 참고) |

플랫폼이 갈리는 코드는 되도록 `src/lib/` 안에 가둡니다 — 화면은 어느 쪽인지 몰라도 되게
(`album.ts`, `image.ts`, `dialog.ts`가 그런 예입니다).

### 3. ⚠️ API 키 — 시작 전에 팀에서 정하기

대화 기능과 사진 생성 기능은 외부 API를 부릅니다. **여기서 흔히 사고가 납니다.**

#### 앱에 키를 넣으면 무조건 노출됩니다

`EXPO_PUBLIC_API_KEY` 같은 환경변수는 **JS 번들에 문자열 그대로 박힙니다.**
앱을 설치한 사람이 번들을 열어보면 키가 그냥 보여요.
`.env`를 gitignore 하는 건 **깃허브에 안 올라가게 하는 것**일 뿐, 앱 안에서는 노출됩니다.

#### 선택지

**A. 프록시 서버를 하나 둔다** (제대로 된 방법)
앱 → 우리 서버 → 외부 API. 키는 서버에만 있습니다. 서버 하나를 더 관리해야 해요.

**B. 각자 키를 넣고 발표용으로만 쓴다** (수업 프로젝트면 현실적)

- 키를 **절대 커밋하지 말 것** (`.env`만 사용)
- 발표 끝나면 **키 폐기**
- 앱을 외부에 배포하지 않기

**지금은 B로 가고 있습니다.** 발표용이라 키를 앱에 넣되, 커밋하지 않고 발표 뒤 폐기합니다.

`.env` 사용법 (`.env.example` 참고):

```bash
# .env  (커밋되지 않음)
EXPO_PUBLIC_VISION_API_KEY=...      # 사진 판정
EXPO_PUBLIC_CHAT_API_KEY=...        # 대화
EXPO_PUBLIC_COMFY_URL=http://...    # 사진 생성 서버
```

```ts
const key = process.env.EXPO_PUBLIC_VISION_API_KEY;
```

> ⚠️ **이름에 `EXPO_PUBLIC_` 이 있어야 치환됩니다.** 없으면 값이 `undefined` 로 들어가고,
> 화면에는 "키가 없다"고만 보여서 원인을 찾기 어렵습니다.

> 💡 **무료 한도**: 판정·대화는 Gemini 무료 등급을 씁니다. 분당·일일 한도가 따로 있어서
> 리허설로 여러 번 돌리면 `429` 로 막힙니다. 한도는 **키가 아니라 구글 클라우드 프로젝트
> 단위**라, 같은 프로젝트에서 키만 새로 뽑아도 안 풀립니다. 발표 때는 **판정을 미리 해둔
> 상태로 시작**하는 편이 안전합니다(결과는 기기에 저장돼 있습니다).

### 명령어

| 명령어                            | 설명                                         |
| --------------------------------- | -------------------------------------------- |
| `npm run web`                     | **개발용.** 브라우저로 실행                  |
| `npm start`                       | 개발 서버 (Expo Go로 접속)                   |
| `npm run android` / `ios` / `web` | 해당 플랫폼으로 바로 실행                    |
| `npm run check`                   | 타입 + lint 한 번에. **PR 올리기 전에 필수** |
| `npm run typecheck` / `lint`      | 따로 돌릴 때                                 |
| `npm run format`                  | 포맷 자동 정리 (저장 전에 돌리면 편함)       |
| `npm run test:persona`            | 순수 함수 테스트 (`src/lib/**/*.test.ts`)    |
| `npm run prompts:build`           | 견종 프롬프트 문서 → 코드 생성 (아래 참고)   |
| `npm run keepsake:prompt`         | 사진 생성에 실제로 나갈 문장 확인            |
| `npm run persona:infer` / `chat`  | 판정·대화를 앱 없이 터미널에서 시험          |

> 💡 `.env` 값은 **번들에 문자열로 박힙니다.** 값을 바꿨으면 `npm start -- --clear` 로
> 캐시를 비우고 다시 띄우세요. 안 그러면 옛 값이 그대로 남습니다.

---

## 화면과 파일

| 화면        | 파일                      | 하는 일                                             |
| ----------- | ------------------------- | --------------------------------------------------- |
| 로딩        | `src/app/index.tsx`       | 저장된 로그인·캐릭터 확인 → 시작/사진/게임으로 분기 |
| 시작        | `src/app/start.tsx`       | 앱 소개 + [시작하기]                                |
| 로그인      | `src/app/login.tsx`       | 닉네임 입력 → 기기에 저장                           |
| 사진 업로드 | `src/app/photo.tsx`       | 앨범/카메라로 사진 선택 → [분석하기]                |
| 판정 결과   | `src/app/result.tsx`      | 닮은 품종 후보 중 하나를 고름 → 캐릭터 부화         |
| 다마고치    | `src/app/(tabs)/game.tsx` | 캐릭터 돌보기 · 4단계 성장 · 노년기 엔딩            |
| 대화        | `src/app/(tabs)/chat.tsx` | 판정 결과로 만든 성격으로 대화                      |
| 사진 찍기   | `src/app/photo-gen.tsx`   | 올린 사진 + 캐릭터로 기념 사진 생성                 |
| 앨범        | `src/app/album.tsx`       | 만든 사진을 단계별로 모아 보기 · 내려받기           |

**게임과 대화는 좌우 스와이프로 오갑니다.** `(tabs)` 폴더로 묶여 있고 탭바 대신 점
인디케이터만 둡니다 — 괄호로 묶은 폴더는 주소에 나타나지 않아서 `/game`, `/chat` 그대로입니다.

로그인은 **서버 없이 닉네임만 로컬에 저장**하는 방식입니다. 비밀번호는 받지도, 저장하지도 않아요.
(진짜 인증이 필요해지면 `src/lib/auth.tsx`의 `signIn()` 내부만 갈아끼우면 됩니다.)

---

## 폴더 구조

```
src/
├─ app/              ← 화면. 파일 하나 = 경로 하나 (expo-router)
│  ├─ _layout.tsx      루트 레이아웃. Provider들이 여기 있음
│  ├─ index.tsx        "/"          로딩
│  ├─ start.tsx        "/start"     시작
│  ├─ login.tsx        "/login"     로그인
│  ├─ photo.tsx        "/photo"     사진 업로드
│  ├─ result.tsx       "/result"    판정 결과 · 품종 고르기
│  ├─ photo-gen.tsx    "/photo-gen" 기념 사진 만들기
│  ├─ album.tsx        "/album"     앨범
│  └─ (tabs)/          스와이프로 오가는 두 화면 (주소에는 안 나타남)
│     ├─ game.tsx      "/game"      다마고치 게임
│     └─ chat.tsx      "/chat"      대화
├─ components/       ← 여러 화면이 같이 쓰는 UI
│  ├─ screen.tsx       화면 껍데기 (배경·안전영역·여백)
│  ├─ button.tsx       버튼
│  ├─ pet-character.tsx  SVG 캐릭터. 품종·단계로 비율이 달라짐
│  ├─ pet-avatar.tsx   캐릭터가 사는 자리 (반응·애니메이션)
│  └─ stat-bar.tsx     0~100 스탯 게이지
├─ constants/
│  ├─ theme.ts         색상·여백·글자크기 토큰
│  ├─ pet.ts           품종 표 · 단계별 생김새 비율(LIFE_STAGES)
│  └─ breed-prompt.ts  ⚠️ 생성물. 20-breed-prompts/*.md 에서 만들어집니다
├─ hooks/
│  └─ use-theme.ts     현재 테마 색상 가져오기
└─ lib/               ← 화면 없는 규칙과 배관
   ├─ auth.tsx         로그인 상태 (useAuth)
   ├─ pet.tsx          키우는 캐릭터 상태 (usePet)
   ├─ game.ts          게임 규칙. 순수 함수 + GameConfig
   ├─ storage.ts       로컬 저장소 (AsyncStorage 래퍼)
   ├─ album.ts         만든 사진 보관 (웹 IndexedDB / 폰 파일)
   ├─ image.ts         고른 사진 다루기 (플랫폼 차이가 여기 모여 있음)
   ├─ comfy.ts         ComfyUI 호출
   ├─ photo-job.tsx    사진 생성 진행 상태 (화면 밖에서 폴링)
   ├─ photo-prompt.ts  생성 문장 조립
   ├─ dialog.ts        알림·확인 창 (Alert 직접 쓰지 말고 이걸)
   ├─ breed-inference/ 사진 → 닮은 품종 판정
   ├─ persona/         품종 혼합 → 성격 카드
   └─ persona-chat/    성격 카드 → 대화

20-breed-prompts/    ← 견종별 사진 생성 프롬프트 **원본**(사람이 읽고 고침)
scripts/             ← 앱 없이 돌려보는 도구들
server/              ← 대화 요약 저장 서버 (선택)
```

**캐릭터는 이미지가 아니라 SVG로 그립니다.** 품종별 생김새와 단계별 비율(`LIFE_STAGES`)을
코드가 조합해서, 20종 × 4단계를 그림 파일 없이 만듭니다.

> ⚠️ **웹에서 사진 URI 주의**: `npm run web`에서 고른 사진은 `blob:` URI라 탭을 닫으면
> 무효가 됩니다(문자열만 남고 가리키는 데이터가 사라짐). 그래서 원본은 IndexedDB에
> 넣고 **열쇠 문자열**만 저장합니다 — 쓸 때 `resolvePhoto()`로 꺼냅니다.
> 폰은 파일 경로라 그대로 살아 있습니다. 이 차이는 `src/lib/image.ts`에 모여 있습니다.

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

## 다마고치 게임 규칙

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

> 지금 `decaySpeed`는 기획값 `1`입니다. 테스트하려고 올렸다면 **커밋 전에 `1`로 되돌리세요**
> (시연 도구에 현재 배율이 표시됩니다). 방치·경고색·여행은 배율을 올리는 것보다
> 시연 도구의 `스탯 0 (방치)` · `여행 보내기 🧳`로 확인하는 쪽이 빠릅니다.

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

### 시연 도구

게임 화면 맨 아래에 시간을 건너뛰는 도구가 있습니다 — `다음 단계 →` · `영유아기로 ↺` ·
`스탯 0/30/100` · `🍚/🎾/🛁 바라기` · `여행 보내기 🧳`. 청년기가 180 EXP, 노년기가
함께한 지 7일이라 성장·방치·엔딩을 실제로 기다려서 확인할 수는 없기 때문입니다.

**기본으로는 안 보입니다.** 실제 사용자가 볼 화면을 그대로 확인하려고 꺼둔 것입니다.
켜는 자리가 둘로 나뉘어 있습니다.

| 어디서         | 켜는 법                                                      |
| -------------- | ------------------------------------------------------------ |
| 로컬 개발 서버 | `.env` 에 `EXPO_PUBLIC_DEMO_TOOLS=1` → 서버 재시작           |
| 발표용 APK     | [`demo` 프로필로 빌드](#발표용-apk--시연-도구가-들어간-빌드) |

**켜는 자리가 둘로 나뉜 이유** — `.env` 는 gitignore 대상이라 EAS 빌드에 업로드되지
않습니다. 그래서 APK 는 `eas.json` 의 `demo` 프로필이 같은 변수를 따로 켭니다.

---

## 사진 만들기 (ComfyUI)

**앨범의 [사진 찍기]** 와 성장 직후 배너에서 기념 사진을 만듭니다.
생성은 팀원 노트북에서 도는 **ComfyUI**가 하고, 앱은 HTTP로 주문만 넣습니다.

지금은 로컬 서버에만 붙어서 **API 키가 필요 없습니다.** 위의 A/B 논쟁은
클라우드로 옮길 때 다시 꺼내면 됩니다.

한 장에 **3~10분**이 걸립니다(기계에 따라 다릅니다). GPU가 하나라 요청은 줄을 서고,
그동안 다른 화면에서 계속 놀 수 있습니다 — 기다리는 일은 화면이 아니라
`src/lib/photo-job.tsx`가 하고, 다 되면 게임 화면 앨범 버튼에 빨간 점이 붙습니다.

### 준비

`.env.example`을 `.env`로 복사하고 서버 주소를 채우세요.

```bash
EXPO_PUBLIC_COMFY_URL=http://192.168.0.2:8188
```

ComfyUI를 띄우는 쪽에서는 아래 옵션이 필요합니다.

```bash
python main.py --listen 0.0.0.0 --enable-cors-header "*"
```

`--listen`이 없으면 그 노트북 안에서만 열리고, `--enable-cors-header`가 없으면
`npm run web`에서 브라우저가 요청을 전부 막습니다. 윈도우면 방화벽에서
**8188 포트 인바운드 허용**도 필요합니다.

붙는지 확인은 브라우저에서 `http://<주소>:8188/system_stats` — JSON이 나오면 성공입니다.

### 어디를 고치면 되나

| 하고 싶은 것              | 고칠 곳                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| 워크플로 교체             | `src/lib/krea2_identity_edit.json` (ComfyUI에서 **Export (API)**) |
| 바뀐 워크플로의 노드 번호 | `src/lib/comfy.ts`의 `NODES`                                      |
| **견종·단계별 묘사**      | `20-breed-prompts/*.md` → `npm run prompts:build`                 |
| 원본 사진을 지키는 규칙   | `src/lib/photo-prompt.ts`의 `IDENTITY_RULE`                       |
| 화면 (로딩·결과·에러)     | `src/app/photo-gen.tsx`                                           |

앱이 워크플로에서 덮어쓰는 값은 **세 개뿐**입니다 — 사용자 사진(`LoadImage`),
프롬프트(`Krea2EditGroundedEncode`), seed(`KSampler`). 나머지는 JSON 그대로 갑니다.

### 프롬프트는 문서가 원본입니다

견종별 묘사는 코드가 아니라 **`20-breed-prompts/*.md`** 에 사람이 읽고 고치는 형태로
있습니다. `npm run prompts:build` 가 그걸 파싱해 `src/constants/breed-prompt.ts` 로
찍어냅니다. **생성물이라 직접 고치면 다음 빌드에 날아갑니다.**

실제로 나갈 문장은 이렇게 확인합니다:

```bash
npm run keepsake:prompt -- shiba teen     # 품종 · 단계
npm run keepsake:prompt                   # 인자 없으면 길이 표만
```

> 💡 **배경은 생성하지 않습니다.** 문서에는 장소 묘사("창가 나무 바닥")가 있지만 빌드가
> 걷어냅니다 — 우리는 인물과 배경을 올린 사진에서 그대로 가져오기 때문에, 두 곳에서
> 배경을 정하면 서로 싸웁니다.

> ⚠️ 결과 이미지 URL은 **ComfyUI 서버가 켜져 있는 동안만** 유효합니다. 그래서 앱은 URL을
> 들고 있지 않고 **받아서 보관합니다**(웹은 IndexedDB, 폰은 파일). 서버를 꺼도 앨범에는
> 남습니다.

> ⚠️ **폰에서만 걸리는 것**: 안드로이드는 앱의 평문 `http://` 통신을 기본 차단합니다.
> ComfyUI 주소는 https가 될 수 없어서 `app.json` 에 `usesCleartextTraffic` 을 켜 뒀습니다.
> 브라우저와 Expo Go는 이 정책 대상이 아니라서, **설치한 APK에서만** 조용히 실패합니다.
> 이 설정을 지우면 그때 화면에 남는 건 "연결하지 못했어요" 한 줄뿐입니다.

---

## 대화 저장 서버 (server/)

채팅 화면(`src/app/(tabs)/chat.tsx`)은 원래 대화를 화면 상태로만 들고 있어서
새로고침하면 대화가 사라졌습니다. **의도적으로 그 동작은 유지합니다** — 새로고침하면
말풍선은 항상 빈 화면으로 시작합니다. 대신 `server/`에 작은 Node 서버를 하나 두어,
화면엔 안 보여도 캐릭터가 그 전에 무슨 얘기를 나눴는지는 기억하게 합니다 —
**ComfyUI와 같은 성격**입니다. 팀원 노트북에서 로컬로 띄우고, 앱은 그 사설 IP로
붙습니다. 키가 없고, 인증도 없습니다.

- **숏텀 메모리**: 지금 화면에 떠 있는 대화(`messages` state). 새로고침하면 없어집니다.
- **롱텀 메모리**: 메시지를 주고받을 때마다 서버가 그때까지의 대화를 요약 하나로
  압축해 저장합니다. 새로고침 뒤 처음 말을 걸면, 화면엔 아무것도 없어도 이 요약이
  시스템 프롬프트에 끼워져서 캐릭터가 이전 맥락을 이어받습니다.

### 서버 띄우기

```bash
cd server
npm install
cp .env.example .env   # PORT, 요약용 CHAT_* 키 채우기 (CHAT_* 는 비워도 됨 — 요약만 꺼짐)
npm run dev
```

Node **22.5 이상**이 필요합니다(`node:sqlite` 내장 모듈을 씁니다 — 네이티브
DB 애드온이 아니라서 Visual Studio Build Tools 없이도 `npm install`이 됩니다).

### 앱 쪽 설정

`.env.example`을 `.env`로 복사하고 서버 주소를 채우세요 (ComfyUI와 같은 방식).

```bash
EXPO_PUBLIC_MEMORY_URL=http://192.168.0.2:4000
```

**비워두면 저장/복원 없이 지금까지처럼 메모리에만 대화가 남습니다** — 필수 설정이
아니라서, 서버를 아직 안 띄운 팀원도 채팅 화면은 그대로 씁니다.

### 어디를 고치면 되나

| 하고 싶은 것            | 고칠 곳                                         |
| ----------------------- | ----------------------------------------------- |
| 저장/조회 API           | `server/src/index.ts`                           |
| DB 스키마               | `server/src/db.ts`                              |
| 요약 프롬프트           | `server/src/summarize.ts`의 `foldIntoSummary()` |
| 앱이 서버를 부르는 부분 | `src/lib/persona-chat/memory-client.ts`         |
| 기기 익명 ID            | `src/lib/storage.ts`의 `ensureDeviceId()`       |

---

## 배포 (APK 만들기)

설치해서 쓰는 안드로이드 앱을 **EAS 클라우드 빌드**로 만듭니다. 로컬에 안드로이드 SDK를
깔 필요가 없습니다.

```bash
npx eas-cli login                                        # 최초 1회
npx eas-cli build --platform android --profile preview
```

`preview` 프로필은 스토어용 `.aab` 대신 **바로 설치되는 `.apk`** 를 만듭니다
(`eas.json` 참고). 한 번에 **20~40분** 걸리고, 끝나면 다운로드 링크가 나옵니다.

### 발표용 APK — 시연 도구가 들어간 빌드

```bash
npx eas-cli build --platform android --profile demo
```

`preview` 와 같은 APK에 **게임 화면의 [시연 도구](#시연-도구)만 켜둔 것**입니다
(`EXPO_PUBLIC_DEMO_TOOLS=1`). 키도 `preview` 와 같은 EAS 환경
(`environment: "preview"`)에서 가져오므로 따로 등록할 것이 없습니다.

> ⚠️ **배포용은 `preview` 로 구우세요.** `demo` 로 구운 APK를 그대로 나눠주면 쓰는 사람이
> 스탯과 성장을 마음대로 건드릴 수 있습니다.

### 키는 저장소가 아니라 빌드 서버에

`.env` 는 커밋되지 않으므로 클라우드 빌드에는 올라가지 않습니다. **EAS에 따로 등록**해야
그 값이 들어간 APK가 나옵니다.

```bash
npx eas-cli env:create --scope project --name EXPO_PUBLIC_VISION_API_KEY \
  --value "..." --visibility sensitive \
  --environment preview --environment development --type string --force

npx eas-cli env:list --environment preview               # 확인
```

> ⚠️ `sensitive` 는 **대시보드와 빌드 로그에서 가려줄 뿐**, 완성된 APK에서 키를 꺼내는 것은
> 막지 못합니다 ([왜 그런지](#3--api-키--시작-전에-팀에서-정하기)).

### 알아둘 것

- **값은 빌드할 때 박힙니다.** `.env` 나 EAS 변수를 바꿔도 **APK를 다시 굽기 전까지는
  반영되지 않습니다.** 특히 `EXPO_PUBLIC_COMFY_URL` 은 현장에서 서버 IP가 달라지면
  다시 구워야 하니, 발표 당일에는 시간 여유를 두세요.
- **네이티브 모듈을 새로 넣으면** Expo Go에서 되더라도 APK는 다시 구워야 합니다.
- **Expo Go와 APK는 저장 공간이 다릅니다.** Expo Go에서 만든 앨범 사진은 APK에 따라오지
  않습니다. 시연용 사진이 필요하면 APK 안에서 새로 만드세요.

---

## 환경

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · expo-router
Node · npm ([버전은 시작하기](#0-node-버전-확인) 참고)

코드 스타일은 ESLint + Prettier로 통일돼 있습니다 (`.prettierrc`, `eslint.config.js`).
줄바꿈은 `.gitattributes`로 LF 고정 — Windows/Mac 섞여 있어도 diff가 깨지지 않습니다.

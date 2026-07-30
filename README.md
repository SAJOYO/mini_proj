# 동물과 대화하기 — 스타터킷

동물(멍이/나비) 페르소나와 대화하는 챗봇 데모. 백엔드는 Python(FastAPI) + Google Gemini API(무료 티어), 프론트엔드는 React Native(Expo) + TypeScript + NativeWind로 구성되어 있습니다.

> **shadcn/ui에 대해**: shadcn/ui는 웹(React + Tailwind + Radix) 전용 라이브러리라 React Native에서는 그대로 쓸 수 없습니다. 여기서는 RN에서 shadcn과 가장 비슷한 개발 경험을 주는 **NativeWind**(Tailwind 클래스를 RN 컴포넌트에 그대로 쓸 수 있게 해주는 라이브러리)로 스타일링했습니다. 나중에 진짜 shadcn 스타일 컴포넌트가 필요하면 [`react-native-reusables`](https://github.com/founded-labs/react-native-reusables) 추가를 고려하세요.

## 1. 백엔드 실행 (Python)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux
# .env 파일을 열어 GEMINI_API_KEY 값을 채워넣으세요.
# 발급: https://aistudio.google.com/apikey

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

동작 확인:

```bash
curl -X POST http://localhost:8000/api/chat/message ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":\"test\",\"animal_type\":\"dog\",\"message\":\"안녕!\"}"
```

`animal_type`을 `"cat"`으로 바꿔서 나비 말투도 확인해보세요.

> ⚠️ **PowerShell에서 테스트할 때 주의**: `Invoke-RestMethod`(PowerShell 내장 명령)는 응답 헤더에 charset이 없으면 UTF-8 응답을 잘못 해석해서 한글이 깨져 보이는 알려진 버그가 있습니다. 실제 API 응답은 정상이며 (모바일 앱의 `fetch`는 문제 없이 정상 동작), PowerShell에서 확인하려면 위 예시처럼 `curl.exe`(따옴표로 감싸 실제 curl 실행 — PowerShell alias 아님) 또는 Postman/Insomnia를 사용하세요.

> ⚠️ **모델명 관련**: `gemini-2.5-flash`는 신규 발급 키에서 더 이상 사용할 수 없어(`404 NOT_FOUND`), 기본값을 `gemini-flash-latest`(항상 최신 안정 flash 모델을 가리키는 별칭)로 설정해뒀습니다. 만약 이 별칭도 동작하지 않으면, 아래 명령으로 현재 키에서 실제 사용 가능한 모델 목록을 확인 후 `.env`의 `GEMINI_MODEL`을 그 값으로 설정하세요:
> ```bash
> python -c "import os; from dotenv import load_dotenv; load_dotenv(); from google import genai; c = genai.Client(api_key=os.environ['GEMINI_API_KEY']); [print(m.name) for m in c.models.list()]"
> ```

## 2. 모바일 앱 실행 (Expo + React Native + TypeScript)

이 저장소에는 `mobile/` 안에 **소스 코드만** 들어있습니다 (Expo 프로젝트 전체를 새로 생성한 뒤, 이 소스 파일들을 덮어써야 합니다):

```bash
npx create-expo-app@latest mobile-app -t expo-template-blank-typescript
cd mobile-app
npx expo install nativewind tailwindcss react-native-safe-area-context react-native-reanimated

# 아래 파일들을 방금 만든 mobile-app 프로젝트에 이 스타터킷의 mobile/ 폴더 내용으로 덮어쓰세요:
#   App.tsx, global.css, tailwind.config.js, babel.config.js,
#   metro.config.js, nativewind-env.d.ts, src/ (전체)
```

`mobile/src/api/client.ts`에서 `API_BASE_URL`을 실제 개발 PC의 로컬 네트워크 IP로 바꿔주세요 (에뮬레이터/실기기에서 `localhost`는 그 기기 자신을 가리키므로 접속이 안 됩니다):

```ts
const API_BASE_URL = "http://192.168.0.5:8000"; // 본인 PC의 로컬 IP로 교체
```

실행:

```bash
npx expo start
```

## 3. 확인 체크리스트

- [ ] 백엔드가 `http://localhost:8000/health` 요청에 `{"status":"ok"}`를 반환하는지
- [ ] 멍이 선택 후 메시지 전송 시 애교/응원 말투로 답이 오는지
- [ ] 나비 선택 후 메시지 전송 시 츤데레 말투로 답이 오는지 (동물 전환 시 화면 대화 목록은 초기화됨)
- [ ] 같은 동물과 여러 턴 대화했을 때 이전 대화 맥락을 기억하는지 (서버가 최근 20턴을 히스토리로 유지)

## 4. 이번 스타터킷에 포함되지 않은 것 (다음 단계)

- 대화 히스토리 DB 저장 (현재는 서버 메모리에만 저장 — 재시작하면 초기화됨)
- 사용자 로그인/인증
- "닮은 동물 검색" 결과나 "다마고찌 게임" 상태(기분/배고픔 등)와의 실제 연동
- 요청 속도 제한(rate limiting), 스트리밍 응답(타이핑 효과)

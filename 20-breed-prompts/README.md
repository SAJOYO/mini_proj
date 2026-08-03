# 20종 견종 마스코트 프롬프트

견종별 **4단계 성장 이미지**(유아기 · 청소년기 · 청년기 · 노년기)를 생성하기 위한 이미지 프롬프트 모음입니다.
20종 × 4단계 = **총 80개 프롬프트**.

## 파일 구조

각 `*-prompts.md` 파일은 동일한 구성을 따릅니다.

| 섹션 | 내용 |
| --- | --- |
| `Palette` | 견종별 색상 코드 (털 · 코 · 눈 · 아웃라인) |
| `Breed Anchors` | 다른 견종과 절대 섞이면 안 되는 고정 특징 (귀 모양, 털 패턴, 꼬리 등) |
| `Poses Used Here` | 4단계에 배정된 포즈 요약표 |
| `1~4` | 단계별 프롬프트 본문 (` ```text ` 블록 그대로 복사해 사용) |
| `Notes` | 생성 시 주의사항 |

## 사용법

1. 원하는 견종 파일을 엽니다.
2. 단계 섹션의 ` ```text ` 코드 블록을 **그대로** 복사해 이미지 생성 모델에 전달합니다.
   포즈 · 구도 · 시선이 이미 프롬프트 안에 포함되어 있어 별도 수정이 필요 없습니다.
3. 견종을 바꿀 때는 `Breed Anchors` 문구를 섞지 마세요. 특징이 뒤섞이면 다른 견종처럼 보입니다.

## 프롬프트 작성 규칙

- 사람은 **성별 중립**(`a person`, they/them)으로 기술하며, 옷차림 · 헤어스타일 · 외모는 의도적으로 지정하지 않습니다.
  포즈 · 표정 · 강아지와의 접촉만 묘사하고, 얼굴은 프레임 안에 완전히 들어오도록 요구합니다.
- 견종 고유 특징은 대문자로 강조해 모델이 놓치지 않도록 합니다. (예: `DROP ears`, `TRICOLOUR`)

## 견종 목록

| # | 견종 | 파일 |
| --- | --- | --- |
| 1 | 비글 | [beagle-prompts.md](beagle-prompts.md) |
| 2 | 비숑 프리제 | [bichon-frise-prompts.md](bichon-frise-prompts.md) |
| 3 | 보더 콜리 | [border-collie-prompts.md](border-collie-prompts.md) |
| 4 | 치와와 | [chihuahua-prompts.md](chihuahua-prompts.md) |
| 5 | 코커 스패니얼 | [cocker-spaniel-prompts.md](cocker-spaniel-prompts.md) |
| 6 | 닥스훈트 | [dachshund-prompts.md](dachshund-prompts.md) |
| 7 | 프렌치 불독 | [french-bulldog-prompts.md](french-bulldog-prompts.md) |
| 8 | 골든 리트리버 | [golden-retriever-prompts.md](golden-retriever-prompts.md) |
| 9 | 진돗개 | [jindo-prompts.md](jindo-prompts.md) |
| 10 | 래브라도 리트리버 | [labrador-retriever-prompts.md](labrador-retriever-prompts.md) |
| 11 | 말티즈 | [maltese-prompts.md](maltese-prompts.md) |
| 12 | 미니어처 슈나우저 | [miniature-schnauzer-prompts.md](miniature-schnauzer-prompts.md) |
| 13 | 포메라니안 | [pomeranian-prompts.md](pomeranian-prompts.md) |
| 14 | 토이 푸들 | [poodle-prompts.md](poodle-prompts.md) |
| 15 | 사모예드 | [samoyed-prompts.md](samoyed-prompts.md) |
| 16 | 시바 이누 | [shiba-inu-prompts.md](shiba-inu-prompts.md) |
| 17 | 시츄 | [shih-tzu-prompts.md](shih-tzu-prompts.md) |
| 18 | 시베리안 허스키 | [siberian-husky-prompts.md](siberian-husky-prompts.md) |
| 19 | 펨브로크 웰시 코기 | [welsh-corgi-prompts.md](welsh-corgi-prompts.md) |
| 20 | 요크셔 테리어 | [yorkshire-terrier-prompts.md](yorkshire-terrier-prompts.md) |

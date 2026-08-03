# 견종 마스코트 프롬프트

견종별 **4단계 성장 이미지**(유아기 · 청소년기 · 청년기 · 노년기)를 생성하기 위한 이미지 프롬프트 모음입니다.
25종 × 4단계 = **총 100개 프롬프트**.

> **이 폴더는 문서이면서 동시에 코드의 입력입니다.**
> 여기를 고치고 `npm run prompts:build`를 돌리면 `src/constants/breed-prompt.ts`가 다시 만들어지고,
> 앱이 기념 사진을 만들 때 실제로 그 문장을 씁니다. 예전처럼 읽기용 문서가 아닙니다.

## 파일 구조

각 `*-prompts.md` 파일은 동일한 구성을 따릅니다. **구성을 바꾸면 빌드가 멈춥니다** —
`scripts/build-breed-prompts.ts`가 아래 형식을 그대로 읽습니다.

| 섹션 | 내용 | 코드에서 |
| --- | --- | --- |
| `Palette` | 견종별 색상 코드 (털 · 코 · 눈 · 아웃라인) | 사람이 볼 요약. 실제로 쓰이는 건 각 단계 마지막 줄 |
| `Breed Anchors` | 다른 견종과 절대 섞이면 안 되는 고정 특징 | `anchors` — 프롬프트 끝에 다시 붙습니다 |
| `Poses Used Here` | 4단계에 배정된 포즈 요약표 | 안 씁니다 (사람이 볼 표) |
| `1~4` | 단계별 프롬프트 본문 | 아래 "무엇이 쓰이고 무엇이 버려지는가" 참고 |
| `Notes` | 생성 시 주의사항 | 안 씁니다 |

포즈 열 종류는 [pose-library.txt](pose-library.txt)에 있습니다. 단계별로 쓸 수 있는 포즈가 정해져 있습니다.

## 무엇이 쓰이고 무엇이 버려지는가

단계 본문의 ` ```text ` 블록은 네 문단(일부는 다섯 문단)으로 되어 있고, 빌드는 그중 일부만 가져갑니다.

| 문단 | 예 | |
| --- | --- | --- |
| 그림체 첫 줄 | `35mm film-look vector composited in.` | **씀** — 25종 100단계가 전부 같아야 합니다 |
| 장소 | "창가 나무 바닥에 앉은 사람, 커튼 너머 아침 햇살…" | 버림 |
| 프레이밍 | "둘 다 프레임 안에, 얼굴이 잘리지 않게…" | 버림 |
| `GAZE` | 시선 규칙 | **씀** — 역시 전부 같아야 합니다 |
| `THE DOG:` 이후 | 대상 · 자세 · 생김새 · 색 | **씀** |
| `COMPOSITION:` | 세로 인물 크롭 지시 (9개 단계에만) | 버림 |

장소와 프레이밍을 버리는 이유는 앱이 **사용자가 올린 사진에서 인물과 배경을 그대로 가져오기** 때문입니다.
문서가 배경을 정하고 사진도 배경을 갖고 있으면 둘이 싸웁니다.
원본 사진을 지키는 규칙은 `src/lib/photo-prompt.ts`의 `IDENTITY_RULE` 한 곳에만 있습니다.

버려지는 문단도 지우지 마세요. 문서를 사람이 통째로 복사해 ComfyUI에 붙여넣어 시험할 때 필요합니다.

## 고치는 법

```bash
# 1. 마크다운을 고친다
# 2. 다시 찍어낸다
npm run prompts:build

# 3. 실제로 넘어갈 문장을 눈으로 확인한다
npm run keepsake:prompt                  # 전 품종 × 전 단계 길이 요약
npm run keepsake:prompt -- beagle        # 비글 4단계 전문
npm run keepsake:prompt -- beagle young  # 한 장만
```

`src/constants/breed-prompt.ts`는 **생성 파일입니다.** 거기를 고치면 다음 빌드에서 지워집니다.

## 프롬프트 작성 규칙

- 사람은 **성별 중립**(`a person`, they/them)으로 기술하며, 옷차림 · 헤어스타일 · 외모는 의도적으로 지정하지 않습니다.
  포즈 · 표정 · 강아지와의 접촉만 묘사합니다.
- 견종 고유 특징은 대문자로 강조해 모델이 놓치지 않도록 합니다. (예: `DROP ears`, `TRICOLOUR`)
- 자세 문단은 반드시 `unposed.` 로 끝냅니다. 빌드가 이 단어로 자세와 생김새를 가릅니다.
- 색 지정은 반드시 마지막 한 문장이고 `outline #XXXXXX.` 로 끝납니다.
- 그림체 첫 줄과 `GAZE` 블록은 **모든 파일에서 한 글자도 다르면 안 됩니다.**
  네 장이 한 앨범에 나란히 놓이는데 그림체가 갈리면 성장 기록이 아니라 서로 다른 그림 네 장이 됩니다.
  다르면 빌드가 멈추고 어느 파일인지 알려줍니다.

## 견종 목록

`BREEDS`(`src/constants/pet.ts`)에 있는 18종이 번들에 들어갑니다.

| # | 견종 | `BreedId` | 파일 |
| --- | --- | --- | --- |
| 1 | 기본 (믹스) | `neutral` | [neutral-prompts.md](neutral-prompts.md) |
| 2 | 시바견 | `shiba` | [shiba-inu-prompts.md](shiba-inu-prompts.md) |
| 3 | 골든 리트리버 | `retriever` | [golden-retriever-prompts.md](golden-retriever-prompts.md) |
| 4 | 닥스훈트 | `dachshund` | [dachshund-prompts.md](dachshund-prompts.md) |
| 5 | 토이 푸들 | `poodle` | [poodle-prompts.md](poodle-prompts.md) |
| 6 | 비글 | `beagle` | [beagle-prompts.md](beagle-prompts.md) |
| 7 | 시츄 | `shihtzu` | [shih-tzu-prompts.md](shih-tzu-prompts.md) |
| 8 | 말티즈 | `maltese` | [maltese-prompts.md](maltese-prompts.md) |
| 9 | 펨브로크 웰시 코기 | `corgi` | [welsh-corgi-prompts.md](welsh-corgi-prompts.md) |
| 10 | 치와와 | `chihuahua` | [chihuahua-prompts.md](chihuahua-prompts.md) |
| 11 | 비숑 프리제 | `bichon` | [bichon-frise-prompts.md](bichon-frise-prompts.md) |
| 12 | 도베르만 | `doberman` | [doberman-prompts.md](doberman-prompts.md) |
| 13 | 요크셔 테리어 | `yorkshire` | [yorkshire-terrier-prompts.md](yorkshire-terrier-prompts.md) |
| 14 | 포인터 | `pointer` | [pointer-prompts.md](pointer-prompts.md) |
| 15 | 그레이하운드 | `greyhound` | [greyhound-prompts.md](greyhound-prompts.md) |
| 16 | 카발리에 | `cavalier` | [cavalier-prompts.md](cavalier-prompts.md) |
| 17 | 진돗개 | `jindo` | [jindo-prompts.md](jindo-prompts.md) |
| 18 | 포메라니안 | `pomeranian` | [pomeranian-prompts.md](pomeranian-prompts.md) |

### 아직 `BREEDS`에 없는 7종

문서만 있고 코드에는 없습니다. **번들에 들어가지 않습니다.**
`src/constants/pet.ts`의 `BREEDS`에 프리셋을 추가하고 `scripts/build-breed-prompts.ts`의 `DOC_OF`에 한 줄 더하면 그때부터 쓰입니다.

[border-collie](border-collie-prompts.md) ·
[cocker-spaniel](cocker-spaniel-prompts.md) ·
[french-bulldog](french-bulldog-prompts.md) ·
[labrador-retriever](labrador-retriever-prompts.md) ·
[miniature-schnauzer](miniature-schnauzer-prompts.md) ·
[samoyed](samoyed-prompts.md) ·
[siberian-husky](siberian-husky-prompts.md)

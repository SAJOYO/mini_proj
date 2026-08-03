/**
 * 성장 기념 사진 프롬프트.
 *
 * 게임 쪽이 "누가, 어떤 모습이었는지"를 문장 하나로 만들어 사진 생성 쪽에
 * 넘깁니다. 이 파일에는 **화면이 없습니다** — 표와 순수 함수만 있습니다.
 * (게임 규칙이 lib/game.ts에 모여 있는 것과 같은 이유입니다)
 *
 * ## 문장은 어디서 오는가
 *
 * 견종별 묘사는 여기서 쓰지 않습니다. `20-breed-prompts/*.md`에 사람이 읽고
 * 고치는 원본이 있고, `npm run prompts:build`가 그것을 constants/breed-prompt.ts로
 * 찍어냅니다. 이 파일은 찍혀 나온 조각을 **순서대로 붙이기만** 합니다.
 *
 *   BREED_ART_STYLE  그림체 한 줄        (100개 단계 공통)
 *   IDENTITY_RULE    무엇을 지키고 무엇을 그릴지  ← 여기서만 씁니다
 *   BREED_GAZE       시선 규칙            (100개 단계 공통)
 *   stages[stage]    subject / pose / look / palette
 *   anchors          품종 고정 특징을 끝에서 한 번 더
 *
 * ## 왜 단계별로 문장이 다른가
 *
 * 캐릭터는 이미지가 아니라 SVG로 그리는데, 단계별 생김새는 constants/pet.ts의
 * LIFE_STAGES가 비율로 정합니다(아기는 머리 1.22배·발 1.5배, 노년은 털이
 * 희끗해지고 눈이 흐려짐). 생성 쪽은 그 SVG를 보지 못하므로, 같은 내용을
 * 말로 옮겨줘야 화면 속 캐릭터와 사진 속 캐릭터가 같은 아이로 보입니다.
 * 넘어가는 이미지는 사용자 사진 한 장뿐입니다 — 아바타는 문장으로만 갑니다.
 *
 * ## 왜 배경을 지정하지 않는가
 *
 * 마크다운 원본에는 단계마다 장소가 적혀 있습니다("창가 나무 바닥", "공원
 * 잔디"). 그건 인물까지 처음부터 그리는 전제로 쓰인 문장이고, 우리는 사용자
 * 사진에서 인물과 배경을 그대로 가져옵니다. 두 곳에서 배경을 정하면 서로
 * 싸우므로 빌드 스크립트가 장소·프레이밍 문단을 걷어냅니다.
 *
 * ## 왜 영문인가
 *
 * 원본 프롬프트가 영문으로 쓰이고 다듬어졌습니다. 품종 이름도 문서의
 * subject("a Beagle puppy")에 이미 들어 있어서 BREEDS[breed].label이 필요
 * 없습니다. 앨범에 얹는 caption만 한국어로 남습니다 — 그건 모델에 넘어가지
 * 않고 화면에만 쓰입니다.
 */

import { BREED_ART_STYLE, BREED_GAZE, BREED_PROMPTS } from '@/constants/breed-prompt';
import type { BreedId } from '@/constants/pet';
import type { StageId } from '@/lib/game';

/** 사진 생성 쪽에 넘길 한 세트. */
export type KeepsakePrompt = {
  /** 생성 모델에 그대로 넣을 문장. */
  prompt: string;
  /** 사진에 얹을 한 줄. 앨범에서 언제 찍은 것인지 알아보게 합니다. */
  caption: string;
};

/**
 * 원본 사진에서 무엇을 지키고, 무엇을 새로 그릴지.
 *
 * 이 한 문단이 기념 사진과 "강아지 그림"을 가릅니다. 빼면 모델이 인물까지
 * 새로 그려서 남의 얼굴이 나옵니다.
 *
 * 마크다운의 프레이밍 문단을 대신합니다. 원본은 "얼굴이 잘리지 않게 넓게
 * 잡아라"까지 지시하는데, 그건 구도를 처음부터 정할 때 쓰는 말입니다.
 * 여기서는 구도를 원본 사진에서 받아오므로 **무엇이 바뀌면 안 되는지**만
 * 말합니다.
 */
const IDENTITY_RULE = [
  'Keep the person from the source photo. Their face, hair, build and clothing',
  'come from that photo and must stay recognisably the same person, in the same',
  'setting and the same light. Do not restyle them and do not replace the',
  'background. The dog is the only thing added to the picture.',
  'Square 1:1 crop. Both the person and the dog are fully inside the frame, both',
  "in sharp focus on the same focal plane, physically touching or within arm's",
  'reach - this is a photo of the two of them, not a dog photo with someone in',
  'the background.',
].join(' ');

/**
 * 사진에 남길 한 줄.
 *
 * 기념 사진은 **떠나온 단계**를 기록합니다(성장한 직후에 찍으니까요).
 * 그래서 "마지막 날"입니다. 노년기만 다음 단계가 없어서 표현이 다릅니다.
 */
const STAGE_CAPTION: Record<StageId, string> = {
  baby: '영유아기의 마지막 날',
  teen: '청소년기의 마지막 날',
  young: '청년기의 마지막 날',
  elder: '노년기의 어느 날',
};

/**
 * 성장 기념 사진 한 장을 만들 프롬프트.
 *
 * 사진에는 **사용자가 올린 사진 속 인물과 그 단계의 캐릭터가 함께** 담깁니다.
 * 사진 자체(photoUri)는 이 함수가 다루지 않습니다 — 문장만 만들고, 원본
 * 이미지는 생성 쪽에 따로 넘깁니다.
 */
export function buildKeepsakePrompt(breed: BreedId, stage: StageId): KeepsakePrompt {
  const { anchors, stages } = BREED_PROMPTS[breed];
  const { subject, pose, look, palette } = stages[stage];

  return {
    prompt: [
      BREED_ART_STYLE,
      IDENTITY_RULE,
      BREED_GAZE,
      // 문서와 같은 순서: 무엇인지 → 어떤 자세인지 → 어떻게 생겼는지 → 무슨 색인지.
      [`THE DOG: ${subject}`, pose, look, palette].join('\n'),
      // 앵커는 look 안에 이미 녹아 있지만, 문서의 Notes가 권하는 대로 끝에서
      // 한 번 더 못을 박습니다. 이게 빠지면 무늬가 다른 견종과 섞입니다.
      [
        "BREED ANCHORS - keep every one of these, never substitute another breed's wording:",
        ...anchors.map((a) => `- ${a}`),
      ].join('\n'),
    ].join('\n\n'),
    caption: STAGE_CAPTION[stage],
  };
}

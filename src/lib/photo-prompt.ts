/**
 * 성장 기념 사진 프롬프트.
 *
 * 게임 쪽이 "누가, 어떤 모습이었는지"를 문장 하나로 만들어 사진 생성 쪽에
 * 넘깁니다. 이 파일에는 **화면이 없습니다** — 표와 순수 함수만 있습니다.
 * (게임 규칙이 lib/game.ts에 모여 있는 것과 같은 이유입니다)
 *
 * ## 왜 단계별로 문장이 다른가
 *
 * 캐릭터는 이미지가 아니라 SVG로 그리는데, 단계별 생김새는 constants/pet.ts의
 * LIFE_STAGES가 비율로 정합니다(아기는 머리 1.22배·발 1.5배, 노년은 털이
 * 희끗해지고 눈이 흐려짐). 생성 쪽은 그 SVG를 보지 못하므로, 같은 내용을
 * 말로 옮겨줘야 화면 속 캐릭터와 사진 속 캐릭터가 같은 아이로 보입니다.
 *
 * ## 왜 스타일 문구는 한 곳에 있는가
 *
 * 네 장이 앨범에 나란히 놓입니다. 단계마다 그림체가 달라지면 성장 기록이
 * 아니라 서로 다른 그림 네 장이 됩니다. 그래서 **달라지는 것(생김새·자세)과
 * 고정되는 것(그림체·조명·구도)을 갈라 두고**, 고정 쪽은 KEEPSAKE_STYLE
 * 하나만 고치면 네 장이 같이 바뀌게 했습니다.
 *
 * ## 한국어로 쓴 이유
 *
 * 품종 이름을 BREEDS[breed].label에서 그대로 가져다 쓰기 때문입니다.
 * 생성 쪽에서 영문 프롬프트가 필요하면 constants/pet.ts의 BreedPreset에 영문
 * 이름을 한 줄 추가하고 아래 breedLabel 자리만 바꾸면 됩니다 — 문장 구조는
 * 그대로 둬도 됩니다.
 */

import { BREEDS, type BreedId } from '@/constants/pet';
import type { StageId } from '@/lib/game';
import { objectParticle } from '@/lib/korean';

/** 사진 생성 쪽에 넘길 한 세트. */
export type KeepsakePrompt = {
  /** 생성 모델에 그대로 넣을 문장. */
  prompt: string;
  /** 사진에 얹을 한 줄. 앨범에서 언제 찍은 것인지 알아보게 합니다. */
  caption: string;
};

/**
 * 네 장이 공유하는 그림체·조명·구도.
 *
 * 여기를 바꾸면 네 단계가 **같이** 바뀝니다. 한 단계만 다르게 하고 싶어지면
 * 그건 대개 STAGE_LOOK의 look/pose에 넣어야 할 내용입니다.
 */
const KEEPSAKE_STYLE = [
  '부드러운 파스텔 톤의 손그림 스타일',
  '따뜻한 실내 조명',
  '배경은 단순하게',
  '정사각형 구도',
].join(', ');

type StageLook = {
  /** 그 단계의 생김새. LIFE_STAGES가 실제로 그리는 비율을 말로 옮긴 것입니다. */
  look: string;
  /** 그 단계다운 자세와 거리감. 아기는 안기고, 노년은 기대옵니다. */
  pose: string;
  /**
   * 사진에 남길 한 줄.
   *
   * 기념 사진은 **떠나온 단계**를 기록합니다(성장한 직후에 찍으니까요).
   * 그래서 "마지막 날"입니다. 노년기만 다음 단계가 없어서 표현이 다릅니다.
   */
  caption: string;
};

const STAGE_LOOK: Record<StageId, StageLook> = {
  baby: {
    look: '머리가 몸보다 크고 발이 큼직한 아기, 귀는 작게 접혀 있고 눈은 아직 반쯤 뜬',
    pose: '품에 폭 안겨 조심스럽게 카메라를 바라보는',
    caption: '영유아기의 마지막 날',
  },
  teen: {
    look: '몸은 거의 다 컸는데 귀와 발만 먼저 커서 비율이 어정쩡한',
    pose: '옆에 바싹 붙어 앉아 장난기 어린 표정을 짓는',
    caption: '청소년기의 마지막 날',
  },
  young: {
    look: '다 자라 균형 잡힌 몸에 털에 윤기가 도는',
    pose: '나란히 서서 든든하게 카메라를 마주 보는',
    caption: '청년기의 마지막 날',
  },
  elder: {
    look: '주둥이와 눈가에 흰 털이 섞이고 귀가 살짝 처진, 눈빛이 부드럽게 흐려진',
    pose: '무릎에 머리를 기대고 눈을 반쯤 감은',
    caption: '노년기의 어느 날',
  },
};

/**
 * 성장 기념 사진 한 장을 만들 프롬프트.
 *
 * 사진에는 **사용자가 올린 사진 속 인물과 그 단계의 캐릭터가 함께** 담깁니다.
 * 사진 자체(photoUri)는 이 함수가 다루지 않습니다 — 문장만 만들고, 원본
 * 이미지는 생성 쪽에 따로 넘깁니다.
 */
export function buildKeepsakePrompt(breed: BreedId, stage: StageId): KeepsakePrompt {
  const look = STAGE_LOOK[stage];
  const breedLabel = BREEDS[breed].label;

  return {
    prompt: [
      // 품종은 실행 중에 정해지므로 조사를 하드코딩하면 "도베르만를"이 됩니다.
      `${breedLabel}${objectParticle(breedLabel)} 캐릭터로 그린 ${look.look} 반려동물이,`,
      `함께 올린 사진 속 인물과 ${look.pose} 기념 사진.`,
      '인물의 얼굴과 분위기는 원본 사진을 따르고, 반려동물만 캐릭터로 그립니다.',
      KEEPSAKE_STYLE + '.',
    ].join(' '),
    caption: look.caption,
  };
}

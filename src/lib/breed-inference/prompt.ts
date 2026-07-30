import { BREEDS } from '@/constants/pet';
import { INFERABLE_BREED_IDS } from '@/lib/breed-inference/types';

export const BREED_INFERENCE_PROMPT_VERSION = '1';

const breedOptions = INFERABLE_BREED_IDS.map((id) => `- ${id} (${BREEDS[id].label})`).join('\n');

/**
 * 사진을 품종 비율로 바꾸는 유도 프롬프트.
 *
 * temperature는 모델별 호환성이 달라 요청 옵션에서 사용하지 않습니다.
 * confidence나 설명도 받지 않습니다. 이 단계의 계약은 오직 `BreedMix`입니다.
 */
export const BREED_INFERENCE_PROMPT = `첨부된 사용자 사진을 보고, 아래 품종 집합 중 시각적으로 닮은 품종의 혼합 비율을 계산하라.

이 작업은 엔터테인먼트용 반려동물 캐릭터와 챗봇 페르소나 생성에 사용된다.
정답을 맞히는 분류 작업이 아니므로 한 품종으로 단정할 필요가 없다.
사진에서 직접 보이는 시각적 특징과 전체적인 인상을 종합하라.
사용자의 실제 성격, 지능, 건강 상태나 민감한 특성은 추론하지 마라.

[품종 집합]
${breedOptions}

[출력 규칙]
- 위 집합의 품종 ID만 사용한다.
- 닮은 순서대로 정확히 3개를 고른다. 1순위만 뚜렷하고 나머지가 약해도
  순위를 매겨 3개를 채운다. 닮음이 약한 품종은 ratio를 낮게 주면 된다.
- 같은 품종을 중복하지 않는다.
- ratio는 양의 수이며 모든 ratio의 합은 정확히 100이다.
- confidence, 근거 설명, 추가 문장을 출력하지 않는다.
- 제공된 JSON 스키마에 맞는 객체만 출력한다.`;

/** 공급자 구조화 출력 기능에 전달할 JSON Schema. */
export const BREED_MIX_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['mix'],
  properties: {
    mix: {
      type: 'array',
      // 3개를 요구합니다. 2개에서 멈추면 조합 폭이 좁아지고, 3순위가 사진마다
      // 갈리는 만큼 개인화가 넓어집니다. 비율은 모델이 정하므로 닮음이 약한
      // 3순위는 저절로 작은 지분을 받습니다.
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['breed', 'ratio'],
        properties: {
          breed: {
            type: 'string',
            enum: INFERABLE_BREED_IDS,
          },
          ratio: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
        },
      },
    },
  },
};

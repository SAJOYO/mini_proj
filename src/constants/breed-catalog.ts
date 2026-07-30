import type { BreedId } from '@/constants/pet';

/** 사진 기반 닮은 품종 추론에서 실제 후보로 사용하는 품종. */
export type InferableBreedId = Exclude<BreedId, 'neutral'>;

export type BreedDescriptor = {
  readonly id: InferableBreedId;
  readonly label: string;
  /**
   * 사람 사진과 비교할 때 참고할 시각적 특징.
   *
   * 성격값은 여기에 넣지 않습니다. LLM은 외형만 보고 비율을 만들고,
   * 성격은 `persona.ts`가 결정해야 두 단계가 서로 오염되지 않습니다.
   */
  readonly visualDescription: string;
};

/**
 * LLM이 고를 수 있는 품종 집합.
 *
 * `neutral`은 추론 실패 시 애플리케이션이 선택하는 fallback이라 후보에서 제외합니다.
 */
export const BREED_CATALOG = [
  {
    id: 'shiba',
    label: '시바견',
    visualDescription: '각이 살아 있는 얼굴 윤곽, 가늘고 날렵한 눈매, 단정하고 또렷한 인상',
  },
  {
    id: 'retriever',
    label: '골든 리트리버',
    visualDescription: '넓고 부드러운 얼굴 윤곽, 편안한 눈매, 자연스럽게 밝아 보이는 표정',
  },
  {
    id: 'dachshund',
    label: '닥스훈트',
    visualDescription: '세로로 긴 얼굴형, 도드라진 코와 입 주변, 집중한 듯 선명한 표정',
  },
  {
    id: 'poodle',
    label: '푸들',
    visualDescription: '타원형 얼굴, 섬세하고 모인 이목구비, 곡선적이고 정돈된 인상',
  },
  {
    id: 'beagle',
    label: '비글',
    visualDescription: '둥글고 큰 눈, 균형 잡힌 얼굴, 표정 변화가 크고 생동감 있는 인상',
  },
  {
    id: 'shihtzu',
    label: '시츄',
    visualDescription: '짧고 둥근 얼굴, 중앙에 모인 이목구비, 크고 선명한 눈',
  },
  {
    id: 'maltese',
    label: '말티즈',
    visualDescription: '작고 갸름한 얼굴, 크고 맑은 눈, 가늘고 섬세한 이목구비',
  },
  {
    id: 'corgi',
    label: '웰시코기',
    visualDescription: '가로로 넓은 얼굴과 볼, 또렷한 눈매, 입꼬리가 살아 있는 밝은 표정',
  },
] as const satisfies readonly BreedDescriptor[];

export const INFERABLE_BREED_IDS = BREED_CATALOG.map(({ id }) => id) as InferableBreedId[];

/**
 * 성격 계약(contract).
 *
 * 닮은 동물 검색이 내놓은 품종 혼합 비율을 받아, 그 캐릭터가 "어떤 애인가"를 서술합니다.
 *
 *   닮은 동물 검색 → 품종 혼합 비율(`BreedMix`)을 만들어 넘깁니다.
 *   이 모듈       → 비율을 성격 축으로 환산하고, 특성과 아키타입을 붙입니다.
 *   대사 / 애니메이션 → 나온 성격을 읽고, 각자 말투와 동작을 정합니다.
 *
 * ── 안이 세 파일로 나뉜 이유 ─────────────────────────────
 *   axes.ts        조정 지점 ① — 축의 이름·경계·특성
 *   presets.ts     조정 지점 ② — 품종별 수치
 *   synthesize.ts  기계 — 위 둘을 읽어 PersonaCard 를 만드는 계산
 *
 * 수치를 조정하러 온 사람이 계산 코드를 헤치지 않아도 되게 데이터와 기계를
 * 갈랐습니다. 밖에서는 이 파일(`@/lib/persona`) 하나만 import 하세요 —
 * 내부 배치가 바뀌어도 호출부는 안 바뀝니다.
 *
 * ── 이 모듈이 하지 않는 일 ──────────────────────────────
 * 여기 있는 축은 전부 "성향"만 말합니다. 행동을 지시하지 않습니다.
 *   - 대사를 몇 자로 쓸지, 언제 침묵할지  → 대사 담당이 정합니다.
 *   - 어떤 동작을 얼마나 자주 재생할지    → 애니메이션 담당이 정합니다.
 *   - 밥을 얼마나 빨리 배고파할지         → 게임 상태 시스템이 정합니다.
 *
 * 그래서 이 모듈의 출력에는 말투 규칙도, 동작 목록도, 금지사항도 없습니다.
 * `axes`와 `bands`를 읽고 각자 자기 영역에서 해석하세요.
 * 행동 축이 필요해지면 담당자와 합의한 뒤 `axes.ts`에 추가하면 됩니다.
 *
 * `pet.ts`(생김새)와는 분리돼 있습니다. 겉모습과 성격은 **같은 품종**을
 * 기준점으로 삼습니다 — 사용자가 판정 결과 화면에서 고른 그 품종입니다
 * (`anchorMix`가 그 품종을 혼합의 맨 앞으로 올립니다).
 * 나머지 품종은 겉모습에는 안 나타나고, 성격만 지분만큼 끌어당깁니다.
 */

export {
  AXES,
  AXIS_KEYS,
  BANDS,
  bandOf,
  traitOf,
  type Axes,
  type AxisKey,
  type Band,
} from '@/lib/persona/axes';
export { BREED_AXES } from '@/lib/persona/presets';
export {
  DEFAULT_MIX,
  anchorMix,
  dominantBreed,
  resolveMix,
  synthesize,
  synthesizeBreed,
  type BreedMix,
  type PersonaCard,
} from '@/lib/persona/synthesize';

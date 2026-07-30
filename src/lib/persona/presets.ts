import { type BreedId } from '@/constants/pet';
import { AXES, AXIS_KEYS, type Axes } from '@/lib/persona/axes';

/**
 * 품종별 성격 프리셋 — 조정 지점 ②.
 *
 * "이 품종은 어떤 성향인가"의 수치가 이 파일의 전부입니다. 값을 고치고
 * 싶으면 여기만 열면 됩니다. 수치가 어떻게 성격으로 변하는지는
 * `synthesize.ts`가 갖습니다.
 *
 * `Partial`인 게 중요합니다. 축을 새로 추가해도 여기가 컴파일 에러를 내지 않고,
 * 값을 안 적은 축은 `AXES`의 `default`로 조용히 돌아갑니다.
 * (전부 필수로 잡으면 축 하나 늘릴 때마다 전 품종을 고쳐야 해서, 결국 안 고치게 됩니다.)
 *
 * ── 값을 고칠 때 조심할 것 ─────────────────────────────────
 * 축을 여러 개 두는 이유는 서로 다른 걸 재기 위해서입니다. 그런데 "친근한 개"를
 * 떠올리며 값을 채우면 여러 축이 한 덩어리로 움직여서, 축은 여러 개인데 실제로는
 * 하나인 상태가 됩니다. 예전 프리셋이 그랬습니다(애정표현과 독립성이 r = -0.92).
 *
 * 특히 애착과 표현은 **일부러 어긋나게** 배치했습니다. 둘이 붙어 있으면
 * "곁에 있고 싶은데 티는 안 내는" 캐릭터가 아예 나올 수 없습니다.
 *
 *               표현 낮음        표현 높음
 *   애착 높음   닥스훈트         리트리버 · 말티즈
 *   애착 낮음   시바             비글
 *
 * 값을 조정할 땐 네 칸이 계속 차 있는지 확인하세요.
 *
 * ⚠️ 알려진 빚: 예민함과 낙천성이 r = -0.72 로 묶여 있습니다. 둘을 어긋나게
 * 배치한 품종이 푸들 하나뿐이라 "예민한데 밝은" 캐릭터가 사실상 안 나옵니다.
 * 값을 조정할 때 이 쌍도 위 4칸 표처럼 흩어주는 게 다음 과제입니다.
 */
export const BREED_AXES: Record<BreedId, Partial<Axes>> = {
  // 모든 품종의 원점. 전부 기본값(50)으로 둡니다.
  neutral: {},

  // 애착 낮음 · 표현 낮음 — 무심한 독립러
  shiba: { attachment: 15, expression: 20, sensitivity: 50, curiosity: 60, optimism: 55 },

  // 애착 높음 · 표현 높음 — 껌딱지 애교쟁이
  retriever: { attachment: 88, expression: 92, sensitivity: 25, curiosity: 70, optimism: 95 },

  // 애착 높음 · 표현 낮음 — 츤데레. 주인에게 집착하면서도 고집이 세고 티를 안 냅니다
  dachshund: { attachment: 72, expression: 30, sensitivity: 70, curiosity: 88, optimism: 68 },

  // 예민한데 밝습니다. 예민함과 낙천성이 한 덩어리로 묶이지 않게 하는 축입니다
  poodle: { attachment: 62, expression: 65, sensitivity: 85, curiosity: 82, optimism: 82 },

  // 애착 낮음 · 표현 높음 — 사람은 좋아하는데 냄새 따라 가버립니다
  beagle: { attachment: 35, expression: 90, sensitivity: 20, curiosity: 95, optimism: 88 },

  shihtzu: { attachment: 80, expression: 58, sensitivity: 45, curiosity: 30, optimism: 80 },

  // 붙고 표현도 하는데 예민하고 잘 시무룩해집니다
  maltese: { attachment: 95, expression: 85, sensitivity: 92, curiosity: 40, optimism: 40 },

  corgi: { attachment: 55, expression: 78, sensitivity: 35, curiosity: 88, optimism: 82 },

  // 작고 겁 많고 주인에게 집착합니다. 예민함이 제일 높은 품종
  chihuahua: { attachment: 92, expression: 70, sensitivity: 95, curiosity: 35, optimism: 45 },

  bichon: { attachment: 78, expression: 92, sensitivity: 55, curiosity: 50, optimism: 88 },

  // 애착 높음 · 표현 낮음 — 주인에게는 붙지만 살갑지 않은 경비견
  doberman: { attachment: 78, expression: 25, sensitivity: 72, curiosity: 58, optimism: 55 },

  // 작지만 대담하고 자기 주장이 셉니다
  yorkshire: { attachment: 65, expression: 85, sensitivity: 68, curiosity: 80, optimism: 62 },

  // 애착 낮음 · 표현 낮음 — 뛸 때만 폭발하고 평소엔 조용합니다
  greyhound: { attachment: 40, expression: 22, sensitivity: 65, curiosity: 45, optimism: 60 },

  // ── 아래 셋은 초안입니다 ──────────────────────────────────
  // TODO(장유빈·임승현): 게임 파트가 가진 품종에 맞추려고 제가(홍가연) 넣은
  // 값입니다. 성격 수치는 두 분 영역이니 검토하고 고쳐주세요.
  // 위 4칸 표(애착 × 표현)가 계속 차 있도록 자리를 골랐고, 파일 위에 적힌
  // "예민함과 낙천성이 묶여 있다"는 빚도 조금 갚아보려 했습니다.

  // 애착 높음 · 표현 낮음. 한 사람에게만 깊게 붙는데 티를 안 냅니다.
  // 같은 칸의 닥스훈트·도베르만과 달리 불안해서 그런 게 아니라 자기 확신이
  // 강해서 그렇습니다 (그래서 예민함이 낮습니다).
  jindo: { attachment: 88, expression: 18, sensitivity: 42, curiosity: 68, optimism: 58 },

  // 애착 중간 · 표현 최고. 작은 몸에 자기 주장이 크고 소리로 다 표현합니다.
  // 예민함(82)과 낙천성(80)이 둘 다 높습니다 — 지금까지 푸들 혼자 맡던
  // "예민한데 밝은" 자리를 같이 채웁니다.
  pomeranian: { attachment: 58, expression: 95, sensitivity: 82, curiosity: 85, optimism: 80 },

  // 애착 최고 · 표현 중상. 곁에 있는 것 자체가 목적인 품종이라
  // 호기심이 가장 낮습니다. 비숑과 달리 들뜨기보다 차분하게 붙어 있습니다.
  cavalier: { attachment: 93, expression: 68, sensitivity: 62, curiosity: 38, optimism: 80 },
};

/** 프리셋에 빠진 축을 기본값으로 채워서 완전한 축 묶음을 만듭니다. */
export function axesOf(breed: BreedId): Axes {
  const partial = BREED_AXES[breed];
  const out = {} as Axes;
  for (const key of AXIS_KEYS) {
    out[key] = partial[key] ?? AXES[key].default;
  }
  return out;
}

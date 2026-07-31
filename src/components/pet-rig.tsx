import { useEffect, useId, useState, type ReactNode } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Platform } from 'react-native';
import { Circle, ClipPath, Defs, Ellipse, G, Path, Rect, Svg } from 'react-native-svg';

import {
  NEUTRAL_STAGE,
  type AnimationName,
  type BreedPreset,
  type StageModifier,
} from '@/constants/pet';

/**
 * 반려동물 리그(rig) — 부위별로 쪼갠 캐릭터 구조.
 *
 * 통짜 그림이 아니라 머리·귀·주둥이·몸통·다리·꼬리를 각각 <G>로 나누고
 * 부모-자식으로 묶었습니다. 부모 transform이 자식에게 자동으로 전파되므로,
 * 고개를 갸웃하면 귀·눈·코가 같이 따라옵니다.
 *
 * 두 가지 입력을 받습니다.
 *   - preset: 품종. "어떻게 생겼는지" (귀 각도, 주둥이 길이, 털색…)
 *   - animation: 동작. "지금 어떻게 움직이는지"
 *
 * 품종이 늘어도 애니메이션은 그대로 돕니다. 반대로 애니메이션이 늘어도
 * 품종 프리셋은 손댈 필요가 없습니다. 이 분리가 리그를 쓰는 이유입니다.
 *
 * 움직임은 react-native-reanimated가 담당합니다. 회전·이동·크기 같은
 * 연속 변화는 shared value로 UI 스레드에서 돌고, 눈 깜빡임이나 입 모양처럼
 * 띄엄띄엄 바뀌는 건 일반 state로 둡니다(초당 몇 번뿐이라 부담이 없습니다).
 *
 * 좌표계는 200x200 고정이고, 바깥에서 size로 확대/축소합니다.
 */

const AnimatedG = Animated.createAnimatedComponent(G);

/**
 * 움직임을 어떤 형태로 넘길지 가르는 값. 아래 useAnimatedProps 주석 참고.
 *
 * 워크릿(UI 스레드에서 도는 함수) 안에서 읽으므로 **상수여야 합니다.**
 * Platform.OS를 워크릿 안에서 직접 부르지 않고 여기서 한 번만 꺼내 둡니다.
 */
const WEB = Platform.OS === 'web';

/**
 * 애니메이션이 그룹에 넘기는 값의 형태.
 *
 * 웹은 transform 문자열 하나, 네이티브는 개별 prop을 씁니다. 둘을 한 타입에
 * 담아 두어야 플랫폼 분기가 있는 채로도 타입이 잡힙니다.
 */
type RigProps = {
  transform?: string;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: number;
  originY?: number;
};

/* ------------------------------------------------------------------ *
 * 자세(pose) — 애니메이션이 오가는 값들
 * ------------------------------------------------------------------ */

export type PetPose = {
  /** 몸 전체 위아래 이동(px). 음수가 위 */
  bodyLift: number;
  /** 몸통 세로 눌림. 1 = 기본, 0.94 = 납작 */
  bodySquash: number;
  /** 고개 갸웃 각도(도). 양수가 오른쪽 */
  headTilt: number;
  /** 귀 펄럭임. 품종 각도에 더해지는 값(도) */
  earFlap: number;
  /** 꼬리 흔들기 각도(도) */
  tailWag: number;
  /** 주둥이 위아래 흔들림(px). 씹는 동작에 씁니다 */
  muzzleBob: number;
  /** 눈 뜬 정도. 0 = 완전히 감음, 1 = 활짝 */
  eyeOpen: number;
  /** 입 벌린 정도. 0 = 다뭄, 1 = 활짝 */
  mouthOpen: number;
};

/** 아무 동작도 없을 때의 기본 자세. */
export const REST_POSE: PetPose = {
  bodyLift: 0,
  bodySquash: 1,
  headTilt: 0,
  earFlap: 0,
  tailWag: 0,
  muzzleBob: 0,
  eyeOpen: 1,
  mouthOpen: 0,
};

/* ------------------------------------------------------------------ *
 * 동작 정의
 * ------------------------------------------------------------------ */

/** [시작값, 끝값, 편도 시간(ms)] — 이 둘 사이를 계속 왕복합니다. */
type Channel = readonly [from: number, to: number, ms: number];

/** 동작이 바뀔 때 눈·입이 새 값으로 옮겨가는 데 걸리는 시간(ms). */
const FACE_BLEND_MS = 220;

/** 얼굴 보간을 갱신하는 간격(ms). 눈·입은 형태가 단순해서 이 정도면 부드럽습니다. */
const FACE_BLEND_STEP_MS = 32;

/**
 * 동작이 바뀔 때 눈·입을 곧바로 갈아끼우지 않고 잠깐에 걸쳐 옮깁니다.
 *
 * 움직이는 부위(고개·꼬리·귀…)는 shared value라 새 동작으로 자연스럽게
 * 이어지는데, **눈 뜬 정도와 입 벌린 정도는 SVG path를 다시 만드는 값이라
 * 일반 state입니다.** 그대로 두면 동작을 바꾸는 순간 눈과 입이 한 프레임에
 * 팍 바뀝니다. 평소에는 동작이 거의 안 바뀌어서 티가 안 났지만, 대기 동작을
 * 번갈아 트는 지금은 몇 초마다 이 튐이 반복됩니다.
 *
 * 깜빡임은 여기를 거치지 않습니다 — 눈 깜빡임은 원래 순간적인 동작이라
 * 부드럽게 만들면 오히려 졸린 것처럼 보입니다.
 */
function useBlended(target: number): number {
  const [value, setValue] = useState(target);

  useEffect(() => {
    if (value === target) return;

    const from = value;
    const startedAt = Date.now();

    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - startedAt) / FACE_BLEND_MS);
      // ease-out — 처음엔 빠르게 움직이고 끝에서 부드럽게 붙습니다.
      setValue(from + (target - from) * (1 - (1 - t) * (1 - t)));
      if (t >= 1) clearInterval(timer);
    }, FACE_BLEND_STEP_MS);

    return () => clearInterval(timer);
    // value를 의존성에 넣으면 한 스텝마다 effect가 새로 돌아 보간이 처음부터
    // 다시 시작합니다. 목표값이 바뀔 때만 새로 걸어야 합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

type MotionSpec = {
  bodyLift?: Channel;
  bodySquash?: Channel;
  headTilt?: Channel;
  earFlap?: Channel;
  tailWag?: Channel;
  muzzleBob?: Channel;
  /**
   * 왕복하지 않고 동작 내내 고정인 값들. 다만 **동작이 바뀔 때는** 곧바로
   * 갈아끼우지 않고 잠깐에 걸쳐 옮겨갑니다 (useBlended 참고).
   */
  eyeOpen: number;
  mouthOpen: number;
  /** 가끔 눈을 깜빡입니다. 자거나 아플 땐 끕니다. */
  blink?: boolean;
};

/**
 * 동작별 움직임.
 *
 * 새 동작을 추가할 땐 constants/pet.ts의 ANIMATION_NAMES와 여기 둘 다 채우세요.
 * 여기 값은 전부 "부위를 얼마나 움직일지"일 뿐, 품종은 전혀 모릅니다.
 * 그래서 닥스훈트든 푸들이든 같은 동작이 그대로 돕니다.
 */
const MOTION: Record<AnimationName, MotionSpec> = {
  // 평상시 — 숨 쉬듯 아주 느리게
  breathe: {
    bodyLift: [0, -4, 1500],
    bodySquash: [1, 0.975, 1500],
    eyeOpen: 1,
    mouthOpen: 0,
    blink: true,
  },
  // 두리번 — 고개를 좌우로
  lookAround: {
    headTilt: [-13, 13, 950],
    earFlap: [-5, 7, 950],
    eyeOpen: 1,
    mouthOpen: 0,
    blink: true,
  },
  // 오물오물 — 주둥이를 빠르게
  chew: {
    muzzleBob: [0, 4, 180],
    headTilt: [-2.5, 2.5, 360],
    eyeOpen: 1,
    mouthOpen: 0.55,
    blink: true,
  },
  // 하품 — 입을 크게 벌린 채 느리게
  yawn: {
    bodyLift: [0, -3, 1700],
    headTilt: [0, 7, 1700],
    eyeOpen: 0.25,
    mouthOpen: 1,
  },
  // 수면 — 거의 안 움직임
  sleep: {
    bodyLift: [2, 6, 2600],
    bodySquash: [0.97, 0.94, 2600],
    earFlap: [10, 14, 2600],
    eyeOpen: 0,
    mouthOpen: 0,
  },
  // 신남 — 꼬리를 빠르게, 몸도 들썩
  wagTail: {
    tailWag: [-32, 10, 240],
    bodyLift: [0, -5, 480],
    eyeOpen: 1,
    mouthOpen: 0.5,
    blink: true,
  },
  /*
   * 쓰다듬김 — 꼬리만 느긋하게.
   *
   * wagTail과 일부러 갈라놨습니다. 저쪽은 입을 벌리고 240ms로 파닥이는
   * 고에너지 동작이라 "신난다!"로 읽히는데, 쓰다듬기는 흥분이 아니라
   * 만족·나른함입니다(PAT_REACTIONS의 "골골골...", "눈을 감고 있어요").
   * 노년기 대사에는 아예 "천천히 꼬리를 흔들어요"가 있어서, 빠른 쪽을
   * 재사용하면 글과 그림이 어긋납니다.
   *
   * 그래서 폭은 절반, 속도는 절반 이하, 입은 다물고 눈만 살짝 감깁니다.
   */
  wagSlow: {
    tailWag: [-18, 6, 420],
    bodyLift: [0, -2, 900],
    eyeOpen: 0.8,
    mouthOpen: 0,
    blink: true,
  },
  // 아픔 — 축 처진 채 아주 느리게
  droop: {
    bodyLift: [5, 7, 2800],
    earFlap: [26, 31, 2800],
    eyeOpen: 0.45,
    mouthOpen: 0,
  },
};

/* ------------------------------------------------------------------ *
 * 앵커(anchor) — 각 부위가 회전할 때 축이 되는 점
 *
 * 이 좌표를 옮기면 동작의 느낌이 통째로 바뀝니다.
 * 예: 귀 앵커를 귀 한가운데로 옮기면 펄럭이는 대신 프로펠러처럼 돕니다.
 * ------------------------------------------------------------------ */

const VIEW = 200;

const ANCHOR = {
  /** 목 — 머리 전체가 여기를 축으로 갸웃합니다 */
  neck: { x: 100, y: 118 },
  head: { x: 100, y: 84 },
  earLeft: { x: 71, y: 56 },
  earRight: { x: 129, y: 56 },
  body: { x: 100, y: 154 },
  /** 엉덩이 — 꼬리가 여기를 축으로 흔들립니다 */
  tail: { x: 146, y: 164 },
} as const;

/* ------------------------------------------------------------------ *
 * 컴포넌트
 * ------------------------------------------------------------------ */

export type PetRigProps = {
  preset: BreedPreset;
  /**
   * 생애 단계 보정. 품종 위에 나이에 따른 형태 변화를 얹습니다.
   * 없으면 다 큰 청년(무보정)으로 그립니다.
   */
  stage?: StageModifier;
  /** 한 변 길이(px). 내부 좌표계는 200x200으로 고정입니다. */
  size: number;
  /** 재생할 동작. 계속 반복됩니다. */
  animation?: AnimationName;
  /**
   * 고정 자세. 주면 animation을 무시하고 그 모양으로 멈춥니다.
   * 개발 미리보기에서 자세 하나하나를 뜯어볼 때 씁니다.
   */
  pose?: Partial<PetPose>;
};

export function PetRig({ preset, stage = NEUTRAL_STAGE, size, animation, pose }: PetRigProps) {
  const spec = animation ? MOTION[animation] : null;
  const frozen = pose ? { ...REST_POSE, ...pose } : null;

  const bodyLift = useSharedValue(0);
  const bodySquash = useSharedValue(1);
  const headTilt = useSharedValue(0);
  const earFlap = useSharedValue(0);
  const tailWag = useSharedValue(0);
  const muzzleBob = useSharedValue(0);

  // 동작이 바뀌면 모든 채널을 새로 겁니다.
  useEffect(() => {
    const channels: [SharedValue<number>, Channel | undefined, number, number][] = [
      [bodyLift, spec?.bodyLift, REST_POSE.bodyLift, frozen?.bodyLift ?? REST_POSE.bodyLift],
      [
        bodySquash,
        spec?.bodySquash,
        REST_POSE.bodySquash,
        frozen?.bodySquash ?? REST_POSE.bodySquash,
      ],
      [headTilt, spec?.headTilt, REST_POSE.headTilt, frozen?.headTilt ?? REST_POSE.headTilt],
      [earFlap, spec?.earFlap, REST_POSE.earFlap, frozen?.earFlap ?? REST_POSE.earFlap],
      [tailWag, spec?.tailWag, REST_POSE.tailWag, frozen?.tailWag ?? REST_POSE.tailWag],
      [muzzleBob, spec?.muzzleBob, REST_POSE.muzzleBob, frozen?.muzzleBob ?? REST_POSE.muzzleBob],
    ];

    for (const [sv, channel, rest, still] of channels) {
      cancelAnimation(sv);

      // 고정 자세가 있으면 그 값으로 멈춥니다.
      if (frozen) {
        sv.value = still;
        continue;
      }
      // 이 동작이 건드리지 않는 부위는 기본값 그대로.
      if (!channel) {
        sv.value = rest;
        continue;
      }
      sv.value = channel[0];
      sv.value = withRepeat(
        withTiming(channel[1], { duration: channel[2], easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }

    return () => {
      for (const [sv] of channels) cancelAnimation(sv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation, pose]);

  // 눈 깜빡임 — 연속 애니메이션이 아니라 가끔 한 번이라 state로 충분합니다.
  // 끌 때 state를 되돌리지 않고, 아래 eyeOpen 계산에서 blinkEnabled로 걸러냅니다.
  // (effect 본문에서 setState를 부르면 렌더가 연쇄로 도는 걸 막는 린트 규칙에 걸립니다)
  const blinkEnabled = !frozen && !!spec?.blink;
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    if (!blinkEnabled) return;

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(
        () => {
          setBlinking(true);
          timer = setTimeout(() => {
            setBlinking(false);
            schedule();
          }, 130);
        },
        2200 + Math.random() * 2800,
      );
    };
    schedule();
    return () => clearTimeout(timer);
  }, [blinkEnabled, animation, pose]);

  // 노년일수록 털이 희끗해집니다. 회색 쪽으로 살짝 섞되, 품종 색이
  // 알아볼 수 없을 만큼 지우지는 않습니다.
  const fur = fade(preset.furColor, stage.furFade);
  // 탄 포인트 — 주둥이·가슴·발. 지정이 없으면 예전처럼 털색을 밝혀 씁니다.
  const point = preset.pointColor ? fade(preset.pointColor, stage.furFade) : null;
  const pale = point ?? shade(fur, 45);
  // 무늬는 털색과 확실히 구분돼야 합니다. 살짝만 어둡게 하면
  // 무늬가 아니라 때 묻은 자국처럼 보입니다.
  const patch = shade(fur, -88);

  // 얼굴·귀는 따로 색을 가질 수 있습니다(비글: 몸 흰색 / 머리 갈색).
  // faceColor가 없으면 몸과 같은 색이라, 대부분 품종은 아래 값들이 위와 같습니다.
  const faceFur = fade(preset.faceColor ?? preset.furColor, stage.furFade);
  const faceInner = shade(faceFur, -55);
  const facePale = point ?? shade(faceFur, 45);
  const facePatch = shade(faceFur, -88);

  // 외곽선은 캐릭터 전체가 한 색이어야 합니다. 얼굴색과 몸색에서 각각 선을 뽑으면
  // 비글처럼 명도 차가 큰 품종에서 "진한 갈색 머리 + 연회색 몸"이 되어, 머리만
  // 따로 오려 붙인 것처럼 보입니다. 둘 중 진한 쪽으로 통일합니다.
  const line = darkerOf(shade(fur, -105), shade(faceFur, -105));
  const faceLine = line;
  // 노년은 눈동자가 뿌옇게 흐려집니다. 외곽선 색을 회청색 쪽으로 섞습니다.
  const eyeColor = mix(faceLine, '#8FA0A6', stage.eyeCloudiness);
  const curly = preset.furTexture === 'curly';
  const longHair = preset.furTexture === 'long';

  // 곱슬 품종이라도 **곧게 선 귀**는 뾰족한 삼각으로 둡니다.
  // 선 귀의 모양은 털이 아니라 연골이 잡는 것이라, 털이 아무리 복슬복슬해도
  // 실루엣은 뾰족합니다. 포메라니안이 여기 해당하는데, 둥근 덩어리로 그렸더니
  // 쫑긋한 귀가 사라져 곰인형이 됐습니다. 늘어진 귀(푸들)만 덩어리로 갑니다.
  const blobEar = curly && preset.earAngle > 90;

  // 품종·단계 숫자를 실제 치수로 변환
  const bodyScale = stage.bodyScale;
  const bodyRx = (44 + (preset.bodyRatio - 1) * 10) * bodyScale;
  const bodyRy = 42 * bodyScale;
  const muzzleRy = 17 * preset.snoutLength;
  const muzzleCy = 104 + (preset.snoutLength - 1) * 7;

  // 발은 아기·청소년일수록 유난히 큽니다. 바닥선(≈199)을 유지하도록
  // 커진 만큼 중심을 위로 올려, 발이 뷰박스 밖으로 삐져나가지 않게 합니다.
  const pawRx = 12 * stage.pawScale;
  const pawRy = 10 * stage.pawScale;
  const pawCy = 199 - pawRy;
  // 두 발 간격. 발이 커지면 같이 벌려야 서로 겹치지 않습니다.
  // (아기는 발이 1.5배라 간격이 고정이면 두 발이 포개집니다.)
  const pawGap = pawRx + 3;
  const legW = pawRx * 1.05;
  const legTop = ANCHOR.body.y + 14 * bodyScale;

  // 뒷다리 허벅지 — 앉은 자세에서 몸통 옆구리 아래로 불룩 나오는 덩어리.
  // 강아지가 네 발 동물로 보이느냐는 거의 전부 이 형태에 달려 있습니다.
  const haunchCx = bodyRx * 0.7;
  const haunchRx = bodyRx * 0.41;
  const haunchRy = bodyRy * 0.46;
  const haunchCy = ANCHOR.body.y + bodyRy * 0.5;

  // 귀는 품종 각도에 단계 처짐을 더하고, 길이에 단계 배율을 곱합니다.
  // (아기는 품종과 무관하게 귀가 작고 쳐지고, 노년은 살짝 처집니다.)
  const earAngle = Math.max(0, Math.min(170, preset.earAngle + stage.earDroop));
  const earLength = preset.earLength * stage.earScale;

  // 귀 끝 뭉툭함 — 늘어진 귀일수록 끝이 동그래집니다(닥스훈트·리트리버·비글).
  // 품종의 원래 각도로 판단합니다. 아기 때 귀가 처진다고 끝 모양까지
  // 바뀌지는 않으므로 stage.earDroop이 더해진 값을 쓰면 안 됩니다.
  const earTipRound = Math.min(1, Math.max(0, (preset.earAngle - 95) / 55)) * 0.8;

  // 머리 크기 배율. 아기는 머리가 커서 뽀짝합니다. 머리 중심을 축으로
  // 귀·눈·주둥이까지 통째로 키우거나 줄입니다.
  // 품종의 머리 크기는 단계 배율에 곱해서 그룹 transform에 태웁니다.
  // 그래야 눈·주둥이·귀까지 같이 커져서 "얼굴이 크다"로 읽힙니다.
  // 머리통 도형만 키우면 이목구비가 한가운데 몰려 이상해집니다.
  const headScale = stage.headScale * (preset.headSize ?? 1);

  // 머리 가로/세로. headRatio가 1이면 완전한 원입니다.
  const headRx = 48;
  const headRy = headRx / (preset.headRatio ?? 48 / 42);

  // 동작이 바뀌면 이 두 값이 잠깐에 걸쳐 옮겨갑니다(useBlended 설명 참고).
  const blendedEye = useBlended(frozen?.eyeOpen ?? spec?.eyeOpen ?? REST_POSE.eyeOpen);
  const blendedMouth = useBlended(frozen?.mouthOpen ?? spec?.mouthOpen ?? REST_POSE.mouthOpen);

  const rawEyeOpen = blinkEnabled && blinking ? 0 : blendedEye;
  // 아기는 눈을 다 못 뜨고, 노년은 눈이 조금 처집니다. 단계별 최대치로 눌러줍니다.
  const eyeOpen = Math.min(rawEyeOpen, stage.eyeOpenMax);
  const mouthOpen = blendedMouth;

  // 움직임을 넘기는 방법이 **플랫폼마다 다릅니다.** 여기만 갈라져 있고 나머지
  // 그리기 코드는 공통입니다.
  //
  // ## 웹 — SVG transform 문자열
  //
  // `<g transform="rotate(10, 40, 50)">`는 표준 SVG라 브라우저가 그대로 읽습니다.
  // react-native-svg의 rotation·scaleX·originX 같은 개별 prop을 쓰면 DOM 속성으로
  // 새어 나가 React 경고가 납니다(`scaleX`를 모른다, `transform-origin`이 잘못됐다).
  //
  // ## 네이티브 — react-native-svg 전용 prop
  //
  // 같은 문자열을 네이티브에 넘기면 **빨간 에러로 죽습니다**(이슈 #19).
  // Reanimated가 `transform`이라는 이름을 가로채 RN 스타일 배열
  // ([{ rotate: '10deg' }])로 해석하려 들기 때문입니다. 문자열이 오면
  // invalidTransform 판정을 내리고, 그 경고를 띄우려다 UI 스레드에서 JS 함수를
  // 부르면서 앱이 멈춥니다.
  //
  // 즉 `transform`은 웹(SVG 속성)과 네이티브(RN 스타일 키)에서 **서로 다른 것을
  // 가리키는 이름**입니다. 한쪽으로 통일할 수 없어서 갈라 둡니다.
  // 의존성 배열([])을 명시하는 이유 — 아래처럼 삼항으로 감싸면 Reanimated의
  // Babel 플러그인이 워크릿을 정적으로 찾지 못해 웹에서 에러가 납니다.
  // 값은 전부 shared value(참조가 고정)나 상수라 빈 배열로 충분합니다.
  //
  // 워크릿(UI 스레드에서 도는 함수) **안에서** WEB을 읽으면 안 됩니다.
  // 모듈 스코프 변수는 워크릿에 딸려가지 않아서 "WEB is not defined"로 죽습니다.
  // 그래서 분기를 바깥에 두고, 플랫폼에 맞는 함수 자체를 골라 넘깁니다.
  // 각 함수에 'worklet' 지시자를 직접 답니다. Reanimated의 Babel 플러그인은
  // 훅에 **인라인으로 바로 넘긴** 함수만 자동으로 워크릿으로 바꿔줍니다.
  // 아래처럼 삼항으로 감싸면 그 자동 변환이 일어나지 않아, 일반 JS 함수가
  // UI 스레드에서 불리면서 "Tried to synchronously call a Remote Function"으로
  // 죽습니다. 지시자를 달면 위치와 무관하게 워크릿이 됩니다.
  const rootProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return { transform: `translate(0, ${bodyLift.value})` };
        }
      : () => {
          'worklet';
          return { y: bodyLift.value };
        },
    [],
  );
  // 몸통은 세로로만 눌렸다 펴집니다. 기준점을 몸통에 두어 발이 바닥에 붙어 있게 합니다.
  const bodyProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return {
            transform: `translate(${ANCHOR.body.x}, ${ANCHOR.body.y}) scale(1, ${bodySquash.value}) translate(${-ANCHOR.body.x}, ${-ANCHOR.body.y})`,
          };
        }
      : () => {
          'worklet';
          return {
            scaleX: 1,
            scaleY: bodySquash.value,
            originX: ANCHOR.body.x,
            originY: ANCHOR.body.y,
          };
        },
    [],
  );
  const headProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return { transform: `rotate(${headTilt.value}, ${ANCHOR.neck.x}, ${ANCHOR.neck.y})` };
        }
      : () => {
          'worklet';
          return { rotation: headTilt.value, originX: ANCHOR.neck.x, originY: ANCHOR.neck.y };
        },
    [],
  );
  const tailProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return { transform: `rotate(${tailWag.value}, ${ANCHOR.tail.x}, ${ANCHOR.tail.y})` };
        }
      : () => {
          'worklet';
          return { rotation: tailWag.value, originX: ANCHOR.tail.x, originY: ANCHOR.tail.y };
        },
    [],
  );
  const muzzleProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return { transform: `translate(0, ${muzzleBob.value})` };
        }
      : () => {
          'worklet';
          return { y: muzzleBob.value };
        },
    [],
  );
  const earLeftProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return {
            transform: `rotate(${-(earAngle + earFlap.value)}, ${ANCHOR.earLeft.x}, ${ANCHOR.earLeft.y})`,
          };
        }
      : () => {
          'worklet';
          return {
            rotation: -(earAngle + earFlap.value),
            originX: ANCHOR.earLeft.x,
            originY: ANCHOR.earLeft.y,
          };
        },
    [earAngle],
  );
  const earRightProps = useAnimatedProps<RigProps>(
    WEB
      ? () => {
          'worklet';
          return {
            transform: `rotate(${earAngle + earFlap.value}, ${ANCHOR.earRight.x}, ${ANCHOR.earRight.y})`,
          };
        }
      : () => {
          'worklet';
          return {
            rotation: earAngle + earFlap.value,
            originX: ANCHOR.earRight.x,
            originY: ANCHOR.earRight.y,
          };
        },
    [earAngle],
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      {/* 몸 전체 — 호흡할 때 위아래로 움직이는 최상위 그룹 */}
      <AnimatedG animatedProps={rootProps}>
        {/* 꼬리: 몸통보다 먼저 그려서 뒤로 보냅니다.
            꼬리는 채워진 도형이 아니라 굵은 획이라, 다른 부위처럼 stroke를 줄 수
            없습니다. 대신 더 굵은 획을 외곽선 색으로 한 겹 깔고 그 위에 털색 획을
            얹으면, 삐져나온 만큼이 테두리로 보입니다. 몸통 stroke가 5(=바깥 2.5)
            이므로 18+5로 두께를 맞춰 같은 굵기의 선이 되게 했습니다.
            말티즈·비숑처럼 털이 연한 품종은 이 선이 없으면 방 배경에 묻힙니다. */}
        <AnimatedG animatedProps={tailProps}>
          <Path
            d={tailPath(preset.tailCurl, preset.tailLength)}
            stroke={line}
            strokeWidth={23}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={tailPath(preset.tailCurl, preset.tailLength)}
            stroke={fur}
            strokeWidth={18}
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* 몸통 */}
        <AnimatedG animatedProps={bodyProps}>
          {/* 뒷다리 허벅지 — 몸통보다 먼저 그려서 옆구리 밖으로 살짝만 내밉니다.
              몸통 위에 얹으면 붙여 놓은 혹처럼 보입니다. */}
          <Ellipse
            cx={ANCHOR.body.x - haunchCx}
            cy={haunchCy}
            rx={haunchRx}
            ry={haunchRy}
            fill={fur}
            stroke={line}
            strokeWidth={5}
          />
          <Ellipse
            cx={ANCHOR.body.x + haunchCx}
            cy={haunchCy}
            rx={haunchRx}
            ry={haunchRy}
            fill={fur}
            stroke={line}
            strokeWidth={5}
          />
          <Blob
            cx={ANCHOR.body.x}
            cy={ANCHOR.body.y}
            rx={bodyRx}
            ry={bodyRy}
            curly={curly}
            bumps={16}
            amp={4.5}
            fill={fur}
            stroke={line}
            strokeWidth={5}
          />

          {/* 등 안장 — 몸통 윗부분만 덮습니다. 가슴털보다 먼저 그려서
              가슴·배는 바탕색으로 남습니다. 요크셔의 회색 등, 비글의 검은 등이
              전부 이 구조입니다. 앉아서 정면을 보는 자세라 어깨 위로만 보입니다. */}
          {preset.saddleColor && (
            <ClippedTo
              shape={
                <Blob
                  cx={ANCHOR.body.x}
                  cy={ANCHOR.body.y}
                  rx={bodyRx}
                  ry={bodyRy}
                  curly={curly}
                  bumps={16}
                  amp={4.5}
                  fill="#000"
                />
              }>
              {/* 아래 끝이 몸통 한가운데쯤에서 끊기게 잡습니다. 더 내려오면
                  등판이 아니라 앞가슴을 덮어서 턱시도 조끼처럼 보입니다.
                  가로로는 몸통보다 넓혀 옆구리까지 감싸야 등에서 흘러내린 색이 됩니다. */}
              <Ellipse
                cx={ANCHOR.body.x}
                cy={ANCHOR.body.y - bodyRy * 0.72}
                rx={bodyRx * 1.25}
                ry={bodyRy * 0.78}
                fill={fade(preset.saddleColor, stage.furFade)}
              />
            </ClippedTo>
          )}

          {/* 가슴 털 */}
          <Blob
            cx={100}
            cy={162}
            rx={20 * bodyScale}
            ry={26 * bodyScale}
            curly={curly}
            bumps={10}
            amp={3}
            fill={pale}
          />
          <BodyPattern
            pattern={preset.furPattern}
            tone={patch}
            cx={ANCHOR.body.x}
            cy={ANCHOR.body.y}
            rx={bodyRx}
            ry={bodyRy}
            curly={curly}
          />
        </AnimatedG>

        {/* 앞다리 — 앉은 자세라 가슴 '앞'에서 곧게 내려옵니다. 그래서 몸통보다 뒤에
            그리면 안 됩니다. 발만 몸통 밑에 붙여 두면 두 발로 선 것처럼 보입니다. */}
        {[ANCHOR.body.x - pawGap, ANCHOR.body.x + pawGap].map((cx) => (
          <G key={cx}>
            <Rect
              x={cx - legW / 2}
              y={legTop}
              width={legW}
              height={Math.max(0, pawCy - legTop)}
              rx={legW / 2}
              fill={fur}
              stroke={line}
              strokeWidth={4}
            />
            <Ellipse
              cx={cx}
              cy={pawCy}
              rx={pawRx}
              ry={pawRy}
              fill={pale}
              stroke={line}
              strokeWidth={4}
            />
          </G>
        ))}

        {/* 머리 — 목을 축으로 갸웃합니다. 귀·눈·코가 전부 이 안에 있습니다. */}
        <AnimatedG animatedProps={headProps}>
          {/* 단계별 머리 크기 — 머리 중심을 축으로 얼굴 전체를 키우거나 줄입니다.
              (아기는 머리가 크고, 청소년은 살짝 작습니다.) */}
          <G
            transform={`translate(${ANCHOR.head.x}, ${ANCHOR.head.y}) scale(${headScale}) translate(${-ANCHOR.head.x}, ${-ANCHOR.head.y})`}>
            {/* 귀: 머리보다 먼저 그려서 뒤로 보냅니다.
                earLength가 0이면 아예 안 그립니다. 둥글게 미용해서 귀가 털에
                완전히 파묻힌 비숑처럼, 귀가 안 보이는 게 정확한 품종이 있습니다. */}
            {earLength > 0 && (
              <>
                <Ear
                  anchor={ANCHOR.earLeft}
                  animatedProps={earLeftProps}
                  length={earLength}
                  curly={blobEar}
                  longHair={longHair}
                  outerSide={-1}
                  tipRound={earTipRound}
                  fur={faceFur}
                  line={faceLine}
                  inner={faceInner}
                />
                <Ear
                  anchor={ANCHOR.earRight}
                  animatedProps={earRightProps}
                  length={earLength}
                  curly={blobEar}
                  longHair={longHair}
                  outerSide={1}
                  tipRound={earTipRound}
                  fur={faceFur}
                  line={faceLine}
                  inner={faceInner}
                />
              </>
            )}

            {/* 머리통 — 보통은 세로보다 가로가 살짝 넓어야 강아지로 읽힙니다.
                headRatio가 1인 품종(둥글게 미용한 비숑)만 완전한 원이 됩니다. */}
            <Blob
              cx={ANCHOR.head.x}
              cy={ANCHOR.head.y}
              rx={headRx}
              ry={headRy}
              curly={curly}
              bumps={14}
              amp={4.5}
              fill={faceFur}
              stroke={faceLine}
              strokeWidth={5}
            />

            {/* 얼굴 무늬 — 머리통 위, 눈보다 아래 */}
            <FacePattern
              pattern={preset.furPattern}
              tone={facePatch}
              curly={curly}
              rx={headRx}
              ry={headRy}
            />

            {/* 주둥이 묶음 — 씹을 때 이 그룹이 통째로 흔들립니다 */}
            <AnimatedG animatedProps={muzzleProps}>
              <Ellipse
                cx={100}
                cy={muzzleCy}
                rx={28}
                ry={muzzleRy}
                fill={facePale}
                stroke={faceLine}
                strokeWidth={3}
              />
              <Ellipse cx={100} cy={muzzleCy - muzzleRy * 0.5} rx={11} ry={8.5} fill={faceLine} />
              <Path
                d={mouthPath(muzzleCy, muzzleRy, mouthOpen)}
                stroke={faceLine}
                strokeWidth={3.5}
                strokeLinecap="round"
                fill={mouthOpen > 0.15 ? shade(faceFur, -130) : 'none'}
              />
            </AnimatedG>

            {/* 눈 — eyeOpen이 0에 가까우면 감은 선으로 바뀝니다.
                노년은 eyeColor가 뿌옇게 흐려집니다. */}
            <Eye cx={80} cy={78} open={eyeOpen} line={eyeColor} />
            <Eye cx={120} cy={78} open={eyeOpen} line={eyeColor} />
          </G>
        </AnimatedG>
      </AnimatedG>
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * 부위별 조각
 * ------------------------------------------------------------------ */

type EarProps = {
  anchor: { x: number; y: number };
  /** 뿌리를 축으로 한 회전. 품종 각도 + 펄럭임이 이미 합쳐져 있습니다. */
  animatedProps: ReturnType<typeof useAnimatedProps>;
  /** 길이 배율 */
  length: number;
  /** 곱슬 털이면 덥수룩한 덩어리로 그립니다 */
  curly: boolean;
  /** 장모면 귀 바깥쪽 가장자리로 털이 뻗습니다 */
  longHair: boolean;
  /** 이 귀의 바깥쪽 방향. 왼쪽 귀는 -1, 오른쪽 귀는 +1 */
  outerSide: number;
  /** 귀 끝 뭉툭함 0~1. 늘어진 귀일수록 커집니다 */
  tipRound: number;
  fur: string;
  line: string;
  inner: string;
};

/**
 * 귀 하나.
 *
 * 뿌리(anchor)를 축으로 회전합니다.
 * 타원이 아니라 끝이 좁아지는 잎 모양이라, 세워도 늘어뜨려도 강아지 귀로 읽힙니다.
 * (타원으로 하면 곧게 세웠을 때 토끼가 됩니다.)
 */
function Ear({
  anchor,
  animatedProps,
  length,
  curly,
  longHair,
  outerSide,
  tipRound,
  fur,
  line,
  inner,
}: EarProps) {
  // 곱슬 견종은 귀도 덥수룩한 덩어리로 그립니다. 잎 모양을 물결로 만드는 것보다
  // 귀 축을 따라 부풀린 덩어리를 얹는 쪽이 푸들 귀에 가깝습니다.
  const height = 42 * length;

  return (
    <AnimatedG animatedProps={animatedProps}>
      <G transform={`translate(${anchor.x}, ${anchor.y})`}>
        {curly ? (
          <>
            <Path
              d={curlyEllipse(0, -height * 0.5, 15, height * 0.55, 11, 3.5)}
              fill={fur}
              stroke={line}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <Path
              d={curlyEllipse(0, -height * 0.5, 7, height * 0.3, 8, 2)}
              fill={inner}
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            {/* 장모는 귀 윤곽 자체를 톱니로 만듭니다. 귀에 털 뭉치를 따로 얹으면
                귀에 뭔가를 붙여 놓은 것처럼 보이는데, 윤곽을 들쭉날쭉하게 하면
                "이 귀에 털이 길게 났다"로 읽힙니다. 외곽선도 하나로 유지됩니다. */}
            <Path
              d={longHair ? tuftedEarPath(length, outerSide) : earPath(length, 1, tipRound)}
              fill={fur}
              stroke={line}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <Path d={earPath(length * 0.58, 0.5, tipRound)} fill={inner} />
          </>
        )}
      </G>
    </AnimatedG>
  );
}

type BlobProps = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** true면 윤곽이 물결칩니다 */
  curly: boolean;
  /** 곱슬일 때 물결 개수와 깊이 */
  bumps?: number;
  amp?: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
};

/**
 * 몸통·머리처럼 둥근 덩어리 하나.
 * 털 질감에 따라 매끈한 타원이거나 곱슬 윤곽입니다.
 */
function Blob({ cx, cy, rx, ry, curly, bumps = 13, amp = 4, ...paint }: BlobProps) {
  if (!curly) {
    return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} {...paint} />;
  }
  return <Path d={curlyEllipse(cx, cy, rx, ry, bumps, amp)} strokeLinejoin="round" {...paint} />;
}

/** 눈 하나. 뜬 정도에 따라 동그란 눈 ↔ 감은 선으로 바뀝니다. */
function Eye({ cx, cy, open, line }: { cx: number; cy: number; open: number; line: string }) {
  if (open < 0.12) {
    return (
      <Path
        d={`M ${cx - 8} ${cy} Q ${cx} ${cy + 5} ${cx + 8} ${cy}`}
        stroke={line}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={7} ry={7 * open} fill={line} />
      {open > 0.6 && <Circle cx={cx + 2.5} cy={cy - 2.5} r={2.2} fill="#FFFFFF" />}
    </G>
  );
}

/**
 * 무늬를 부위 실루엣 안으로 가둡니다.
 *
 * 무늬는 실루엣과 별개로 놓인 도형이라, 좌표를 아무리 맞춰도 품종(몸통 비율)과
 * 생애 단계(크기 배율) 조합에 따라 언젠가는 밖으로 삐져나옵니다. 좌표를 조금씩
 * 미는 대신 실루엣 자체를 클립으로 씌우면, 어떤 조합이 와도 새어나가지 않습니다.
 */
function ClippedTo({
  shape,
  children,
}: {
  /** 클립으로 쓸 실루엣. 칠할 때와 똑같은 도형이어야 합니다 */
  shape: ReactNode;
  children: ReactNode;
}) {
  const clipId = `mask-${useId()}`;
  return (
    <>
      <Defs>
        <ClipPath id={clipId}>{shape}</ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>{children}</G>
    </>
  );
}

/**
 * 몸통에 얹는 무늬.
 *
 * 얼룩(patch)은 등 위쪽에 붙여서 몸통 윤곽을 타게 그립니다.
 * 몸통 한가운데 띄우면 무늬가 아니라 때 묻은 자국처럼 보입니다.
 */
function BodyPattern({
  pattern,
  tone,
  cx,
  cy,
  rx,
  ry,
  curly,
}: {
  pattern: BreedPreset['furPattern'];
  tone: string;
} & BodyShape) {
  if (pattern === 'solid') return null;
  const shape = (
    <Blob cx={cx} cy={cy} rx={rx} ry={ry} curly={curly} bumps={16} amp={4.5} fill="#000" />
  );

  return (
    <ClippedTo shape={shape}>
      {pattern === 'patch' ? (
        <Ellipse cx={100 - rx * 0.42} cy={132} rx={rx * 0.5} ry={22} fill={tone} opacity={0.85} />
      ) : (
        <G opacity={0.5}>
          <Circle cx={72} cy={140} r={8} fill={tone} />
          <Circle cx={128} cy={152} r={6} fill={tone} />
          <Circle cx={88} cy={176} r={5} fill={tone} />
        </G>
      )}
    </ClippedTo>
  );
}

type BodyShape = { cx: number; cy: number; rx: number; ry: number; curly: boolean };

/**
 * 얼굴 무늬.
 *
 * 한쪽 눈을 덮는 얼룩은 강아지 무늬 중 제일 알아보기 쉽습니다.
 * 머리통 다음, 눈보다 먼저 그려야 눈이 무늬 위에 얹힙니다.
 */
function FacePattern({
  pattern,
  tone,
  curly,
  rx,
  ry,
}: {
  pattern: BreedPreset['furPattern'];
  tone: string;
  curly: boolean;
  /** 머리통과 똑같은 치수여야 클립이 맞습니다 */
  rx: number;
  ry: number;
}) {
  if (pattern !== 'patch') return null;
  const shape = (
    <Blob
      cx={ANCHOR.head.x}
      cy={ANCHOR.head.y}
      rx={rx}
      ry={ry}
      curly={curly}
      bumps={14}
      amp={4.5}
      fill="#000"
    />
  );

  return (
    <ClippedTo shape={shape}>
      <G opacity={0.85}>
        {/* 왼쪽 눈을 덮는 얼룩 */}
        <Ellipse cx={76} cy={74} rx={22} ry={20} fill={tone} />
        {/* 귀 쪽으로 이어지는 부분 */}
        <Ellipse cx={64} cy={60} rx={14} ry={13} fill={tone} />
      </G>
    </ClippedTo>
  );
}

/* ------------------------------------------------------------------ *
 * 계산 유틸
 * ------------------------------------------------------------------ */

/**
 * 곱슬 털 윤곽.
 *
 * 타원 둘레를 bumps개로 나눈 뒤, 각 구간을 바깥으로 부풀린 곡선으로 잇습니다.
 * 결과적으로 구름처럼 물결치는 실루엣이 나옵니다.
 *
 * bumps가 많을수록 잔잔하고, amp가 클수록 덥수룩해집니다.
 */
function curlyEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  bumps: number,
  amp: number,
): string {
  const points: [number, number][] = [];
  for (let i = 0; i < bumps; i++) {
    const angle = (i / bumps) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }

  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < bumps; i++) {
    const [x2, y2] = points[(i + 1) % bumps];
    const [x1, y1] = points[i];
    // 두 점의 중점을 중심 바깥으로 밀어 조절점으로 씁니다.
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const px = mx + (dx / dist) * amp;
    const py = my + (dy / dist) * amp;
    d += ` Q ${px.toFixed(2)} ${py.toFixed(2)} ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  return `${d} Z`;
}

/**
 * 귀 윤곽. 뿌리(0,0)에서 위로 뻗고 끝으로 갈수록 좁아집니다.
 * len = 길이 배율, widthScale = 폭 배율(안쪽 귀를 그릴 때 줄입니다).
 */
function earPath(len: number, widthScale: number, tipRound = 0): string {
  const h = 42 * len;
  const w = 13 * widthScale;

  // 곧게 선 귀 — 끝이 뾰족합니다 (시바·코기·도베르만·요크셔)
  if (tipRound <= 0.02) {
    return [
      `M ${-w} 3`,
      `C ${-w - 2} ${-h * 0.42}, ${-w + 4} ${-h * 0.86}, 0 ${-h}`,
      `C ${w - 4} ${-h * 0.86}, ${w + 2} ${-h * 0.42}, ${w} 3`,
      'Z',
    ].join(' ');
  }

  // 늘어진 귀 — 끝이 동그랗게 뭉툭합니다 (닥스훈트·리트리버·비글).
  // 뾰족한 잎 모양으로 늘어뜨리면 귀가 아니라 늘어진 나뭇잎으로 보입니다.
  const tw = w * tipRound;
  const ty = -h + tw;
  return [
    `M ${-w} 3`,
    `C ${-w - 2} ${-h * 0.42}, ${-tw - 3} ${-h * 0.78}, ${-tw} ${ty}`,
    `A ${tw} ${tw} 0 0 1 ${tw} ${ty}`,
    `C ${tw + 3} ${-h * 0.78}, ${w + 2} ${-h * 0.42}, ${w} 3`,
    'Z',
  ].join(' ');
}

/**
 * 털이 삐쭉삐쭉한 귀 윤곽 (장모용).
 *
 * earPath와 같은 잎 모양·같은 치수인데, 양옆 가장자리만 톱니로 바꿉니다.
 * 뾰족한 점은 바깥으로 밀면서 살짝 위로도 올립니다. 옆으로만 밀면 톱날이
 * 되지만, 위로 같이 올리면 털이 위쪽을 향해 자란 것처럼 보입니다.
 *
 * 뿌리(t=0)와 끝(t=1) 근처는 건드리지 않습니다. 뿌리가 들쭉날쭉하면 머리에
 * 붙은 자리가 지저분해지고, 끝이 갈라지면 귀가 두 갈래로 보입니다.
 */
function tuftedEarPath(len: number, outerSide: number): string {
  const h = 42 * len;
  const w = 13;
  // 끝으로 갈수록 좁아지는 폭. earPath의 잎 모양과 비슷한 곡률입니다.
  const outline = (t: number) => ({
    x: w * (1 - Math.pow(t, 1.7)),
    y: 3 - h * t,
  });

  // 실제 요크셔 귀털은 위가 아니라 **옆으로** 부챗살처럼 뻗습니다.
  // 위로 올리면 뿔이나 가시가 되고, 균일한 간격으로 촘촘히 넣으면 톱날이 됩니다.
  // 그래서 길이와 간격을 일부러 들쭉날쭉하게 두고, 가운데가 가장 길게 합니다.
  // tilt는 세로 방향 기울기(양수가 아래). 0만 쓰면 빗처럼 가지런해집니다.
  // 길이는 외곽선 두께(5)보다 확실히 커야 합니다. 비슷하면 둥근 선 마감에
  // 뾰족한 끝이 먹혀서 털이 아니라 주름·비늘처럼 보입니다. 개수를 줄이는 대신
  // 하나하나를 길게 빼는 쪽이 이 크기에서는 훨씬 털에 가깝습니다.
  const tufts = [
    { t: 0.24, amp: 7, tilt: 0.1 },
    { t: 0.42, amp: 10, tilt: 0.22 },
    { t: 0.6, amp: 9, tilt: 0.32 },
    { t: 0.78, amp: 6, tilt: 0.25 },
  ];

  const edge = (sign: number): string[] => {
    // 안쪽(얼굴 쪽) 가장자리는 매끈하게 둡니다. 양쪽 다 털을 내면 귀가
    // 두 배로 복잡해지는데, 실제로도 얼굴에 닿는 안쪽은 그렇게 안 보입니다.
    if (sign !== outerSide) {
      return [`L ${(sign * outline(0.5).x).toFixed(1)} ${outline(0.5).y.toFixed(1)}`];
    }
    const out: string[] = [];
    for (const { t, amp, tilt } of tufts) {
      // 좌우 대칭 이빨은 톱날로 보입니다. 뿌리 쪽에서 완만히 뻗어 나가고
      // 끝에서 급히 돌아와야 한쪽으로 쓸린 털 가닥처럼 읽힙니다.
      const root = outline(t - 0.085);
      const tip = outline(t);
      const back = outline(t + 0.025);
      const p = (x: number, y: number) => `L ${(sign * x).toFixed(1)} ${y.toFixed(1)}`;
      out.push(p(root.x, root.y));
      out.push(p(tip.x + amp, tip.y + amp * tilt));
      out.push(p(back.x, back.y));
    }
    return out;
  };

  return [
    `M ${-w} 3`,
    ...edge(-1),
    `L 0 ${(-h).toFixed(1)}`,
    ...edge(1).reverse(),
    `L ${w} 3`,
    'Z',
  ].join(' ');
}

/**
 * 꼬리 곡선.
 * curl 0 = 아래로 축 처짐, 1 = 등 위로 완전히 말림.
 * len  1 = 기본 길이, 0.4 = 코기처럼 뭉툭하게 짧음.
 */
function tailPath(curl: number, len: number): string {
  const { x, y } = ANCHOR.tail;
  const cx = 168 + 14 * curl;
  const cy = 184 - 58 * curl;
  const ex = 170 - 20 * curl;
  const ey = 202 - 96 * curl;
  // 길이 배율만큼 조절점과 끝점을 뿌리 쪽으로 당깁니다.
  const pull = (from: number, to: number) => from + (to - from) * len;
  return `M ${x} ${y} Q ${pull(x, cx)} ${pull(y, cy)} ${pull(x, ex)} ${pull(y, ey)}`;
}

/** 입. 다물면 곡선 하나, 벌리면 타원에 가까운 닫힌 path. */
function mouthPath(muzzleCy: number, muzzleRy: number, open: number): string {
  const y = muzzleCy + muzzleRy * 0.25;
  if (open <= 0.15) {
    return `M ${92} ${y} Q ${100} ${y + 6} ${108} ${y}`;
  }
  const h = 4 + 12 * open;
  return `M ${90} ${y} Q ${100} ${y + h} ${110} ${y} Q ${100} ${y + h * 0.35} ${90} ${y} Z`;
}

/**
 * 색 문자열을 [r, g, b]로. `#RRGGBB`와 `rgb(...)`를 모두 받습니다.
 *
 * 두 형식을 다 받는 게 중요합니다. 아래 색 함수들은 서로의 결과를 다시
 * 입력으로 받는데(fade → shade), 여기서 반환하는 건 전부 `rgb(...)`입니다.
 * 한쪽 형식만 파싱하면 두 번째 함수에서 NaN이 되고, 그 뒤로 모든 파생색이
 * 검정으로 무너집니다.
 */
function parseColor(c: string): [number, number, number] {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1), 16);
    if (Number.isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+/g);
  return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

/**
 * 색을 밝게/어둡게. amount가 음수면 어두워집니다.
 * 품종 색 하나에서 외곽선·귀 안쪽·가슴털 색을 파생시키는 데 씁니다.
 */
function shade(color: string, amount: number): string {
  const [r, g, b] = parseColor(color);
  return `rgb(${clamp255(r + amount)}, ${clamp255(g + amount)}, ${clamp255(b + amount)})`;
}

/** 둘 중 더 어두운 색. 외곽선 색을 하나로 통일할 때 씁니다. */
function darkerOf(a: string, b: string): string {
  const sum = (c: string) => {
    const [r, g, bl] = parseColor(c);
    return r + g + bl;
  };
  return sum(a) <= sum(b) ? a : b;
}

/** 두 색을 t(0~1)만큼 섞습니다. t=0이면 a, t=1이면 b. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  const k = Math.max(0, Math.min(1, t));
  const lerp = (x: number, y: number) => clamp255(x + (y - x) * k);
  return `rgb(${lerp(ar, br)}, ${lerp(ag, bg)}, ${lerp(ab, bb)})`;
}

/**
 * 나이 들며 털이 희끗해지는 정도.
 * amount가 0이면 원래 털색, 1에 가까울수록 흐린 회백색으로 바랩니다.
 * 품종 색이 아예 지워지지 않도록 최대 섞임을 절반 정도로 눌러 둡니다.
 */
function fade(color: string, amount: number): string {
  return mix(color, '#D8D3CA', amount * 0.5);
}

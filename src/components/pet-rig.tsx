import { useEffect, useState } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Circle, Ellipse, G, Path, Svg } from 'react-native-svg';

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

type MotionSpec = {
  bodyLift?: Channel;
  bodySquash?: Channel;
  headTilt?: Channel;
  earFlap?: Channel;
  tailWag?: Channel;
  muzzleBob?: Channel;
  /** 움직이지 않는 값들 */
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
  const line = shade(fur, -105);
  const inner = shade(fur, -55);
  const pale = shade(fur, 45);
  // 무늬는 털색과 확실히 구분돼야 합니다. 살짝만 어둡게 하면
  // 무늬가 아니라 때 묻은 자국처럼 보입니다.
  const patch = shade(fur, -88);
  // 노년은 눈동자가 뿌옇게 흐려집니다. 외곽선 색을 회청색 쪽으로 섞습니다.
  const eyeColor = mix(line, '#8FA0A6', stage.eyeCloudiness);
  const curly = preset.furTexture === 'curly';

  // 품종·단계 숫자를 실제 치수로 변환
  const bodyScale = stage.bodyScale;
  const bodyRx = (44 + (preset.bodyRatio - 1) * 10) * bodyScale;
  const bodyRy = 42 * bodyScale;
  const muzzleRy = 17 * preset.snoutLength;
  const muzzleCy = 104 + (preset.snoutLength - 1) * 7;

  // 발은 아기·청소년일수록 유난히 큽니다. 바닥선(≈199)을 유지하도록
  // 커진 만큼 중심을 위로 올려, 발이 뷰박스 밖으로 삐져나가지 않게 합니다.
  const pawRx = 16 * stage.pawScale;
  const pawRy = 11 * stage.pawScale;
  const pawCy = 199 - pawRy;

  // 귀는 품종 각도에 단계 처짐을 더하고, 길이에 단계 배율을 곱합니다.
  // (아기는 품종과 무관하게 귀가 작고 쳐지고, 노년은 살짝 처집니다.)
  const earAngle = Math.max(0, Math.min(170, preset.earAngle + stage.earDroop));
  const earLength = preset.earLength * stage.earScale;

  // 머리 크기 배율. 아기는 머리가 커서 뽀짝합니다. 머리 중심을 축으로
  // 귀·눈·주둥이까지 통째로 키우거나 줄입니다.
  const headScale = stage.headScale;

  const rawEyeOpen =
    blinkEnabled && blinking ? 0 : (frozen?.eyeOpen ?? spec?.eyeOpen ?? REST_POSE.eyeOpen);
  // 아기는 눈을 다 못 뜨고, 노년은 눈이 조금 처집니다. 단계별 최대치로 눌러줍니다.
  const eyeOpen = Math.min(rawEyeOpen, stage.eyeOpenMax);
  const mouthOpen = frozen?.mouthOpen ?? spec?.mouthOpen ?? REST_POSE.mouthOpen;

  // 모든 움직임을 표준 SVG transform 문자열로 넘깁니다.
  // react-native-svg의 translateY/scaleY 같은 개별 prop은 웹에서 DOM 속성으로
  // 새어 나가 React 경고를 냅니다. transform은 진짜 SVG 속성이라 웹·네이티브 양쪽에서
  // 똑같이 파싱됩니다.
  const rootProps = useAnimatedProps(() => ({
    transform: `translate(0, ${bodyLift.value})`,
  }));
  const bodyProps = useAnimatedProps(() => ({
    transform: `translate(${ANCHOR.body.x}, ${ANCHOR.body.y}) scale(1, ${bodySquash.value}) translate(${-ANCHOR.body.x}, ${-ANCHOR.body.y})`,
  }));
  const headProps = useAnimatedProps(() => ({
    transform: `rotate(${headTilt.value}, ${ANCHOR.neck.x}, ${ANCHOR.neck.y})`,
  }));
  const tailProps = useAnimatedProps(() => ({
    transform: `rotate(${tailWag.value}, ${ANCHOR.tail.x}, ${ANCHOR.tail.y})`,
  }));
  const muzzleProps = useAnimatedProps(() => ({
    transform: `translate(0, ${muzzleBob.value})`,
  }));
  const earLeftProps = useAnimatedProps(
    () => ({
      transform: `rotate(${-(earAngle + earFlap.value)}, ${ANCHOR.earLeft.x}, ${ANCHOR.earLeft.y})`,
    }),
    [earAngle],
  );
  const earRightProps = useAnimatedProps(
    () => ({
      transform: `rotate(${earAngle + earFlap.value}, ${ANCHOR.earRight.x}, ${ANCHOR.earRight.y})`,
    }),
    [earAngle],
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      {/* 몸 전체 — 호흡할 때 위아래로 움직이는 최상위 그룹 */}
      <AnimatedG animatedProps={rootProps}>
        {/* 꼬리: 몸통보다 먼저 그려서 뒤로 보냅니다 */}
        <AnimatedG animatedProps={tailProps}>
          <Path
            d={tailPath(preset.tailCurl, preset.tailLength)}
            stroke={fur}
            strokeWidth={18}
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* 앞발 — 아기·청소년은 발이 큼직합니다 */}
        <Ellipse
          cx={78}
          cy={pawCy}
          rx={pawRx}
          ry={pawRy}
          fill={pale}
          stroke={line}
          strokeWidth={4}
        />
        <Ellipse
          cx={122}
          cy={pawCy}
          rx={pawRx}
          ry={pawRy}
          fill={pale}
          stroke={line}
          strokeWidth={4}
        />

        {/* 몸통 */}
        <AnimatedG animatedProps={bodyProps}>
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
          <BodyPattern pattern={preset.furPattern} tone={patch} bodyRx={bodyRx} />
        </AnimatedG>

        {/* 머리 — 목을 축으로 갸웃합니다. 귀·눈·코가 전부 이 안에 있습니다. */}
        <AnimatedG animatedProps={headProps}>
          {/* 단계별 머리 크기 — 머리 중심을 축으로 얼굴 전체를 키우거나 줄입니다.
              (아기는 머리가 크고, 청소년은 살짝 작습니다.) */}
          <G
            transform={`translate(${ANCHOR.head.x}, ${ANCHOR.head.y}) scale(${headScale}) translate(${-ANCHOR.head.x}, ${-ANCHOR.head.y})`}>
            {/* 귀: 머리보다 먼저 그려서 뒤로 보냅니다 */}
            <Ear
              anchor={ANCHOR.earLeft}
              animatedProps={earLeftProps}
              length={earLength}
              curly={curly}
              {...{ fur, line, inner }}
            />
            <Ear
              anchor={ANCHOR.earRight}
              animatedProps={earRightProps}
              length={earLength}
              curly={curly}
              {...{ fur, line, inner }}
            />

            {/* 머리통 — 세로보다 가로가 살짝 넓어야 강아지로 읽힙니다 */}
            <Blob
              cx={ANCHOR.head.x}
              cy={ANCHOR.head.y}
              rx={48}
              ry={42}
              curly={curly}
              bumps={14}
              amp={4.5}
              fill={fur}
              stroke={line}
              strokeWidth={5}
            />

            {/* 얼굴 무늬 — 머리통 위, 눈보다 아래 */}
            <FacePattern pattern={preset.furPattern} tone={patch} />

            {/* 주둥이 묶음 — 씹을 때 이 그룹이 통째로 흔들립니다 */}
            <AnimatedG animatedProps={muzzleProps}>
              <Ellipse
                cx={100}
                cy={muzzleCy}
                rx={28}
                ry={muzzleRy}
                fill={pale}
                stroke={line}
                strokeWidth={3}
              />
              <Ellipse cx={100} cy={muzzleCy - muzzleRy * 0.5} rx={11} ry={8.5} fill={line} />
              <Path
                d={mouthPath(muzzleCy, muzzleRy, mouthOpen)}
                stroke={line}
                strokeWidth={3.5}
                strokeLinecap="round"
                fill={mouthOpen > 0.15 ? shade(fur, -130) : 'none'}
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
function Ear({ anchor, animatedProps, length, curly, fur, line, inner }: EarProps) {
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
            <Path
              d={earPath(length, 1)}
              fill={fur}
              stroke={line}
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <Path d={earPath(length * 0.58, 0.5)} fill={inner} />
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
 * 몸통에 얹는 무늬.
 *
 * 얼룩(patch)은 등 위쪽에 붙여서 몸통 윤곽을 타게 그립니다.
 * 몸통 한가운데 띄우면 무늬가 아니라 때 묻은 자국처럼 보입니다.
 */
function BodyPattern({
  pattern,
  tone,
  bodyRx,
}: {
  pattern: BreedPreset['furPattern'];
  tone: string;
  bodyRx: number;
}) {
  if (pattern === 'patch') {
    return (
      <Ellipse
        cx={100 - bodyRx * 0.42}
        cy={132}
        rx={bodyRx * 0.5}
        ry={22}
        fill={tone}
        opacity={0.85}
      />
    );
  }
  if (pattern === 'spotted') {
    return (
      <G opacity={0.5}>
        <Circle cx={72} cy={140} r={8} fill={tone} />
        <Circle cx={128} cy={152} r={6} fill={tone} />
        <Circle cx={88} cy={176} r={5} fill={tone} />
      </G>
    );
  }
  return null;
}

/**
 * 얼굴 무늬.
 *
 * 한쪽 눈을 덮는 얼룩은 강아지 무늬 중 제일 알아보기 쉽습니다.
 * 머리통 다음, 눈보다 먼저 그려야 눈이 무늬 위에 얹힙니다.
 */
function FacePattern({ pattern, tone }: { pattern: BreedPreset['furPattern']; tone: string }) {
  if (pattern !== 'patch') return null;
  return (
    <G opacity={0.85}>
      {/* 왼쪽 눈을 덮는 얼룩 */}
      <Ellipse cx={76} cy={74} rx={22} ry={20} fill={tone} />
      {/* 귀 쪽으로 이어지는 부분 */}
      <Ellipse cx={64} cy={60} rx={14} ry={13} fill={tone} />
    </G>
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
function earPath(len: number, widthScale: number): string {
  const h = 42 * len;
  const w = 13 * widthScale;
  return [
    `M ${-w} 3`,
    `C ${-w - 2} ${-h * 0.42}, ${-w + 4} ${-h * 0.86}, 0 ${-h}`,
    `C ${w - 4} ${-h * 0.86}, ${w + 2} ${-h * 0.42}, ${w} 3`,
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
 * 색을 밝게/어둡게. amount가 음수면 어두워집니다.
 * 품종 색 하나에서 외곽선·귀 안쪽·가슴털 색을 파생시키는 데 씁니다.
 */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

/** 두 16진 색을 t(0~1)만큼 섞습니다. t=0이면 a, t=1이면 b. */
function mix(a: string, b: string, t: number): string {
  const parse = (c: string) => {
    // rgb(...) 문자열도, #RRGGBB 도 모두 받습니다.
    const m = c.match(/\d+/g);
    if (c.startsWith('#')) {
      const n = parseInt(c.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const k = Math.max(0, Math.min(1, t));
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * k);
  return `rgb(${lerp(ar, br)}, ${lerp(ag, bg)}, ${lerp(ab, bb)})`;
}

/**
 * 나이 들며 털이 희끗해지는 정도.
 * amount가 0이면 원래 털색, 1에 가까울수록 흐린 회백색으로 바랩니다.
 * 품종 색이 아예 지워지지 않도록 최대 섞임을 절반 정도로 눌러 둡니다.
 */
function fade(hex: string, amount: number): string {
  return mix(hex, '#D8D3CA', amount * 0.5);
}

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

import type { AnimationName, BreedPreset } from '@/constants/pet';

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

export function PetRig({ preset, size, animation, pose }: PetRigProps) {
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

  const fur = preset.furColor;
  const line = shade(fur, -105);
  const inner = shade(fur, -55);
  const pale = shade(fur, 45);

  // 품종 숫자를 실제 치수로 변환
  const bodyRx = 44 + (preset.bodyRatio - 1) * 10;
  const muzzleRy = 17 * preset.snoutLength;
  const muzzleCy = 104 + (preset.snoutLength - 1) * 7;

  const eyeOpen =
    blinkEnabled && blinking ? 0 : (frozen?.eyeOpen ?? spec?.eyeOpen ?? REST_POSE.eyeOpen);
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
      transform: `rotate(${-(preset.earAngle + earFlap.value)}, ${ANCHOR.earLeft.x}, ${ANCHOR.earLeft.y})`,
    }),
    [preset.earAngle],
  );
  const earRightProps = useAnimatedProps(
    () => ({
      transform: `rotate(${preset.earAngle + earFlap.value}, ${ANCHOR.earRight.x}, ${ANCHOR.earRight.y})`,
    }),
    [preset.earAngle],
  );

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`}>
      {/* 몸 전체 — 호흡할 때 위아래로 움직이는 최상위 그룹 */}
      <AnimatedG animatedProps={rootProps}>
        {/* 꼬리: 몸통보다 먼저 그려서 뒤로 보냅니다 */}
        <AnimatedG animatedProps={tailProps}>
          <Path
            d={tailPath(preset.tailCurl)}
            stroke={fur}
            strokeWidth={18}
            strokeLinecap="round"
            fill="none"
          />
        </AnimatedG>

        {/* 앞발 */}
        <Ellipse cx={78} cy={188} rx={16} ry={11} fill={pale} stroke={line} strokeWidth={4} />
        <Ellipse cx={122} cy={188} rx={16} ry={11} fill={pale} stroke={line} strokeWidth={4} />

        {/* 몸통 */}
        <AnimatedG animatedProps={bodyProps}>
          <Ellipse
            cx={ANCHOR.body.x}
            cy={ANCHOR.body.y}
            rx={bodyRx}
            ry={42}
            fill={fur}
            stroke={line}
            strokeWidth={5}
          />
          {/* 가슴 털 */}
          <Ellipse cx={100} cy={162} rx={20} ry={26} fill={pale} />
          <FurPattern pattern={preset.furPattern} tone={inner} />
        </AnimatedG>

        {/* 머리 — 목을 축으로 갸웃합니다. 귀·눈·코가 전부 이 안에 있습니다. */}
        <AnimatedG animatedProps={headProps}>
          {/* 귀: 머리보다 먼저 그려서 뒤로 보냅니다 */}
          <Ear
            anchor={ANCHOR.earLeft}
            animatedProps={earLeftProps}
            length={preset.earLength}
            {...{ fur, line, inner }}
          />
          <Ear
            anchor={ANCHOR.earRight}
            animatedProps={earRightProps}
            length={preset.earLength}
            {...{ fur, line, inner }}
          />

          {/* 머리통 — 세로보다 가로가 살짝 넓어야 강아지로 읽힙니다 */}
          <Ellipse
            cx={ANCHOR.head.x}
            cy={ANCHOR.head.y}
            rx={48}
            ry={42}
            fill={fur}
            stroke={line}
            strokeWidth={5}
          />

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

          {/* 눈 — eyeOpen이 0에 가까우면 감은 선으로 바뀝니다 */}
          <Eye cx={80} cy={78} open={eyeOpen} line={line} />
          <Eye cx={120} cy={78} open={eyeOpen} line={line} />
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
function Ear({ anchor, animatedProps, length, fur, line, inner }: EarProps) {
  return (
    <AnimatedG animatedProps={animatedProps}>
      <G transform={`translate(${anchor.x}, ${anchor.y})`}>
        <Path
          d={earPath(length, 1)}
          fill={fur}
          stroke={line}
          strokeWidth={5}
          strokeLinejoin="round"
        />
        <Path d={earPath(length * 0.58, 0.5)} fill={inner} />
      </G>
    </AnimatedG>
  );
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

/** 몸통 위에 얹는 무늬. */
function FurPattern({ pattern, tone }: { pattern: BreedPreset['furPattern']; tone: string }) {
  if (pattern === 'patch') {
    return <Ellipse cx={70} cy={140} rx={17} ry={20} fill={tone} opacity={0.55} />;
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

/* ------------------------------------------------------------------ *
 * 계산 유틸
 * ------------------------------------------------------------------ */

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
 */
function tailPath(curl: number): string {
  const { x, y } = ANCHOR.tail;
  const cx = 168 + 14 * curl;
  const cy = 184 - 58 * curl;
  const ex = 170 - 20 * curl;
  const ey = 202 - 96 * curl;
  return `M ${x} ${y} Q ${cx} ${cy} ${ex} ${ey}`;
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

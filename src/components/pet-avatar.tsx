import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { FloatingEmojis } from '@/components/floating-emojis';
import { PetCharacter } from '@/components/pet-character';
import { Scene, sceneForBreed } from '@/components/pet-scene';
import type { AnimationName, BreedId } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CareActionId, Stage } from '@/lib/game';

/** 반응의 종류. 종류마다 다르게 움직여야 결과가 구분됩니다. */
export type ReactKind = 'care' | 'pat' | 'refused';

/**
 * 쓰다듬은 뒤 꼬리 동작(wagSlow)을 유지하는 시간(ms).
 *
 * 연타 판정 창(game.tsx의 PAT_STREAK_WINDOW_MS = 1500)보다 살짝 짧게 잡았습니다.
 * 연달아 쓰다듬는 동안에는 계속 흔들고, 손을 떼면 자연스럽게 풀립니다.
 */
const PAT_MOTION_MS = 1200;

type PetAvatarProps = {
  stage: Stage;
  /**
   * 어떤 품종으로 그릴지. 닮은 동물 검색이 정해서 넘겨줍니다.
   *
   * 캐릭터는 이미지가 아니라 SVG로 그 자리에서 그립니다. 그래서 단계별로
   * 이미지를 따로 만들 필요가 없습니다 — stage.id만 넘기면 같은 품종이
   * 아기·청소년·청년·노년으로 알아서 변합니다.
   */
  breed: BreedId;
  /** 돌봄 직후처럼 잠깐 반응시킬 때 이 값을 바꿔주면 통통 튑니다. */
  reactKey?: number;
  /** 어떤 반응인지. 거절은 튀지 않고 좌우로 흔들립니다. */
  reactKind?: ReactKind;
  /** 반응할 때 떠오를 이모지. 없으면 파티클을 띄우지 않습니다. */
  reactEmoji?: string | null;
  /** 스탯이 많이 떨어졌으면 살짝 시무룩하게 보여줍니다. */
  sad?: boolean;
  /**
   * 지금 진행 중인 돌봄. 있으면 그 돌봄에 맞는 동작을 반복합니다
   * (먹는 중 · 노는 중 · 씻는 중). 끝나면 null로 되돌려주세요.
   */
  activity?: CareActionId | null;
  /** 아바타를 누르면(쓰다듬으면) 호출됩니다. 없으면 눌리지 않습니다. */
  onPat?: () => void;
};

/**
 * 아무 일도 없을 때 돌아가는 동작 순서.
 *
 * 한 동작만 계속 틀면 화면이 멈춘 것처럼 보이고, 두 동작을 절반씩 번갈아
 * 틀면 계속 두리번거리는 산만한 아이가 됩니다. 그래서 기본(breathe)을 길게
 * 깔고 짧게 둘러보는 악센트만 얹었습니다 — 고요한 게 기본이고 가끔 한 번씩
 * 움직이는 리듬입니다.
 *
 * yawn은 상태가 아니라 **구두점**입니다. 지루함은 한 번 크게 하품하고 끝나야
 * 읽히지, 몇 초씩 입을 벌리고 있으면 하품이 아니라 굳은 표정이 됩니다.
 * 그래서 한 바퀴에 한 번, 그것도 제일 짧게만 넣었습니다.
 *
 * 한 바퀴는 약 21.5초입니다. 순서를 바꾸고 싶으면 이 배열만 고치세요.
 */
const IDLE_LOOP: readonly { animation: AnimationName; ms: number }[] = [
  { animation: 'breathe', ms: 5000 },
  { animation: 'lookAround', ms: 2000 },
  { animation: 'breathe', ms: 6000 },
  { animation: 'lookAround', ms: 2000 },
  { animation: 'breathe', ms: 5000 },
  { animation: 'yawn', ms: 1500 },
];

/**
 * 게임 상태 → 캐릭터 동작.
 *
 * 게임 쪽은 "지금 무슨 일이 일어나는지"만 알고, 캐릭터 쪽은 "그걸 어떻게
 * 움직이는지"만 압니다. 그 사이를 잇는 표가 여기입니다.
 * 새 돌봄이 생기면 여기 한 줄만 추가하면 됩니다.
 */
function animationFor(
  activity: CareActionId | null,
  patting: boolean,
  sad: boolean,
  idleStep: number,
): AnimationName {
  if (activity === 'feed') return 'chew';
  if (activity === 'play') return 'wagTail';
  if (activity === 'wash') return 'lookAround';
  // 쓰다듬기는 돌봄 중에도 눌리지만, 그때는 돌봄 동작이 이깁니다 —
  // 밥을 먹다 말고 꼬리를 흔들면 무엇을 하는 중인지 알 수 없게 됩니다.
  if (patting) return 'wagSlow';
  // 돌봄 중이 아닐 때만 기분이 드러납니다. 밥 먹는 중에 시무룩하면 어색합니다.
  // 쓰다듬는 순간에는 잠깐 좋아하다가 손을 떼면 다시 시무룩해집니다.
  if (sad) return 'droop';
  return IDLE_LOOP[idleStep]?.animation ?? 'breathe';
}

/**
 * 캐릭터가 보이는 자리.
 *
 * 안쪽은 PetCharacter(부위별로 쪼갠 SVG)입니다. 품종·단계·동작만 넘기면
 * 그 자리에서 그려지므로 이미지 파일이 필요 없습니다.
 *
 * 아바타 자체가 버튼입니다. 누르면 쓰다듬어집니다(onPat).
 */
export function PetAvatar({
  stage,
  breed,
  reactKey = 0,
  reactKind = 'care',
  reactEmoji = null,
  sad = false,
  activity = null,
  onPat,
}: PetAvatarProps) {
  const c = useTheme();

  /**
   * 화면 폭의 절반. 단, 단계가 정한 상한(AVATAR_SIZE)까지만.
   *
   * 고정값이던 것을 폭에 맞췄습니다 — 작은 폰에서는 캐릭터가 화면을 다 먹고,
   * 태블릿·웹에서는 가운데가 허전했습니다. 세로가 아니라 **가로**를 기준으로
   * 삼는 건, 캐릭터 옆으로 잘리는 일이 없어야 하기 때문입니다.
   */
  const { width } = useWindowDimensions();
  const size = Math.round(Math.min(width * 0.5, stage.avatarSize));

  const [bounce] = useState(() => new Animated.Value(0));

  // 평상시 숨쉬는 듯한 루프
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const [pop] = useState(() => new Animated.Value(0));
  const [shake] = useState(() => new Animated.Value(0));
  const [act] = useState(() => new Animated.Value(0));

  /**
   * 쓰다듬김 동작이 걸려 있는 동안 true.
   *
   * patSeq는 "몇 번째 쓰다듬기인지"만 셉니다. 연달아 쓰다듬을 때 이미 true인
   * patting을 다시 true로 놔봐야 상태가 안 바뀌어서 아래 타이머가 새로
   * 걸리지 않고, 첫 번째 쓰다듬기 기준으로 풀려버립니다. 그래서 매번 값이
   * 바뀌는 카운터를 따로 두고 그걸 의존성에 넣습니다.
   */
  const [patting, setPatting] = useState(false);
  const [patSeq, setPatSeq] = useState(0);

  useEffect(() => {
    if (!patting) return;

    const timer = setTimeout(() => setPatting(false), PAT_MOTION_MS);
    return () => clearTimeout(timer);
  }, [patting, patSeq]);

  /** 대기 동작이 IDLE_LOOP의 몇 번째인지. */
  const [idleStep, setIdleStep] = useState(0);
  // 쓰다듬는 동안도 대기가 아닙니다 — 그동안 순서가 몰래 흘러가면
  // 손을 뗀 뒤 엉뚱한 자리에서 이어집니다.
  const idle = !activity && !sad && !patting;

  /**
   * 대기 상태로 들어올 때마다 순서를 처음으로 되돌립니다.
   *
   * 안 그러면 돌봄 중에 멈춰 있던 자리에서 이어져서, 밥을 다 먹자마자
   * 하품부터 하는 장면이 나옵니다. 대기는 늘 breathe로 시작해야 합니다.
   *
   * 렌더 중에 값을 맞추는 방식입니다 — effect에서 하면 렌더가 한 번 더 돌고
   * (react-hooks/set-state-in-effect), 한 프레임 동안 이전 동작이 비칩니다.
   */
  const [idleTracked, setIdleTracked] = useState(idle);
  if (idleTracked !== idle) {
    setIdleTracked(idle);
    setIdleStep(0);
  }

  // 정해진 시간이 지나면 다음 대기 동작으로 넘깁니다.
  useEffect(() => {
    if (!idle) return;

    const timer = setTimeout(
      () => setIdleStep((step) => (step + 1) % IDLE_LOOP.length),
      IDLE_LOOP[idleStep]?.ms ?? 5000,
    );

    return () => clearTimeout(timer);
  }, [idle, idleStep]);

  /**
   * 진행 중인 돌봄에 맞는 동작을 반복합니다.
   *
   * 돌봄마다 다르게 움직여야 무엇을 하고 있는지 보입니다 — 먹을 때는 고개를
   * 까딱이고, 놀 때는 크게 뛰고, 씻을 때는 부르르 떱니다. 주기(period)만
   * 바꿔서 세 동작의 속도를 구분했습니다.
   *
   * ⚠️ **여기 주기는 안쪽 SVG 동작의 주기와 확실히 달라야 합니다.**
   * 캐릭터는 두 층으로 움직입니다 — 안쪽(pet-rig.tsx의 MOTION)과 이 바깥 층.
   * 두 층의 주기가 비슷하면 서로 맞물렸다 어긋났다 하면서 맥놀이가 생겨,
   * 생동감이 아니라 정신없음으로 읽힙니다. 예전에 놀아주기가 480ms(wagTail)
   * 대 420ms(여기)라 특히 심했습니다. 지금은 바깥 층을 안쪽보다 확실히
   * 느리게 잡아 "빠른 잔동작 위에 느린 큰 움직임"으로 층을 갈라 뒀습니다.
   *
   * 씻기기는 950ms(lookAround) 대 140ms로 원래 차이가 커서 그대로 둡니다 —
   * 고개는 천천히 두리번, 몸은 부르르 떠는 것으로 읽힙니다.
   */
  useEffect(() => {
    if (!activity) {
      act.setValue(0);
      return;
    }

    const period = activity === 'wash' ? 140 : activity === 'play' ? 700 : 600;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(act, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(act, {
          toValue: 0,
          duration: period,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [activity, act]);

  // 반응이 오면 종류에 맞게 한 번 움직입니다.
  useEffect(() => {
    if (reactKey === 0) return;

    // 거절은 "안 해도 돼요"라는 뜻이니 기쁘게 튀면 안 됩니다. 좌우로 흔들어
    // 거절임을 몸짓으로 구분합니다.
    if (reactKind === 'refused') {
      shake.setValue(0);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 70, useNativeDriver: true }),
      ]).start();
      return;
    }

    pop.setValue(0);
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1,
        // 쓰다듬기는 돌봄보다 가볍게 반응합니다.
        duration: reactKind === 'pat' ? 110 : 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [reactKey, reactKind, pop, shake]);

  const popLift = reactKind === 'pat' ? -6 : -12;

  // 진행 중 동작의 움직임 폭. 먹기는 고개 까딱(작게 아래로), 놀기는 점프,
  // 씻기는 좌우 진동입니다.
  const actLift = activity === 'play' ? -20 : activity === 'feed' ? 5 : 0;
  const actShift = activity === 'wash' ? 5 : 0;
  const actScale = activity === 'feed' ? 1.03 : 1;

  // 위로 튀는 폭은 말풍선 자리를 침범하지 않는 선까지만 (game.tsx의 bubbleSlot 참고).
  const translateY = Animated.add(
    Animated.add(
      bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
      pop.interpolate({ inputRange: [0, 1], outputRange: [0, popLift] }),
    ),
    act.interpolate({ inputRange: [0, 1], outputRange: [0, actLift] }),
  );
  const translateX = Animated.add(
    shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] }),
    act.interpolate({ inputRange: [0, 1], outputRange: [-actShift, actShift] }),
  );
  const scale = Animated.multiply(
    pop.interpolate({
      inputRange: [0, 1],
      outputRange: [1, reactKind === 'pat' ? 1.04 : 1.08],
    }),
    act.interpolate({ inputRange: [0, 1], outputRange: [1, actScale] }),
  );

  const standSize = size + Spacing.xl;

  // 진행 중인 돌봄 아이콘. CARE_ACTIONS의 이모지와 맞춰 둡니다.
  const activityEmoji =
    activity === 'feed' ? '🍚' : activity === 'play' ? '🎾' : activity === 'wash' ? '🫧' : null;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => {
          // 동작은 결과를 기다리지 않고 누르는 즉시 겁니다 — 쓰다듬기는
          // 거절이 없는 상호작용이라 기다릴 이유가 없고, 손맛이 늦으면
          // 반응을 보려고 누르는 행동 자체가 심심해집니다.
          setPatting(true);
          setPatSeq((n) => n + 1);
          onPat?.();
        }}
        disabled={!onPat}
        accessibilityRole="button"
        accessibilityLabel={`${stage.label} 캐릭터 쓰다듬기`}
        // 손가락으로 잡기 좋게 살짝 여유를 둡니다.
        hitSlop={8}>
        {/* 배경(씬)은 고정이고 캐릭터만 움직입니다.
            씬까지 같이 튀면 방 전체가 들썩여서 멀미가 납니다. */}
        <View style={{ width: standSize, height: standSize }}>
          <Scene kind={sceneForBreed(breed)}>
            <Animated.View
              style={{
                opacity: sad ? 0.85 : 1,
                transform: [{ translateY }, { translateX }, { scale }],
              }}>
              {/* 시무룩할 땐 동작(droop)으로 이미 드러나므로, 투명도까지 낮추면
                  캐릭터가 사라져 가는 것처럼 보입니다. 살짝만 눌러 둡니다. */}
              <PetCharacter
                breed={breed}
                stage={stage.id}
                animation={animationFor(activity, patting, sad, idleStep)}
                size={size}
              />
            </Animated.View>
          </Scene>

          {reactEmoji ? <FloatingEmojis emoji={reactEmoji} trigger={reactKey} /> : null}

          {/* 진행 중인 돌봄을 아바타 옆에 아이콘으로도 표시합니다 */}
          {activityEmoji ? (
            <View
              style={[styles.activityBadge, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={styles.activityBadgeText}>{activityEmoji}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <Text style={[styles.stageLabel, { color: c.textSecondary }]}>
        {stage.label}
        {sad ? ' · 시무룩' : ''}
      </Text>

      {/*
        "눌러서 쓰다듬기" 안내는 뺐습니다. 캐릭터를 눌러보는 건 설명 없이도
        하게 되는 일이라, 한 줄을 더 두는 값보다 화면이 조용한 값이 큽니다.
        (누르는 동작 자체는 그대로입니다 — 위 Pressable 의 onPat)
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  stageLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  patHint: {
    fontSize: FontSize.caption,
    opacity: 0.6,
    marginTop: 2,
  },
  activityBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  activityBadgeText: {
    fontSize: 16,
  },
});

import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingEmojis } from '@/components/floating-emojis';
import { PetCharacter } from '@/components/pet-character';
import { Scene, sceneForBreed } from '@/components/pet-scene';
import type { AnimationName, BreedId } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CareActionId, Stage } from '@/lib/game';

/** 반응의 종류. 종류마다 다르게 움직여야 결과가 구분됩니다. */
export type ReactKind = 'care' | 'pat' | 'refused';

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
 * 게임 상태 → 캐릭터 동작.
 *
 * 게임 쪽은 "지금 무슨 일이 일어나는지"만 알고, 캐릭터 쪽은 "그걸 어떻게
 * 움직이는지"만 압니다. 그 사이를 잇는 표가 여기입니다.
 * 새 돌봄이 생기면 여기 한 줄만 추가하면 됩니다.
 */
function animationFor(activity: CareActionId | null, sad: boolean): AnimationName {
  if (activity === 'feed') return 'chew';
  if (activity === 'play') return 'wagTail';
  if (activity === 'wash') return 'lookAround';
  // 돌봄 중이 아닐 때만 기분이 드러납니다. 밥 먹는 중에 시무룩하면 어색합니다.
  return sad ? 'droop' : 'breathe';
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
  const size = stage.avatarSize;

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
   * 진행 중인 돌봄에 맞는 동작을 반복합니다.
   *
   * 돌봄마다 다르게 움직여야 무엇을 하고 있는지 보입니다 — 먹을 때는 고개를
   * 까딱이고, 놀 때는 크게 뛰고, 씻을 때는 부르르 떱니다. 주기(period)만
   * 바꿔서 세 동작의 속도를 구분했습니다.
   */
  useEffect(() => {
    if (!activity) {
      act.setValue(0);
      return;
    }

    const period = activity === 'wash' ? 140 : activity === 'play' ? 420 : 300;

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
        onPress={onPat}
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
                animation={animationFor(activity, sad)}
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

      {onPat ? (
        <Text style={[styles.patHint, { color: c.textSecondary }]}>눌러서 쓰다듬기</Text>
      ) : null}
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

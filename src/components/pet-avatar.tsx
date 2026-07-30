import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { FloatingEmojis } from '@/components/floating-emojis';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Stage } from '@/lib/game';

/** 반응의 종류. 종류마다 다르게 움직여야 결과가 구분됩니다. */
export type ReactKind = 'care' | 'pat' | 'refused';

type PetAvatarProps = {
  stage: Stage;
  /**
   * 이 단계의 캐릭터 이미지.
   *
   * TODO(조윤주): 캐릭터화가 완성되면 여기로 이미지 URI를 넘겨주세요.
   * 넘기면 이모지 대신 이미지가 그려지고, 다른 코드는 건드릴 필요 없습니다.
   * 단계별로 다른 이미지가 필요하니 stage.id('baby'|'teen'|'young'|'elder')로
   * 골라서 넘기면 됩니다.
   */
  imageUri?: string | null;
  /** 돌봄 직후처럼 잠깐 반응시킬 때 이 값을 바꿔주면 통통 튑니다. */
  reactKey?: number;
  /** 어떤 반응인지. 거절은 튀지 않고 좌우로 흔들립니다. */
  reactKind?: ReactKind;
  /** 반응할 때 떠오를 이모지. 없으면 파티클을 띄우지 않습니다. */
  reactEmoji?: string | null;
  /** 스탯이 많이 떨어졌으면 살짝 시무룩하게 보여줍니다. */
  sad?: boolean;
  /** 아바타를 누르면(쓰다듬으면) 호출됩니다. 없으면 눌리지 않습니다. */
  onPat?: () => void;
};

/**
 * 캐릭터가 보이는 자리.
 *
 * **지금은 단계별 이모지로 대신하고 있습니다.** 캐릭터 이미지가 들어올 자리를
 * 이 컴포넌트 하나로 격리해 둔 게 목적입니다 — 이미지가 나오면 imageUri만
 * 넘기면 되고 게임 화면 코드는 그대로입니다.
 *
 * 아바타 자체가 버튼입니다. 누르면 쓰다듬어집니다(onPat).
 */
export function PetAvatar({
  stage,
  imageUri,
  reactKey = 0,
  reactKind = 'care',
  reactEmoji = null,
  sad = false,
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

  // 위로 튀는 폭은 말풍선 자리를 침범하지 않는 선까지만 (game.tsx의 bubbleSlot 참고).
  const translateY = Animated.add(
    bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
    pop.interpolate({ inputRange: [0, 1], outputRange: [0, popLift] }),
  );
  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-7, 7] });
  const scale = pop.interpolate({
    inputRange: [0, 1],
    outputRange: [1, reactKind === 'pat' ? 1.04 : 1.08],
  });

  const standSize = size + Spacing.xl;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPat}
        disabled={!onPat}
        accessibilityRole="button"
        accessibilityLabel={`${stage.label} 캐릭터 쓰다듬기`}
        // 손가락으로 잡기 좋게 살짝 여유를 둡니다.
        hitSlop={8}>
        <Animated.View
          style={[
            styles.stand,
            {
              width: standSize,
              height: standSize,
              backgroundColor: c.surfaceAlt,
              transform: [{ translateY }, { translateX }, { scale }],
            },
          ]}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: size, height: size, borderRadius: Radius.lg }}
              contentFit="contain"
            />
          ) : (
            // TODO(조윤주): 이미지가 들어오면 이 이모지 분기는 사라집니다.
            <Text style={{ fontSize: size * 0.62, opacity: sad ? 0.55 : 1 }}>
              {sad ? '😢' : stage.placeholderEmoji}
            </Text>
          )}

          {reactEmoji ? <FloatingEmojis emoji={reactEmoji} trigger={reactKey} /> : null}
        </Animated.View>
      </Pressable>

      {/* 발밑 그림자 — 떠 있는 느낌을 잡아줍니다 */}
      <View style={[styles.shadow, { width: size * 0.7, backgroundColor: c.border }]} />

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
  stand: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  shadow: {
    height: 6,
    borderRadius: Radius.pill,
    opacity: 0.6,
    marginTop: Spacing.xs,
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
});

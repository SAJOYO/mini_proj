import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Stage } from '@/lib/game';

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
  /** 스탯이 많이 떨어졌으면 살짝 시무룩하게 보여줍니다. */
  sad?: boolean;
};

/**
 * 캐릭터가 보이는 자리.
 *
 * **지금은 단계별 이모지로 대신하고 있습니다.** 캐릭터 이미지가 들어올 자리를
 * 이 컴포넌트 하나로 격리해 둔 게 목적입니다 — 이미지가 나오면 imageUri만
 * 넘기면 되고 게임 화면 코드는 그대로입니다.
 */
export function PetAvatar({ stage, imageUri, reactKey = 0, sad = false }: PetAvatarProps) {
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

  // 돌봄을 받으면 한 번 크게 튀어오릅니다
  useEffect(() => {
    if (reactKey === 0) return;

    pop.setValue(0);
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pop, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();
  }, [reactKey, pop]);

  const translateY = Animated.add(
    bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
    pop.interpolate({ inputRange: [0, 1], outputRange: [0, -22] }),
  );
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.stand,
          {
            width: size + Spacing.xl,
            height: size + Spacing.xl,
            backgroundColor: c.surfaceAlt,
            transform: [{ translateY }, { scale }],
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
            {stage.placeholderEmoji}
          </Text>
        )}
      </Animated.View>

      {/* 발밑 그림자 — 떠 있는 느낌을 잡아줍니다 */}
      <View style={[styles.shadow, { width: size * 0.7, backgroundColor: c.border }]} />

      <Text style={[styles.stageLabel, { color: c.textSecondary }]}>
        {stage.label}
        {sad ? ' · 시무룩' : ''}
      </Text>
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
});

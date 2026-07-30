import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';

import { PetCharacter } from '@/components/pet-character';
import type { BreedId } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Stage } from '@/lib/game';
import { subjectParticle } from '@/lib/korean';

type GrowthOverlayProps = {
  /** 새로 도달한 단계. */
  stage: Stage;
  /** 어떤 품종으로 그릴지. 방금 자란 그 모습을 보여줘야 성장이 체감됩니다. */
  breed: BreedId;
  /** 연출이 끝나면 호출됩니다(부모가 상태를 지우세요). */
  onDone: () => void;
};

/** 화면을 덮고 있는 시간(ms). 짧으면 못 보고, 길면 조작을 방해합니다. */
const HOLD_MS = 1500;

/**
 * 성장하는 순간 화면 전체에 뜨는 축하 연출.
 *
 * 4단계 성장이 이 게임의 핵심인데 말풍선 한 줄로 지나가면 "레벨업했다"는
 * 느낌이 남지 않습니다. 그래서 잠깐 화면을 덮어 그 순간을 못 지나치게 했습니다.
 * 자동으로 사라지고, 터치를 막지 않도록 pointerEvents="none"입니다.
 */
export function GrowthOverlay({ stage, breed, onDone }: GrowthOverlayProps) {
  const c = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 0 → 1(등장) → 유지 → 2(사라짐)
    Animated.sequence([
      Animated.timing(progress, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.back(1.6)),
        useNativeDriver: true,
      }),
      Animated.delay(HOLD_MS),
      Animated.timing(progress, {
        toValue: 2,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [progress, onDone]);

  const opacity = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0.7, 1, 1.1],
  });

  return (
    <Animated.View
      style={[styles.backdrop, { backgroundColor: c.background, opacity }]}
      pointerEvents="none">
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: c.surface, borderColor: c.primary, transform: [{ scale }] },
        ]}>
        <Text style={[styles.tag, { color: c.primary }]}>성장!</Text>
        {/* 자란 모습을 그대로 보여줍니다. 이모지로 대신하면 "뭐가 달라졌는지"가
            안 보여서 성장 연출의 의미가 없어집니다. */}
        <PetCharacter breed={breed} stage={stage.id} animation="wagTail" size={140} />
        <Text style={[styles.label, { color: c.text }]}>
          {stage.label}
          {subjectParticle(stage.label)} 되었어요
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // 화면 전체를 덮으므로 다른 요소보다 위에 있어야 합니다.
    zIndex: 10,
    elevation: 10,
  },
  card: {
    borderWidth: 2,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl * 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tag: {
    fontSize: FontSize.caption,
    fontWeight: '800',
    letterSpacing: 3,
  },
  label: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
});

import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import {
  BREEDS,
  DEFAULT_ANIMATION,
  DEFAULT_BREED,
  type AnimationName,
  type BreedId,
} from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PetCharacterProps = {
  /** 닮은 동물 검색 결과로 정해지는 품종. 없으면 기본 형태로 그립니다. */
  breed?: BreedId;
  /** 게임 로직이 펫 상태를 보고 골라 넘기는 동작. */
  animation?: AnimationName;
  /** 캐릭터가 차지할 정사각형 한 변 길이(px). */
  size?: number;
  style?: ViewStyle;
};

/**
 * 반려동물 캐릭터.
 *
 * ⚠️ 지금은 **임시 스텁**입니다. 진짜 그림 대신 이모지와 텍스트만 보여줍니다.
 *
 * 게임 동작 담당은 이 컴포넌트가 완성되기를 기다리지 말고
 * 지금 바로 `animation` prop에 상태를 흘려보내면서 개발하세요.
 * 나중에 내부를 진짜 리그로 갈아끼워도 **props는 그대로**라
 * 게임 쪽 코드는 한 줄도 안 고쳐도 됩니다.
 *
 * TODO(캐릭터 담당): 내부를 react-native-svg 리그로 교체.
 *   - 부위(머리·귀·주둥이·몸통·다리·꼬리)를 <G>로 쪼개고 anchor 지정
 *   - BREEDS[breed]의 숫자를 각 부위 transform에 연결
 *   - 애니메이션은 Reanimated로 (동시 재생이 많아지면 코어 Animated는 버겁습니다)
 */
export function PetCharacter({
  breed = DEFAULT_BREED,
  animation = DEFAULT_ANIMATION,
  size = 180,
  style,
}: PetCharacterProps) {
  const c = useTheme();
  const preset = BREEDS[breed];
  const motion = MOTION[animation];

  // useState 지연 초기화로 Animated.Value를 딱 한 번만 만듭니다.
  // (useRef(...).current 는 렌더 중 ref 접근이라 react-hooks 규칙에 걸립니다)
  const [wave] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 동작이 바뀌면 이전 루프를 버리고 처음부터 다시 시작합니다.
    wave.setValue(0);

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(wave, {
          toValue: 0,
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [wave, motion.duration]);

  const translateY = wave.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -motion.distance],
  });

  return (
    <View style={[styles.wrap, style]} accessibilityLabel={`${preset.label} 캐릭터, ${animation}`}>
      <Animated.View
        style={[
          styles.stage,
          {
            width: size,
            height: size,
            backgroundColor: c.surfaceAlt,
            borderColor: c.border,
            transform: [{ translateY }],
          },
        ]}>
        <Text style={{ fontSize: size * 0.38 }}>{FACE[animation]}</Text>

        {/* 진짜 캐릭터가 아니라는 걸 눈으로 바로 알 수 있게 남겨둡니다. */}
        <View style={[styles.badge, { backgroundColor: c.border }]}>
          <Text style={[styles.badgeText, { color: c.textSecondary }]}>STUB</Text>
        </View>
      </Animated.View>

      <View style={styles.caption}>
        <Text style={[styles.breed, { color: c.text }]}>{preset.label}</Text>
        <Text style={[styles.animation, { color: c.primary }]}>{animation}</Text>
      </View>
    </View>
  );
}

/**
 * 동작별 임시 표정.
 * 진짜 리그가 들어오면 통째로 사라집니다.
 */
const FACE: Record<AnimationName, string> = {
  breathe: '🐶',
  lookAround: '👀',
  chew: '🍖',
  yawn: '🥱',
  sleep: '😴',
  wagTail: '🥰',
  droop: '🤒',
};

/**
 * 동작별 움직임의 세기와 속도.
 *
 * 스텁이라 위아래 흔들림 하나뿐이지만, 동작마다 눈에 띄게 다르게 해뒀습니다.
 * 게임 담당이 상태 전환이 실제로 먹히는지 화면만 보고 확인할 수 있어야 하니까요.
 */
const MOTION: Record<AnimationName, { distance: number; duration: number }> = {
  breathe: { distance: 4, duration: 1600 },
  lookAround: { distance: 8, duration: 700 },
  chew: { distance: 5, duration: 260 },
  yawn: { distance: 10, duration: 1100 },
  sleep: { distance: 3, duration: 2400 },
  wagTail: { distance: 12, duration: 320 },
  droop: { distance: 2, duration: 2600 },
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  stage: {
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  caption: {
    alignItems: 'center',
    gap: 2,
  },
  breed: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  animation: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});

import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 손가락이 오른쪽에서 왼쪽으로 훑는 거리(px). */
const TRAVEL = 26;
const CYCLE_MS = 900;

type SwipeHintProps = {
  /** 힌트를 눌러서 바로 닫을 수 있게 합니다. */
  onDismiss: () => void;
};

/**
 * 첫 진입에서만 뜨는 "옆으로 밀어보세요" 안내.
 *
 * 게임/대화 화면은 탭바가 없어서 스와이프가 유일한 이동 수단입니다.
 * 처음 쓰는 사람은 그걸 알 방법이 없으니 손가락 애니메이션으로 한 번 알려줍니다.
 * 표시 여부는 이 컴포넌트가 아니라 부모(탭 레이아웃)가 결정합니다.
 */
export function SwipeHint({ onDismiss }: SwipeHintProps) {
  const c = useTheme();

  // useState 지연 초기화로 Animated.Value를 딱 한 번만 만듭니다.
  // (useRef(...).current 는 렌더 중 ref 접근이라 react-hooks 규칙에 걸립니다)
  const [progress] = useState(() => new Animated.Value(0));
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 통째로 부드럽게 나타나기
    Animated.timing(appear, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [appear]);

  useEffect(() => {
    // 손가락이 오른쪽 → 왼쪽으로 훑는 동작을 반복
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: CYCLE_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(260),
        // 되돌아갈 때는 투명해진 상태라 눈에 안 띕니다(0으로 리셋만 함).
        Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [TRAVEL, -TRAVEL],
  });

  // 양 끝에서는 흐리게, 가운데서 선명하게 — 실제로 훑는 느낌이 납니다.
  const fingerOpacity = progress.interpolate({
    inputRange: [0, 0.25, 0.75, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: appear,
          transform: [
            { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="안내 닫기"
        onPress={onDismiss}
        style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.track}>
          {/* 훑고 지나간 자리를 나타내는 연한 선 */}
          <View style={[styles.trail, { backgroundColor: c.surfaceAlt }]} />
          <Animated.Text
            style={[styles.finger, { opacity: fingerOpacity, transform: [{ translateX }] }]}>
            👆
          </Animated.Text>
        </View>

        <Text style={[styles.title, { color: c.text }]}>옆으로 밀어보세요</Text>
        <Text style={[styles.body, { color: c.textSecondary }]}>
          왼쪽으로 밀면 대화, 오른쪽으로 밀면 게임이에요.
        </Text>
        <Text style={[styles.close, { color: c.primary }]}>탭하면 닫혀요</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // 화면 전체를 덮되 box-none이라 카드 말고는 터치가 그대로 통과합니다.
    // (pointerEvents는 prop이 아니라 style로 줘야 합니다 — prop 쪽은 deprecated)
    pointerEvents: 'box-none',
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
    // 화면 위에 떠 있는 느낌.
    // shadowColor/shadowOffset 같은 옛 속성은 deprecated라 boxShadow로 씁니다.
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
  },
  track: {
    width: TRAVEL * 2 + 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  trail: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: Radius.pill,
  },
  finger: {
    fontSize: 28,
  },
  title: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  body: {
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  close: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
});

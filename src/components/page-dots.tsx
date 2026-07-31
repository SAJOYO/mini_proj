import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DOT_SIZE = 8;
const ACTIVE_WIDTH = 22;

type PageDotsProps = {
  /** 전체 페이지 수 */
  count: number;
  /** 현재 페이지 (0부터) */
  index: number;
};

/**
 * 지금 몇 번째 화면인지 알려주는 점 인디케이터.
 *
 * 탭바가 없는 구조라 "화면이 2개이고 지금 여기다"를 알려줄 게 이것뿐입니다.
 * 일부러 눌러도 반응하지 않게 만들었습니다 — 이동은 스와이프로만 합니다.
 */
export function PageDots({ count, index }: PageDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const c = useTheme();

  // useState 지연 초기화 — Animated.Value를 렌더마다 새로 만들지 않습니다.
  const [progress] = useState(() => new Animated.Value(active ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      // width는 네이티브 드라이버로 애니메이션할 수 없어서 JS로 돌립니다.
      // 점 2~3개짜리라 비용은 무시해도 됩니다.
      useNativeDriver: false,
    }).start();
  }, [active, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [DOT_SIZE, ACTIVE_WIDTH],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          backgroundColor: active ? c.primary : c.border,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    // 눌러도 반응하지 않게 — 이동은 스와이프로만 합니다.
    // (pointerEvents는 prop이 아니라 style로 줘야 합니다 — prop 쪽은 deprecated)
    pointerEvents: 'none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: Radius.pill,
  },
});

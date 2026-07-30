import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ActivityBarProps = {
  /** 진행 중 문구. 예: "밥을 먹는 중" */
  label: string;
  emoji: string;
  /** 총 걸리는 시간(ms). 이 시간에 걸쳐 게이지가 찹니다. */
  durationMs: number;
  /** 게이지가 다 차면 호출됩니다. 여기서 실제 돌봄을 적용하세요. */
  onDone: () => void;
};

/**
 * 돌봄이 진행되는 동안 보여주는 진행 바.
 *
 * 연타를 막는 방법으로 쿨다운(버튼 잠그고 기다리게 하기) 대신 이걸 골랐습니다.
 * 같은 시간을 쓰지만 "밥을 먹는 중"이라는 상태가 화면에 남아서, 기다림이
 * 제약이 아니라 장면이 됩니다.
 *
 * 효과는 **끝날 때** 적용됩니다(onDone). 먹기 전에 배가 부르면 어색하니까요.
 */
export function ActivityBar({ label, emoji, durationMs, onDone }: ActivityBarProps) {
  const c = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.linear,
      // width를 애니메이션하므로 네이티브 드라이버를 쓸 수 없습니다.
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished) onDone();
    });

    return () => animation.stop();
  }, [progress, durationMs, onDone]);

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.primary }]}>
      <View style={styles.labelRow}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.label, { color: c.text }]}>{label}입니다...</Text>
      </View>

      <View
        style={[styles.track, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
        accessibilityRole="progressbar"
        accessibilityLabel={label}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: c.primary,
              width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 18,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});

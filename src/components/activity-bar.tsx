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
  /**
   * 게이지만 얇게 그립니다(카드·문구 없이).
   *
   * 돌봄 버튼 안에 넣으려고 만든 모양입니다. 버튼 아래쪽 한 줄(사이드이펙트
   * 안내가 있던 자리)에 그대로 들어가서, 어느 버튼이 진행 중인지가 버튼
   * 자신에게 나타납니다.
   */
  compact?: boolean;
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
export function ActivityBar({ label, emoji, durationMs, onDone, compact }: ActivityBarProps) {
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

  const track = (
    <View
      style={[
        compact ? styles.trackCompact : styles.track,
        { backgroundColor: c.surfaceAlt, borderColor: c.border },
      ]}
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
  );

  if (compact) return track;

  return (
    <View style={[styles.wrap, { backgroundColor: c.surface, borderColor: c.primary }]}>
      <View style={styles.labelRow}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.label, { color: c.text }]}>{label}입니다...</Text>
      </View>

      {track}
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
  trackCompact: {
    // 돌봄 버튼의 안내 한 줄 자리에 들어갑니다. 그 줄 높이(캡션 글자)와
    // 비슷해야 진행 중일 때만 버튼이 늘었다 줄지 않습니다.
    height: 6,
    // 버튼 안쪽 폭을 다 채우지 않습니다. 테두리까지 닿으면 게이지가 버튼의
    // 일부처럼 보여서, 진행 중이라는 것보다 버튼이 이상해 보입니다.
    width: '70%',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});

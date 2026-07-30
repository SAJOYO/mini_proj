import { StyleSheet, Text, View } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatBarProps = {
  label: string;
  emoji: string;
  /** 0~100 */
  value: number;
  /** 이 값 밑이면 경고 색으로 칠합니다. */
  warnBelow?: number;
};

/** 배고픔·행복·청결처럼 0~100 값을 보여주는 가로 게이지. */
export function StatBar({ label, emoji, value, warnBelow = 30 }: StatBarProps) {
  const c = useTheme();

  const clamped = Math.max(0, Math.min(100, value));
  const low = clamped < warnBelow;

  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{emoji}</Text>

      <View style={styles.main}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
          <Text style={[styles.value, { color: low ? c.danger : c.textSecondary }]}>
            {Math.round(clamped)}
          </Text>
        </View>

        <View
          style={[styles.track, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
          <View
            style={[
              styles.fill,
              { width: `${clamped}%`, backgroundColor: low ? c.danger : c.primary },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  main: {
    flex: 1,
    gap: 2,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  value: {
    fontSize: FontSize.caption,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});

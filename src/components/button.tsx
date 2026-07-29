import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  /** primary = 꽉 찬 강조 버튼, secondary = 테두리만, ghost = 배경 없음 */
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  /** true면 라벨 대신 스피너를 보여주고 눌리지 않습니다. */
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const c = useTheme();
  const inactive = disabled || loading;

  const surface: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: c.primary }
      : variant === 'secondary'
        ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.border }
        : { backgroundColor: 'transparent' };

  const labelColor =
    variant === 'primary' ? c.onPrimary : variant === 'secondary' ? c.text : c.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        surface,
        inactive && styles.inactive,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  inactive: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});

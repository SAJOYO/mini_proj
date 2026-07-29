import { Colors, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * 현재 라이트/다크 모드에 맞는 색상 팔레트를 돌려줍니다.
 *
 *   const c = useTheme();
 *   <View style={{ backgroundColor: c.background }} />
 */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}

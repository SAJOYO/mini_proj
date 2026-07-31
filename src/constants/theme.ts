/**
 * 앱 전역 디자인 토큰.
 *
 * 색상은 라이트/다크 모드 두 벌로 정의되어 있고, `useTheme()` 훅으로 꺼내 씁니다.
 * 새 화면을 만들 때 색상 값을 직접 하드코딩하지 말고 여기 있는 토큰을 쓰세요.
 * (팀원끼리 화면 톤이 제각각이 되는 걸 막는 게 목적입니다.)
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#FFF7EF',
    surface: '#FFFFFF',
    surfaceAlt: '#FDEEE3',
    text: '#3D2B23',
    textSecondary: '#8A7268',
    primary: '#FF8A5B',
    onPrimary: '#FFFFFF',
    border: '#F0DCCD',
    danger: '#E5484D',
  },
  dark: {
    background: '#1C1614',
    surface: '#262019',
    surfaceAlt: '#312820',
    text: '#F5EBE3',
    textSecondary: '#B8A79C',
    primary: '#FF9A6E',
    onPrimary: '#2A1810',
    border: '#3D322A',
    danger: '#FF6369',
  },
} as const;

export type ThemeColorName = keyof typeof Colors.light;
/** 라이트/다크가 같은 키를 갖되, 값은 그냥 색 문자열로 다룹니다. */
export type ThemeColors = { readonly [K in ThemeColorName]: string };

/** 4의 배수 스케일. 여백은 이 값들 안에서 고르세요. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** 다마고치 감성에 맞게 전반적으로 둥글게. */
export const Radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const FontSize = {
  caption: 13,
  body: 15,
  label: 17,
  title: 22,
  display: 30,
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
  web: { sans: 'system-ui', rounded: 'system-ui', mono: 'monospace' },
});

/** 태블릿/웹에서 내용이 과하게 늘어나지 않도록 하는 상한. */
export const MaxContentWidth = 480;

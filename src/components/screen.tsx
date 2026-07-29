import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = {
  children: ReactNode;
  /** 세로 가운데 정렬. 로딩/시작 화면처럼 내용이 적을 때 씁니다. */
  center?: boolean;
  /** 내용이 길어 스크롤이 필요할 때. center와 같이 쓰지 마세요. */
  scroll?: boolean;
  style?: ViewStyle;
};

/**
 * 모든 화면의 바깥 껍데기.
 *
 * 배경색 · 안전영역(노치/홈바) · 좌우 여백 · 최대 너비를 한 번에 처리합니다.
 * 새 화면을 만들 때는 무조건 이걸로 감싸주세요.
 */
export function Screen({ children, center, scroll, style }: ScreenProps) {
  const c = useTheme();

  const inner = <View style={[styles.content, center && styles.centered, style]}>{children}</View>;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: c.background }]}
      edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.body}>{inner}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
  },
  scrollBody: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

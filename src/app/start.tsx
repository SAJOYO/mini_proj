import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 시작 화면.
 *
 * 앱 소개 + [시작하기] 버튼 하나. 누르면 로그인으로 넘어갑니다.
 */
export default function StartScreen() {
  const c = useTheme();
  const router = useRouter();

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.mascot, { backgroundColor: c.surfaceAlt }]}>
          <Text style={styles.mascotFace}>🐶</Text>
        </View>

        <Text style={[styles.title, { color: c.text }]}>나를 닮은{'\n'}반려동물 키우기</Text>

        <Text style={[styles.description, { color: c.textSecondary }]}>
          사진 한 장이면 나와 닮은 동물을 찾아드려요.{'\n'}그 아이를 캐릭터로 만들어 함께 키우고,
          {'\n'}
          말도 걸어보세요.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="시작하기" onPress={() => router.push('/login')} />
        <Text style={[styles.caption, { color: c.textSecondary }]}>
          로그인 정보는 이 기기에만 저장됩니다.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  mascot: {
    width: 132,
    height: 132,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotFace: {
    fontSize: 64,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
  },
  description: {
    fontSize: FontSize.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  caption: {
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
});

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

/** 저장소를 아무리 빨리 읽어도 이 시간만큼은 로딩 화면을 보여줍니다(깜빡임 방지). */
const MIN_SPLASH_MS = 1400;

/**
 * 로딩 화면 (앱 진입점).
 *
 * 저장된 로그인 정보를 다 읽고 나서 /start로 보냅니다.
 * 기존 사용자냐 첫 사용자냐를 갈라 보내는 판단은 /start가 합니다.
 * (여기서 바로 갈라 보내면 시작 화면을 아예 못 보게 돼서, 되돌아올 방법이 없어집니다.)
 *
 * 여기서 isLoading을 기다리는 이유: /start가 user를 보고 버튼 문구와
 * 다음 화면을 정하기 때문에, 읽기가 끝난 뒤에 넘겨야 화면이 깜빡이지 않습니다.
 */
export default function LoadingScreen() {
  const c = useTheme();
  const { isLoading } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);

  // useState의 지연 초기화로 Animated.Value를 딱 한 번만 만듭니다.
  // (useRef(...).current 는 렌더 중 ref 접근이라 react-hooks 규칙에 걸립니다)
  const [bounce] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 마스코트가 통통 튀는 루프
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 0,
          duration: 520,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const ready = !isLoading && minTimePassed;
  if (ready) {
    return <Redirect href="/start" />;
  }

  const translateY = bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const scaleX = bounce.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });

  return (
    <Screen center>
      <Animated.View
        style={[
          styles.mascot,
          { backgroundColor: c.surfaceAlt, transform: [{ translateY }, { scaleX }] },
        ]}>
        <Text style={styles.mascotFace}>🐾</Text>
      </Animated.View>

      <Text style={[styles.title, { color: c.text }]}>나를 닮은 반려동물</Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>불러오는 중...</Text>

      <View style={[styles.dots]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} index={i} color={c.primary} />
        ))}
      </View>
    </Screen>
  );
}

/** 순서대로 깜빡이는 로딩 점 3개. */
function Dot({ index, color }: { index: number; color: string }) {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(index * 180),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.delay((2 - index) * 180),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [index, opacity]);

  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />;
}

const styles = StyleSheet.create({
  mascot: {
    width: 112,
    height: 112,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  mascotFace: {
    fontSize: 52,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: FontSize.body,
    marginTop: Spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
});

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { usePet } from '@/lib/pet';

/** 저장소를 아무리 빨리 읽어도 이 시간만큼은 로딩 화면을 보여줍니다(깜빡임 방지). */
const MIN_SPLASH_MS = 1400;

/**
 * 로딩 화면 (앱 진입점).
 *
 * 로컬에 저장된 로그인 정보와 캐릭터를 읽어보고
 *   - 로그인 + 키우는 캐릭터 있음 → /game
 *   - 로그인만 되어 있음         → /photo
 *   - 로그인 안 됨               → /start
 * 로 보냅니다.
 */
export default function LoadingScreen() {
  const c = useTheme();
  const { user, isLoading } = useAuth();
  const { pet, isLoading: petLoading } = usePet();
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

  const ready = !isLoading && !petLoading && minTimePassed;
  if (ready) {
    // 이미 키우는 캐릭터가 있으면 사진 화면을 건너뛰고 바로 게임으로
    if (user) return <Redirect href={pet ? '/game' : '/photo'} />;
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

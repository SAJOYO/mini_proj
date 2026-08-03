import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

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

/**
 * 배고픔·행복·청결처럼 0~100 값을 보여주는 가로 게이지.
 *
 * 값이 바뀌면 **부드럽게 차오릅니다.** 숫자가 툭 바뀌면 돌봄이 실제로 뭘 했는지
 * 눈에 남지 않아서, 채워지는 과정을 보여주는 쪽을 택했습니다.
 * (width는 네이티브 드라이버로 못 돌려서 useNativeDriver: false입니다)
 *
 * 레이아웃은 이모지 · 게이지 · 숫자를 **한 줄**에 둡니다. 라벨을 따로 한 줄
 * 쓰면 게이지 세 개가 화면을 크게 차지해서, 라벨은 이모지와 접근성 정보로
 * 대신합니다.
 */
export function StatBar({ label, emoji, value, warnBelow = 30 }: StatBarProps) {
  const c = useTheme();

  const clamped = Math.max(0, Math.min(100, value));
  const low = clamped < warnBelow;

  // 지연 초기화로 Animated.Value를 딱 한 번만 만듭니다(첫 값은 애니메이션 없이 그대로).
  const [width] = useState(() => new Animated.Value(clamped));

  useEffect(() => {
    Animated.timing(width, {
      toValue: clamped,
      duration: 420,
      useNativeDriver: false,
    }).start();
  }, [clamped, width]);

  return (
    <View style={styles.row}>
      <Text style={styles.emoji} accessibilityElementsHidden>
        {emoji}
      </Text>

      <View
        style={[styles.track, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}>
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: low ? c.danger : c.primary,
              width: width.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/*
        numberOfLines 는 칸이 모자랄 때 줄을 바꾸는 대신 잘라내라는 뜻입니다.
        아래 width 로 세 자리는 들어가지만, 글꼴이 큰 기기에서까지 장담할 수는
        없어서 안전장치로 둡니다 — 잘리는 편이 두 줄로 접히는 것보다 낫습니다.
      */}
      <Text style={[styles.value, { color: low ? c.danger : c.textSecondary }]} numberOfLines={1}>
        {Math.round(clamped)}
      </Text>
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
    fontSize: 15,
    width: 20,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  value: {
    fontSize: FontSize.caption,
    fontVariant: ['tabular-nums'],
    // 세 자리("100")가 들어가는 너비. 24 였을 때 폰에서만 줄이 바뀌었습니다 —
    // 웹은 글꼴 지표가 달라 아슬아슬하게 들어가서 티가 안 났습니다.
    // 게이지(track)는 flex 라 여기서 늘린 만큼 알아서 줄어듭니다.
    width: 30,
    textAlign: 'right',
  },
});

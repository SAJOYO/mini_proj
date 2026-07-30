import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type FloatingEmojisProps = {
  /** 띄울 이모지. */
  emoji: string;
  /**
   * 이 값이 바뀔 때마다 새로 한 세트가 떠오릅니다.
   * (`key`로 재마운트시키는 대신 값으로 트리거해서, 연속으로 눌러도 이어집니다)
   */
  trigger: number;
  /** 한 번에 띄울 개수. */
  count?: number;
};

/**
 * 돌봄·쓰다듬기 직후 이모지가 위로 떠오르며 사라지는 연출.
 *
 * 아바타 위에 겹쳐 놓고 씁니다. 터치를 먹지 않도록 pointerEvents="none"이라
 * 아래에 있는 아바타를 계속 누를 수 있습니다.
 */
export function FloatingEmojis({ emoji, trigger, count = 3 }: FloatingEmojisProps) {
  // 개수가 고정이므로 Animated.Value도 한 번만 만들어 재사용합니다.
  const [progress] = useState(() => Array.from({ length: count }, () => new Animated.Value(0)));

  useEffect(() => {
    if (trigger === 0) return;

    const animations = progress.map((value, i) => {
      value.setValue(0);
      return Animated.timing(value, {
        toValue: 1,
        duration: 900,
        // 하나씩 조금씩 늦게 출발해야 뭉쳐 보이지 않습니다.
        delay: i * 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      });
    });

    const group = Animated.parallel(animations);
    group.start();
    return () => group.stop();
  }, [trigger, progress]);

  return (
    <View style={styles.layer} pointerEvents="none">
      {progress.map((value, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.emoji,
            {
              // 가운데를 기준으로 좌우로 벌립니다.
              left: `${38 + i * 12}%`,
              opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -64] }) },
                {
                  scale: value.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.6, 1.1, 0.9],
                  }),
                },
              ],
            },
          ]}>
          {emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // 아바타 위쪽 절반에서 떠오르게 합니다.
    justifyContent: 'flex-start',
  },
  emoji: {
    position: 'absolute',
    top: '18%',
    fontSize: 20,
  },
});

import { TopTabs, type MaterialTopTabBarProps } from 'expo-router/js-top-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageDots } from '@/components/page-dots';
import { SwipeHint } from '@/components/swipe-hint';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { loadSwipeHintSeen, markSwipeHintSeen } from '@/lib/storage';

/**
 * 게임 / 대화 두 화면을 스와이프로만 오가는 레이아웃.
 *
 * ## 왜 탭 네비게이터인가
 * 그냥 가로 ScrollView로도 밀 수는 있지만, 그러면 두 화면이 한 파일에 들어갑니다.
 * 탭으로 만들면 화면마다 파일이 따로 생겨서
 *   - 게임(조윤주·최윤우)과 대화(장유빈·임승현)를 각자 건드려도 충돌이 안 나고
 *   - `/game`, `/chat` 주소로 바로 들어갈 수 있습니다.
 *
 * ## 왜 @react-navigation/material-top-tabs가 아닌가
 * Expo SDK 56부터 expo-router가 react-navigation과 호환되지 않습니다.
 * 그 패키지를 쓰면 번들 단계에서 바로 에러가 납니다.
 * 대신 expo-router가 같은 것을 내장하고 있어서 `expo-router/js-top-tabs`를 씁니다.
 * (내부적으로 react-native-tab-view / react-native-pager-view를 쓰는데,
 *  expo-router가 이걸 의존성으로 선언하지 않아서 package.json에 직접 넣어뒀습니다.
 *  둘 중 하나라도 지우면 화면이 안 뜹니다.)
 *
 * ## 탭바가 없는 이유
 * 탭 구분은 유지하되 이동은 제스처로만 하기로 했습니다.
 * 그래서 `tabBar` 자리에 이동 기능이 없는 점 인디케이터만 그려 넣습니다.
 * (탭바를 완전히 null로 두면 지금 어느 화면인지 알 방법이 없어집니다.)
 *
 * 화면을 추가하려면: 이 폴더에 파일을 만들고 아래 <TopTabs.Screen>에 순서대로 추가하세요.
 * 점 개수는 자동으로 따라갑니다.
 *
 * ## 이 파일을 고칠 때 주의할 점 (실제로 버그를 냈던 부분)
 * 이 컴포넌트가 리렌더되면 네비게이터도 통째로 리렌더됩니다.
 * 웹에서 쓰는 스와이프 구현(PanResponderAdapter)은 스프링 애니메이션이 **끝나는
 * 콜백에서** 현재 인덱스를 커밋하는데, 그 사이에 리렌더가 끼면 커밋이 누락됩니다.
 * 그러면 화면은 대화인데 내부 인덱스는 0(게임)으로 남고, 되돌아오는 방향의
 * 드래그만 무시되는 이상한 증상이 납니다.
 *
 * 그래서
 *   - 여기서 현재 인덱스를 state로 들고 있지 않습니다 (DotBar가 직접 받습니다).
 *   - tabBar 함수와 screenOptions 객체를 매 렌더 새로 만들지 않습니다.
 * 새 prop을 추가할 때도 이 두 가지를 지켜주세요.
 */

export default function TabsLayout() {
  const c = useTheme();

  const [hintEnabled, setHintEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSwipeHintSeen().then((seen) => {
      if (!cancelled && !seen) setHintEnabled(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissHint = useCallback(() => {
    setHintEnabled(false);
    // 실패해도 다음에 한 번 더 뜨는 정도라 무시합니다.
    markSwipeHintSeen().catch(() => {});
  }, []);

  // props 타입을 직접 적어줘야 합니다 (TopTabs 쪽 타입이 여기까지 안 내려옵니다).
  const renderTabBar = useCallback((props: MaterialTopTabBarProps) => <DotBar {...props} />, []);

  const screenOptions = useMemo(
    () => ({ swipeEnabled: true, sceneStyle: { backgroundColor: c.background } }),
    [c.background],
  );

  // 손을 대기 시작한 순간 안내를 치웁니다.
  // 인덱스가 바뀌는 걸 기다리지 않으므로 네비게이터 상태를 건드리지 않습니다.
  const screenListeners = useMemo(() => ({ swipeStart: dismissHint }), [dismissHint]);

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <TopTabs
        initialRouteName="game"
        tabBarPosition="bottom"
        tabBar={renderTabBar}
        screenListeners={screenListeners}
        screenOptions={screenOptions}>
        {/* 선언 순서가 곧 좌우 배치 순서입니다. 게임이 왼쪽, 대화가 오른쪽. */}
        <TopTabs.Screen name="game" />
        <TopTabs.Screen name="chat" />
      </TopTabs>

      {hintEnabled && <SwipeHint onDismiss={dismissHint} />}
    </View>
  );
}

/** 탭바 자리에 들어가는 점 인디케이터. 현재 인덱스는 네비게이터가 직접 줍니다. */
function DotBar({ state }: MaterialTopTabBarProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: c.background,
          paddingBottom: insets.bottom + Spacing.md,
        },
      ]}>
      <PageDots count={state.routes.length} index={state.index} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  bar: {
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
});

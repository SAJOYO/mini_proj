import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

// 구독할 외부 스토어가 없으므로 아무것도 하지 않는 구독 함수.
const subscribe = () => () => {};

/**
 * 웹 전용 버전.
 *
 * 웹은 서버에서 HTML을 미리 만들어 두는데(정적 렌더링), 그 시점엔 사용자의
 * 다크모드 설정을 알 수 없습니다. 서버와 클라이언트가 다른 값을 내면
 * hydration 에러가 나므로, 브라우저에 붙기 전까지는 무조건 'light'를 씁니다.
 */
export function useColorScheme() {
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true, // 클라이언트
    () => false, // 서버(정적 렌더링)
  );

  const colorScheme = useRNColorScheme();

  return isHydrated ? colorScheme : 'light';
}

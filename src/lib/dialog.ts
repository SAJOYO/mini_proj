import { Alert, Platform } from 'react-native';

/**
 * 알림 창과 확인 창.
 *
 * ⚠️ **react-native-web의 `Alert`는 아무 동작도 하지 않는 빈 함수입니다.**
 *   class Alert { static alert() {} }
 *
 * 그래서 웹에서 `Alert.alert(...)`을 쓰면 창이 뜨지 않고, 버튼에 걸어둔
 * onPress도 영원히 실행되지 않습니다. "버튼을 눌렀는데 아무 일도 안 일어난다",
 * "에러가 났을 텐데 아무 메시지도 안 뜬다" 증상은 대개 이게 원인입니다.
 *
 * 그래서 화면 코드에서는 `Alert`를 직접 쓰지 말고 이 파일의 두 함수를 쓰세요.
 *   - 알려주기만 하면 됨      → notify()
 *   - 사용자 확인을 받아야 함  → confirmAction()
 */

/** 플랫폼에 상관없이 동작하는 알림 창. */
export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** 플랫폼에 상관없이 동작하는 확인 창. 확인을 누르면 true. */
export function confirmAction(options: {
  title: string;
  message: string;
  /** 확인 버튼 문구. */
  confirmLabel: string;
  /** 되돌릴 수 없는 동작이면 true (빨간 글씨). */
  destructive?: boolean;
}): Promise<boolean> {
  const { title, message, confirmLabel, destructive = false } = options;

  if (Platform.OS === 'web') {
    // 브라우저 confirm은 줄바꿈만 지원해서 제목과 본문을 붙여 보여줍니다.
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      // 안드로이드에서 바깥을 눌러 닫은 경우도 "취소"로 봅니다.
      { onDismiss: () => resolve(false) },
    );
  });
}

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';

// 네이티브 스플래시를 JS가 뜰 때까지 붙잡아 둡니다.
// (흰 화면이 깜빡이는 걸 막는 용도이고, 실제 로딩 UI는 app/index.tsx가 담당합니다.)
SplashScreen.preventAutoHideAsync();

/** react-navigation 테마를 우리 팔레트에 맞춰 덮어씁니다. */
const navLight = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    primary: Colors.light.primary,
  },
};

const navDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    primary: Colors.dark.primary,
  },
};

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  useEffect(() => {
    // JS 번들이 올라왔으니 네이티브 스플래시는 내려도 됩니다.
    SplashScreen.hideAsync().catch(() => {
      // 이미 내려간 경우 등 — 무시해도 되는 에러입니다.
    });
  }, []);

  return (
    // 제스처(스와이프로 화면 넘기기)를 쓰려면 앱 전체를 이걸로 감싸야 합니다.
    // 안드로이드에서는 이게 없으면 제스처가 아예 먹지 않습니다.
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider value={isDark ? navDark : navLight}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: {
                  backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
                },
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

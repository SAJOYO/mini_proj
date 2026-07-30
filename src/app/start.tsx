import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { loadPhotoUri } from '@/lib/storage';

/**
 * 시작 화면.
 *
 * 버튼은 하나지만 누른 사람이 어디까지 해봤는지에 따라 목적지가 달라집니다.
 *
 *   저장된 닉네임 없음        → /login   (첫 사용자: 로그인 → 사진 → 게임)
 *   닉네임 있고 사진 없음     → /photo   (중간에 그만둔 사람: 남은 단계만)
 *   닉네임·사진 둘 다 있음    → /game    (기존 사용자: 곧바로 게임)
 *
 * "사진을 넣었는가"를 기준으로 삼은 이유: 사진이 있어야 캐릭터가 생기고,
 * 캐릭터가 있어야 게임 화면이 의미가 있습니다.
 */
export default function StartScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  // null = 아직 저장소를 읽는 중
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPhotoUri().then((uri) => {
      if (!cancelled) setHasPhoto(uri !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const checking = hasPhoto === null;
  const returning = user !== null && hasPhoto === true;

  // '/game'은 src/app/(tabs)/game.tsx 입니다.
  // 괄호로 묶은 폴더((tabs))는 주소에 나타나지 않습니다.
  const destination: Href = user === null ? '/login' : hasPhoto ? '/game' : '/photo';

  function handleStart() {
    if (checking) return;
    // replace를 쓰는 이유: 시작 화면으로 뒤로가기할 일이 없습니다.
    // (게임 화면에서 뒤로 눌렀다가 다시 시작 화면이 나오면 어색합니다.)
    router.replace(destination);
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.mascot, { backgroundColor: c.surfaceAlt }]}>
          <Text style={styles.mascotFace}>🐶</Text>
        </View>

        {returning ? (
          <>
            <Text style={[styles.title, { color: c.text }]}>
              다시 만나서{'\n'}반가워요, {user.nickname}님
            </Text>
            <Text style={[styles.description, { color: c.textSecondary }]}>
              기다리던 아이가 있어요.{'\n'}이어서 키워볼까요?
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: c.text }]}>나를 닮은{'\n'}반려동물 키우기</Text>
            <Text style={[styles.description, { color: c.textSecondary }]}>
              사진 한 장이면 나와 닮은 동물을 찾아드려요.{'\n'}그 아이를 캐릭터로 만들어 함께
              키우고,{'\n'}말도 걸어보세요.
            </Text>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          label={returning ? '이어서 키우기' : '시작하기'}
          onPress={handleStart}
          loading={checking}
        />
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

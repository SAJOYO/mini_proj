import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { pickRandomBreed } from '@/lib/breeds';
import { confirmAction, notify } from '@/lib/dialog';
import { usePet } from '@/lib/pet';
import { clearPhotoUri, loadPhotoUri, savePhotoUri } from '@/lib/storage';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
};

/**
 * 사진 업로드 화면.
 *
 * 고른 사진의 로컬 URI만 저장합니다(원본 파일은 기기 캐시에 그대로 있음).
 * 이 URI가 이후 "닮은 동물 찾기"의 입력값이 됩니다.
 */
export default function PhotoScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { pet, release } = usePet();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // 이전에 골라둔 사진이 있으면 복원
    loadPhotoUri().then(setPhotoUri);
  }, []);

  async function applyResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;

    const uri = result.assets[0]?.uri;
    if (!uri) return;

    setPhotoUri(uri);
    await savePhotoUri(uri);
  }

  async function pickFromLibrary() {
    setBusy(true);
    try {
      await applyResult(await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS));
    } catch {
      notify('사진을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        notify('카메라 권한이 필요해요', '설정에서 카메라 접근을 허용해 주세요.');
        return;
      }
      await applyResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch {
      notify('카메라를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoUri(null);
    await clearPhotoUri();
  }

  /**
   * 닮은 동물 분석 → 게임 화면으로.
   *
   * TODO(홍가연): 지금은 강아지 품종 하나를 **랜덤으로** 돌려주는 가짜 구현입니다.
   * 실제 검색이 붙으면 pickRandomBreed() 자리에 분석 결과를 넣어주세요.
   * 게임 쪽은 품종 문자열만 받으면 되므로 이 함수 안만 고치면 됩니다.
   */
  async function analyze() {
    if (!photoUri) return;

    // 키우는 친구가 남아 있으면 게임 화면이 넘겨받은 품종을 무시합니다
    // (game.tsx: 이미 캐릭터가 있으면 hatch를 건너뜁니다). 그대로 두면 분석
    // 결과가 말없이 버려지므로, 여기서 먼저 물어보고 자리를 비웁니다.
    if (pet) {
      const ok = await confirmAction({
        title: '지금 키우는 친구가 있어요',
        message: '새로 분석하면 지금까지 키운 기록은 사라집니다.',
        confirmLabel: '새로 시작하기',
        destructive: true,
      });
      if (!ok) return;

      await release();
    }

    setAnalyzing(true);
    try {
      // 분석하는 느낌만 내는 딜레이 (실제 검색이 붙으면 사라집니다)
      await new Promise((resolve) => setTimeout(resolve, 900));
      router.push({ pathname: '/game', params: { breed: pickRandomBreed(), photoUri } });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSignOut() {
    // 캐릭터도 함께 정리합니다 (다른 사람이 이어받는 상황을 막기 위해)
    await release();
    await signOut();
    router.replace('/start');
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: c.text }]}>
          안녕, <Text style={{ color: c.primary }}>{user?.nickname ?? '친구'}</Text>!
        </Text>
        <Pressable onPress={handleSignOut} hitSlop={8}>
          <Text style={[styles.signOut, { color: c.textSecondary }]}>로그아웃</Text>
        </Pressable>
      </View>

      <Text style={[styles.title, { color: c.text }]}>얼굴이 잘 보이는{'\n'}사진을 올려주세요</Text>

      <Pressable
        onPress={photoUri ? undefined : pickFromLibrary}
        disabled={busy}
        style={[
          styles.slot,
          {
            backgroundColor: c.surfaceAlt,
            borderColor: c.border,
            borderStyle: photoUri ? 'solid' : 'dashed',
          },
        ]}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
        ) : (
          <View style={styles.slotEmpty}>
            <Text style={styles.slotIcon}>📷</Text>
            <Text style={[styles.slotHint, { color: c.textSecondary }]}>눌러서 사진 고르기</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.actions}>
        {photoUri ? (
          <>
            <Button label="분석하기" onPress={analyze} loading={analyzing} />
            <Button
              label="다시 고르기"
              variant="secondary"
              onPress={removePhoto}
              disabled={busy || analyzing}
            />
          </>
        ) : (
          <>
            <Button label="앨범에서 고르기" onPress={pickFromLibrary} loading={busy} />
            {Platform.OS !== 'web' && (
              <Button
                label="카메라로 찍기"
                variant="secondary"
                onPress={takePhoto}
                disabled={busy}
              />
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greeting: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  signOut: {
    fontSize: FontSize.caption,
    textDecorationLine: 'underline',
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: Spacing.lg,
  },
  slot: {
    flex: 1,
    borderWidth: 2,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  slotEmpty: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  slotIcon: {
    fontSize: 44,
  },
  slotHint: {
    fontSize: FontSize.body,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  actions: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});

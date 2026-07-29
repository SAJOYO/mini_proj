import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
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

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      Alert.alert('사진을 불러오지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    setBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('카메라 권한이 필요해요', '설정에서 카메라 접근을 허용해 주세요.');
        return;
      }
      await applyResult(await ImagePicker.launchCameraAsync(PICKER_OPTIONS));
    } catch {
      Alert.alert('카메라를 열지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoUri(null);
    await clearPhotoUri();
  }

  async function handleSignOut() {
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
            {/*
              TODO(홍가연): 여기서 닮은 동물 찾기 화면으로 넘어갑니다.
              photoUri를 넘겨서 분석 결과를 받아오면 됩니다.
                router.push({ pathname: '/result', params: { photoUri } })
            */}
            <Button label="분석하기 (준비 중)" onPress={() => {}} disabled />
            <Button label="다시 고르기" variant="secondary" onPress={removePhoto} disabled={busy} />
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

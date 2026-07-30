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
import { toVisionImage } from '@/lib/image';
import { visionTarget } from '@/lib/llm/config';
import { createCharacterFromPhoto } from '@/lib/pipeline';
import { clearPhotoUri, loadPhotoUri, saveAnalysis, savePhotoUri } from '@/lib/storage';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8,
  // 고르는 즉시 base64 를 같이 받습니다. 바로 판정에 쓸 수 있어서 파일을
  // 다시 읽지 않아도 됩니다 (앱을 껐다 켠 경우에는 URI 로 다시 읽습니다).
  base64: true,
};

/** 판정 설정. 모듈 최상위에서 한 번만 읽습니다. 키가 없으면 null 입니다. */
const VISION = visionTarget();

/**
 * 사진 업로드 화면.
 *
 * 고른 사진의 로컬 URI만 저장합니다(원본 파일은 기기 캐시에 그대로 있음).
 * [분석하기]를 누르면 이 사진으로 품종 판정을 돌리고 결과를 저장합니다.
 */
export default function PhotoScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // 피커가 준 base64. 저장소에는 넣지 않습니다(사진 한 장이 수 MB).
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // 이전에 골라둔 사진이 있으면 복원 (base64 는 없으니 필요할 때 다시 읽습니다)
    loadPhotoUri().then(setPhotoUri);
  }, []);

  async function applyResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
    await savePhotoUri(asset.uri);
  }

  /**
   * 사진으로 캐릭터를 만들고 게임 화면으로 넘어갑니다.
   *
   * 결과는 저장해두고 다시 부르지 않습니다. 무료 티어가 하루 20건 남짓이라
   * 화면을 드나들 때마다 호출하면 금방 막힙니다.
   */
  async function analyze() {
    if (!photoUri || analyzing) return;

    if (!VISION) {
      Alert.alert(
        'API 키가 설정되지 않았어요',
        '.env 파일에 EXPO_PUBLIC_VISION_API_KEY 와 EXPO_PUBLIC_VISION_MODEL 을 넣고 앱을 다시 시작해 주세요. (.env.example 참고)',
      );
      return;
    }

    setAnalyzing(true);
    try {
      const image = await toVisionImage(photoUri, photoBase64);
      const { inference } = await createCharacterFromPhoto(image, VISION);

      await saveAnalysis({
        mix: inference.mix,
        face: inference.face,
        reasons: inference.reasons,
        createdAt: new Date().toISOString(),
      });

      router.replace('/game');
    } catch (error) {
      // 무엇이 잘못됐는지 보여줍니다. "실패했어요"만 띄우면 키 문제인지
      // 네트워크인지 모델이 이상한 걸 뱉은 건지 알 수가 없습니다.
      const reason = error instanceof Error ? error.message : String(error);
      Alert.alert('분석에 실패했어요', reason);
    } finally {
      setAnalyzing(false);
    }
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
    setPhotoBase64(null);
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
              TODO(홍가연): 판정 결과를 보여주는 화면이 여기와 게임 사이에 들어갑니다.
              지금은 판정만 하고 곧바로 게임으로 넘어갑니다. 결과는 저장돼 있으니
              (`loadAnalysis()`) 결과 화면을 만들 때 다시 부를 필요 없습니다.
            */}
            <Button
              label={analyzing ? '' : '분석하고 시작하기'}
              onPress={analyze}
              loading={analyzing}
              disabled={busy}
            />
            <Button
              label="다시 고르기"
              variant="secondary"
              onPress={removePhoto}
              disabled={busy || analyzing}
            />
            {!VISION && (
              <Text style={[styles.warn, { color: c.danger }]}>
                API 키가 없어서 분석이 안 됩니다. .env 를 확인해 주세요.
              </Text>
            )}
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
  warn: {
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
});

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
import { survivesReload, toVisionImage } from '@/lib/image';
import { visionTarget } from '@/lib/llm/config';
import { confirmAction, notify } from '@/lib/dialog';
import { usePet } from '@/lib/pet';
import { createCharacterFromPhoto } from '@/lib/pipeline';
import { dominantBreed, resolveMix } from '@/lib/persona';
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
  const { pet, hatch, release } = usePet();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // 피커가 준 base64. 저장소에는 넣지 않습니다(사진 한 장이 수 MB).
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // 이전에 골라둔 사진을 복원합니다. 단, 새로고침을 못 넘긴 URI 는 버립니다 —
    // 웹의 blob: 은 문자열만 남고 데이터가 사라져서, 복원하면 사진이 있는 것처럼
    // 보이는데 실제로는 못 읽습니다 (콘솔에 ERR_FILE_NOT_FOUND).
    // 지우면 "눌러서 사진 고르기" 상태로 돌아가고, 다시 고르면 정상입니다.
    loadPhotoUri().then(async (uri) => {
      if (cancelled) return;
      if (survivesReload(uri)) {
        setPhotoUri(uri);
      } else if (uri) {
        await clearPhotoUri();
      }
    });

    return () => {
      cancelled = true;
    };
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
   * 사진 → 판정 → 캐릭터 → 게임 화면.
   *
   * 한 번에 세 곳으로 갈라집니다.
   *   mix 전체   저장소(@pet/analysis) → 대화가 읽어서 성격을 만듭니다
   *   1순위 품종  hatch() → 게임 캐릭터의 생김새
   *   face       저장소 → 게임 화면이 "왜 이 동물인가"를 보여줍니다
   *
   * 결과는 저장해두고 다시 부르지 않습니다. 무료 한도가 빠듯해서 화면을
   * 드나들 때마다 호출하면 금방 막힙니다.
   */
  async function analyze() {
    if (!photoUri || analyzing) return;

    if (!VISION) {
      notify(
        'API 키가 설정되지 않았어요',
        '.env 파일에 EXPO_PUBLIC_VISION_API_KEY 와 EXPO_PUBLIC_VISION_MODEL 을 넣고 앱을 다시 시작해 주세요. (.env.example 참고)',
      );
      return;
    }

    // 키우던 친구가 있으면 먼저 물어봅니다. 새 판정 결과로 캐릭터를 다시 만들면
    // 지금까지 키운 기록이 사라지기 때문입니다.
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
      const image = await toVisionImage(photoUri, photoBase64);
      const { inference } = await createCharacterFromPhoto(image, VISION);

      await saveAnalysis({
        mix: inference.mix,
        face: inference.face,
        reasons: inference.reasons,
        createdAt: new Date().toISOString(),
      });

      // 겉모습은 1순위 품종으로 그립니다. 퍼센트는 성격(대화)에만 쓰입니다.
      await hatch(dominantBreed(resolveMix(inference.mix)), photoUri);

      router.replace('/game');
    } catch (error) {
      // 무엇이 잘못됐는지 보여줍니다. "실패했어요"만 띄우면 키 문제인지
      // 네트워크인지 모델이 이상한 걸 뱉은 건지 알 수가 없습니다.
      const reason = error instanceof Error ? error.message : String(error);
      notify('분석에 실패했어요', reason);
    } finally {
      setAnalyzing(false);
    }
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
    setPhotoBase64(null);
    await clearPhotoUri();
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
            <Button label="분석하기" onPress={analyze} loading={analyzing} disabled={busy} />
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

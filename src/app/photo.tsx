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
import {
  persistPhoto,
  photoFileExists,
  resolvePhoto,
  survivesReload,
  toVisionImage,
} from '@/lib/image';
import { visionTarget } from '@/lib/llm/config';
import { confirmAction, notify } from '@/lib/dialog';
import { usePet } from '@/lib/pet';
import { createCharacterFromPhoto } from '@/lib/pipeline';
import {
  clearPhotoUri,
  loadAnalysis,
  loadPhotoUri,
  saveAnalysis,
  savePhotoUri,
} from '@/lib/storage';

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
  const { pet, isLoading: petLoading, release } = usePet();

  /**
   * 저장에 쓰는 값. 웹에서는 **열쇠**(photo:source)라 그대로 화면에 못 씁니다.
   * 캐릭터(hatch)와 저장소에는 이 값이 들어갑니다.
   */
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  // 피커가 준 base64. 저장소에는 넣지 않습니다(사진 한 장이 수 MB).
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  /**
   * 저장된 판정이 있는지. 펫이 없으면 "아직 아무 동물도 안 고른 상태"라는 뜻입니다.
   *
   * 결과 화면에서 앱을 껐다 켜면 여기(/photo)로 돌아옵니다. 그때 다시
   * [분석하기]를 누르게 두면 **무료 한도를 한 건 더 태웁니다**(하루 20건).
   * 이미 받아둔 결과가 있으니 그리로 보내주는 게 맞습니다.
   */
  const [hasAnalysis, setHasAnalysis] = useState(false);

  /**
   * 화면에 띄우는 데 쓰는 주소. 열쇠를 꺼낸 결과입니다.
   *
   * 저장용 값(photoUri)과 나눠 둔 이유 — 꺼낸 주소는 blob: 이라 **그 탭에서만**
   * 유효합니다. 이걸 저장하면 새로고침 뒤에 죽은 주소가 남습니다.
   */
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolvePhoto(photoUri).then((uri) => {
      if (alive) setPreviewUri(uri);
    });
    return () => {
      alive = false;
    };
  }, [photoUri]);

  useEffect(() => {
    let cancelled = false;

    // 이전에 골라둔 사진을 복원합니다. 단, 새로고침을 못 넘긴 URI 는 버립니다 —
    // 웹의 blob: 은 문자열만 남고 데이터가 사라져서, 복원하면 사진이 있는 것처럼
    // 보이는데 실제로는 못 읽습니다 (콘솔에 ERR_FILE_NOT_FOUND).
    // 지우면 "눌러서 사진 고르기" 상태로 돌아가고, 다시 고르면 정상입니다.
    // 네이티브도 마찬가지입니다 — 형태는 멀쩡한 file: 인데 파일이 없을 수 있어서
    // (캐시가 비워진 경우) 실제로 있는지까지 확인합니다. 안 그러면 빈칸만 보입니다.
    loadPhotoUri().then(async (uri) => {
      if (cancelled) return;
      if (uri && survivesReload(uri) && (await photoFileExists(uri))) {
        if (!cancelled) setPhotoUri(uri);
      } else if (uri) {
        await clearPhotoUri();
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAnalysis().then((saved) => {
      if (!cancelled) setHasAnalysis(saved !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 펫 읽기가 끝난 뒤에 판단합니다. 아직 읽는 중이면 펫이 있어도 null 이라
  // "이어서 고르기"가 잠깐 떴다 사라집니다.
  const hasPendingChoice = hasAnalysis && !pet && !petLoading;

  async function applyResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) return;

    // 피커는 사진을 캐시에 둡니다. OS가 캐시를 비우면 파일이 사라지므로
    // 지워지지 않는 곳으로 옮겨두고 그 주소를 저장합니다 (lib/image.ts 참고).
    const uri = await persistPhoto(asset.uri);

    setPhotoUri(uri);
    setPhotoBase64(asset.base64 ?? null);
    await savePhotoUri(uri);
  }

  /**
   * 사진 → 판정 → **결과 화면**.
   *
   * 여기서 캐릭터를 만들지 않습니다. 판정 결과만 저장하고 `/result` 로 넘깁니다 —
   * 사용자가 3순위 중 하나를 고른 뒤에 그 화면이 `hatch()` 를 부릅니다.
   * (예전에는 1순위로 바로 캐릭터를 만들고 게임으로 갔습니다.)
   *
   *   mix · face · reasons  저장소(@pet/analysis) → 결과 화면과 대화가 읽습니다
   *   고른 품종             결과 화면이 chosen 으로 덧붙여 저장 → 성격의 기준점
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

      router.replace('/result');
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

      {/* 남는 세로 공간을 이 칸이 다 먹지 않게, 가운데에 정사각형으로 띄웁니다. */}
      <View style={styles.slotArea}>
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
            // 주소가 **준비된 뒤에만** 그립니다. 예전에는 photoUri 만 보고 먼저
            // 그리면서 주소 자리에 undefined 를 넘겼는데, 그 빈 source 를 붙잡고
            // 있다가 진짜 주소가 와도 다시 안 그리는 일이 있었습니다. 폰에서
            // 사진을 고른 직후 미리보기만 빈칸으로 남던 게 이것입니다
            // (파일은 멀쩡해서 판정도 사진 찍기 화면도 정상이었습니다).
            //
            // key 를 주소로 두는 것도 같은 이유입니다 — 사진을 바꾸면 새로
            // 붙어서, 앞 사진이 남아 있을 여지를 없앱니다.
            //
            // contain 입니다 — 잘라내지 않고 사진 전체를 보여줍니다.
            // 웹에서는 피커의 1:1 자르기(allowsEditing)가 동작하지 않아서 원본
            // 비율 그대로 들어옵니다. cover 로 두면 세로 사진의 위아래가, 가로
            // 사진의 좌우가 잘려서 "이 사진으로 판정된다"와 화면이 어긋납니다.
            previewUri ? (
              <Image
                key={previewUri}
                source={{ uri: previewUri }}
                style={styles.preview}
                contentFit="contain"
              />
            ) : null
          ) : (
            <View style={styles.slotEmpty}>
              <Text style={styles.slotIcon}>📷</Text>
              <Text style={[styles.slotHint, { color: c.textSecondary }]}>눌러서 사진 고르기</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.actions}>
        {/* 분석은 해뒀는데 아직 안 고른 사람. 다시 분석하면 한도를 또 씁니다. */}
        {hasPendingChoice && (
          <Button
            label="분석 결과 이어서 고르기"
            onPress={() => router.replace('/result')}
            disabled={busy || analyzing}
          />
        )}
        {photoUri ? (
          <>
            <Button
              // 안 고른 결과가 남아 있으면 그쪽이 주된 행동이라 한 단계 낮춥니다.
              // (여기서 다시 분석하면 하루 20건 한도를 한 건 더 씁니다.)
              label={hasPendingChoice ? '사진 다시 분석하기' : '분석하기'}
              variant={hasPendingChoice ? 'secondary' : undefined}
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
            <Button
              // 안 고른 결과가 남아 있으면 그 버튼이 주된 행동이라, 같은 색 버튼이
              // 둘 나란히 서지 않게 한 단계 낮춥니다.
              label="앨범에서 고르기"
              variant={hasPendingChoice ? 'secondary' : undefined}
              onPress={pickFromLibrary}
              loading={busy}
            />
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
  slotArea: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  slot: {
    // 피커가 1:1 로 잘라주므로 칸도 정사각형입니다. 화면이 세로로 길어도
    // 사진이 같이 커지지 않게 위쪽 한계를 둡니다.
    width: '100%',
    maxWidth: 260,
    aspectRatio: 1,
    alignSelf: 'center',
    borderWidth: 2,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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

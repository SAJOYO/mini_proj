import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PetCharacter } from '@/components/pet-character';
import { Screen } from '@/components/screen';
import { resolveBreed, resolveStage } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  latestOfStage,
  photoUri as albumPhotoUri,
  revokePhotoUri,
  SAVE_DENIED_MESSAGE,
  SAVE_SUCCESS_MESSAGE,
  savePhotoToDevice,
  type PhotoEntry,
} from '@/lib/album';
import { notify } from '@/lib/dialog';
import { resolvePhoto } from '@/lib/image';
import { usePet } from '@/lib/pet';
import { isRunning, usePhotoJob, type JobStatus } from '@/lib/photo-job';
import { buildKeepsakePrompt } from '@/lib/photo-prompt';

/**
 * 사진 찍기 화면.
 *
 * 게임에서 넘어온 재료(사진 + 프롬프트)로 ComfyUI에 사진 한 장을 주문하고
 * 결과를 보여줍니다. 서버와 이야기하는 부분은 전부 lib/comfy.ts에 있습니다 —
 * 이 파일은 "언제 부르고, 기다리는 동안 뭘 보여줄지"만 다룹니다.
 *
 * 게임 쪽에서 넘어오는 값은 다섯 개입니다(src/app/game.tsx의 goToKeepsake).
 *
 *   breed     품종 키. 한글 이름이 아니라 constants/pet.ts의 키입니다
 *   stage     성장 단계 키. 성장 직후 배너로 들어오면 **떠나온** 단계,
 *             헤더의 카메라 버튼으로 들어오면 지금 단계입니다
 *   photoUri  사용자가 올린 원본 사진. 인물이 여기서 나옵니다
 *   prompt    위 둘로 만든 생성용 문장 (src/lib/photo-prompt.ts)
 *   caption   사진에 얹을 한 줄 ("청소년기의 마지막 날")
 *
 * 문장을 다듬고 싶으면 이 화면을 고치지 마세요. 견종·단계별 묘사는
 * **20-breed-prompts/*.md**가 원본이고, `npm run prompts:build`가 그것을
 * constants/breed-prompt.ts로 찍어냅니다. 원본 사진을 지키는 규칙만
 * src/lib/photo-prompt.ts에 있습니다. 여기서 문자열을 이어붙이면 단계마다
 * 그림체가 갈립니다.
 * (넘어갈 문장을 눈으로 확인하려면 `npm run keepsake:prompt -- <품종> <단계>`)
 *
 * ⚠️ 결과 URL은 **ComfyUI 서버가 켜져 있는 동안만** 유효합니다. 서버를 끄면
 *    이미 만든 사진도 안 보입니다. 오래 남기려면 받아서 저장해야 합니다.
 */

/** 기다리는 동안 보여줄 안내. 단계가 넘어가는 게 보여야 멈춘 것처럼 안 느껴집니다. */
const STEP_TEXT: Partial<Record<JobStatus, string>> = {
  uploading: '사진을 보내는 중...',
  waiting: '그림을 그리는 중...',
  saving: '거의 다 됐어요...',
};

export default function PhotoGenScreen() {
  const c = useTheme();
  const router = useRouter();
  const job = usePhotoJob();
  const { pet } = usePet();

  // 넘어오는 건 **단계 하나뿐**입니다. 품종·사진은 pet에서 직접 읽고 문장은
  // 여기서 다시 만듭니다. 주소로 큰 값을 나르지 않기 위해서입니다
  // (game.tsx의 goToKeepsake 주석 참고).
  const params = useLocalSearchParams<{ stage?: string }>();
  const stage = resolveStage(params.stage);

  const breed = resolveBreed(pet?.breed);
  const { prompt, caption } = buildKeepsakePrompt(breed, stage);

  const busy = isRunning(job, stage);

  /**
   * 올린 사진을 지금 쓸 수 있는 주소로 바꿉니다.
   *
   * 웹에서는 저장된 값이 **열쇠**라 그대로는 못 씁니다(lib/image.ts 참고).
   * IndexedDB에서 꺼내 주소를 만들어야 화면에 띄울 수 있습니다.
   * 사진이 없거나 브라우저가 지웠으면 null이 되어 "사진 없음"으로 떨어집니다.
   */
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    resolvePhoto(pet?.photoUri).then((uri) => {
      if (alive) setPhotoUri(uri);
    });
    return () => {
      alive = false;
    };
  }, [pet?.photoUri]);

  /** 이 단계에서 마지막으로 만든 사진. 앨범에는 그 전 것들도 남아 있습니다. */
  const [latest, setLatest] = useState<PhotoEntry | null>(null);
  const [result, setResult] = useState<string | null>(null);
  /** 내려받는 중. 연타로 갤러리에 같은 사진이 여러 장 들어가는 것을 막습니다. */
  const [saving, setSaving] = useState(false);

  /**
   * 화면에 띄우려고 만든 blob: URL.
   *
   * createObjectURL은 명시적으로 지워주지 않으면 탭이 닫힐 때까지 메모리에
   * 남습니다. 한 장이 1MB가 넘어서 다시 만들 때마다 쌓이면 부담이 됩니다.
   */
  const objectUrl = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (objectUrl.current) revokePhotoUri(objectUrl.current);
    };
  }, []);

  /**
   * 이 단계에서 마지막에 만든 사진을 꺼내 옵니다.
   *
   * 화면에 들어올 때 한 번, 그리고 작업이 끝났을 때 한 번 더 봅니다.
   * (생성 자체는 lib/photo-job.tsx가 하고, 끝나면 앨범에 넣어둡니다)
   *
   * 자동으로 새로 만들지는 않습니다 — 한 장에 몇 분씩 걸리고 GPU를 쓰는
   * 일이라 사용자가 눌러서 시작해야 합니다.
   */
  useEffect(() => {
    let alive = true;

    latestOfStage(stage).then(async (entry) => {
      if (!alive || !entry) return;

      const uri = await albumPhotoUri(entry.id);
      if (!alive || !uri) return;

      if (objectUrl.current) revokePhotoUri(objectUrl.current);
      objectUrl.current = uri;
      setResult(uri);
      setLatest(entry);
    });

    return () => {
      alive = false;
    };
  }, [stage, job.status]);

  /** 이 화면을 봤으면 게임 화면의 완성 배지는 지웁니다. */
  useEffect(() => {
    if (job.unseen === stage) job.seen();
  }, [job, stage]);

  // 재료가 하나라도 없으면 부를 수가 없습니다. 원인을 나눠서 안내합니다.
  const missing = !photoUri ? '사진' : !prompt ? '프롬프트' : null;
  // 다른 단계 사진을 만드는 중이면 GPU가 하나뿐이라 줄을 서게 됩니다.
  const otherBusy = isRunning(job) && !busy;
  const error = job.stage === stage ? job.error : null;

  function run() {
    if (!photoUri || !prompt) return;
    void job.start({ breed, stage, caption, photoUri, prompt });
  }

  /**
   * 만든 사진을 기기에 내려받습니다.
   *
   * 결과를 반드시 말해줍니다. 폰에서는 갤러리로 들어가서 화면상 아무 변화가
   * 없는데, 아무 말이 없으면 눌린 건지조차 알 수 없습니다.
   */
  async function handleSave(entry: PhotoEntry) {
    setSaving(true);
    try {
      const result = await savePhotoToDevice(entry);
      if (result === 'saved') notify('사진을 내려받았어요', SAVE_SUCCESS_MESSAGE);
      else if (result === 'denied') notify('저장 권한이 필요해요', SAVE_DENIED_MESSAGE);
      else notify('사진을 내려받지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  /**
   * 게임 화면으로 돌아갑니다.
   *
   * back() 이 아니라 **언제나 게임으로** 보냅니다. 여기 들어오는 길이 여럿이라
   * (앨범, 성장 직후 배너) back() 은 그때그때 다른 곳으로 떨어집니다. 사진을
   * 다 만들고 나면 가고 싶은 곳은 대개 게임이지 앨범이 아닙니다 — 앨범으로
   * 돌아가 봐야 거기서 또 한 번 나가야 합니다.
   *
   * replace 인 것도 일부러입니다. push 로 쌓으면 뒤로 가기가 이 화면으로
   * 되돌아옵니다. 새로고침 뒤에 이력이 없어 back() 이 터지던 문제
   * ("GO_BACK was not handled")도 이걸로 같이 없어집니다 — 이 화면은 생성이
   * 몇 분씩 걸려서 그 사이 새로고침하는 일이 흔합니다.
   */
  function goBack() {
    router.replace('/game');
  }

  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>사진 찍기</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        {caption || '함께한 모습을 한 장으로 남겨 드려요.'}
      </Text>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>받은 재료</Text>

          <View style={styles.materials}>
            <View style={styles.material}>
              <PetCharacter breed={breed} stage={stage} animation="breathe" size={92} />
              <Text style={[styles.materialLabel, { color: c.textSecondary }]}>
                {breed} · {stage}
              </Text>
            </View>

            <View style={styles.material}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoEmpty, { borderColor: c.border }]}>
                  <Text style={{ color: c.textSecondary, fontSize: FontSize.caption }}>
                    사진 없음
                  </Text>
                </View>
              )}
              <Text style={[styles.materialLabel, { color: c.textSecondary }]}>올린 사진</Text>
            </View>
          </View>
        </View>

        {/*
          결과 자리. 만들기 전에도 빈 칸을 잡아둬서, 사진이 나온 순간
          아래 버튼들이 밀려나지 않게 합니다.
        */}
        <View style={[styles.stage, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          {busy ? (
            // 다시 만드는 중이면 전에 만든 사진 대신 진행 상황을 보여줍니다.
            <View style={styles.stageCenter}>
              <ActivityIndicator color={c.primary} />
              <Text style={[styles.stageText, { color: c.textSecondary }]}>
                {STEP_TEXT[job.status] ?? '준비 중...'}
              </Text>
              <Text style={[styles.stageHint, { color: c.textSecondary }]}>
                한 장에 3~4분쯤 걸려요.{'\n'}돌아가서 놀고 있어도 계속 만들어집니다
              </Text>
            </View>
          ) : result ? (
            <Image source={{ uri: result }} style={styles.resultImage} contentFit="cover" />
          ) : (
            <View style={styles.stageCenter}>
              <Text style={styles.stageIcon}>🖼️</Text>
              <Text style={[styles.stageText, { color: c.textSecondary }]}>
                {missing ? `${missing}이 없어 만들 수 없어요` : '아직 만들지 않았어요'}
              </Text>
            </View>
          )}
        </View>

        {error ? <Text style={[styles.message, { color: c.primary }]}>{error}</Text> : null}

        {latest && !busy ? (
          <Text style={[styles.message, { color: c.textSecondary }]}>
            앨범에 보관했어요. 다시 만들면 이 사진도 앨범에 그대로 남습니다.
          </Text>
        ) : null}

        {missing === '사진' ? (
          // 웹에서는 새로고침만 해도 blob: URI가 무효가 됩니다. 다시 고르게 안내합니다.
          <Text style={[styles.message, { color: c.textSecondary }]}>
            올린 사진을 찾을 수 없어요. 사진 화면에서 다시 골라 주세요.
          </Text>
        ) : null}

        {otherBusy ? (
          // 서버의 GPU가 하나라 작업은 한 번에 하나씩만 돕니다.
          <Text style={[styles.message, { color: c.textSecondary }]}>
            다른 사진을 만드는 중이에요. 끝나면 이어서 만들 수 있습니다.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {/*
          "다시 만들기"라고 해서 앞의 사진을 지우지 않습니다. 만들 때마다
          앨범에 한 장씩 쌓이고, 여기에는 마지막 것이 보입니다.
        */}
        <Button
          label={result ? '한 장 더 찍기' : '사진 찍기'}
          onPress={run}
          loading={busy}
          disabled={missing !== null || otherBusy}
        />
        {busy ? (
          // 취소는 서버에서 그리던 것까지 멈춥니다. 한 번에 한 장만 만들 수
          // 있어서, 잘못 시작했을 때 3~4분을 기다리지 않아도 되게 합니다.
          <Button label="취소하기" variant="secondary" onPress={() => void job.cancel()} />
        ) : (
          <Button label="앨범 보기" variant="secondary" onPress={() => router.push('/album')} />
        )}
        {/*
          앨범과 다운로드는 역할이 다릅니다. 앨범은 앱 안에서 다시 보기 위한
          것이고 브라우저가 지울 수도 있지만, 내려받은 파일은 사용자 것이
          됩니다. 그래서 보관에 성공했어도 버튼을 남겨둡니다.
        */}
        {latest ? (
          <Button
            label={saving ? '내려받는 중...' : '내려받기'}
            variant="secondary"
            onPress={() => void handleSave(latest)}
            disabled={busy || saving}
          />
        ) : null}
        {/*
          생성 중에도 나갈 수 있습니다. 기다리는 일은 lib/photo-job.tsx가
          화면 밖에서 하고 있어서, 나가도 결과가 버려지지 않습니다.
        */}
        <Button label="돌아가기" variant="secondary" onPress={goBack} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  note: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  body: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSize.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  materials: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  material: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  materialLabel: {
    fontSize: FontSize.caption,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: Radius.sm,
  },
  photoEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCenter: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  stageIcon: {
    fontSize: 40,
  },
  stageText: {
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  stageHint: {
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  message: {
    fontSize: FontSize.caption,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});

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
import { ComfyError, generate, type GenerateStep } from '@/lib/comfy';

/**
 * 사진 만들기 화면.
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
 * 문장을 다듬고 싶으면 이 화면이 아니라 **src/lib/photo-prompt.ts**를 고치세요.
 * 네 단계가 한 표에 모여 있고, 그림체·조명 같은 공통 부분은 KEEPSAKE_STYLE
 * 한 곳에 있습니다. 여기서 문자열을 이어붙이면 단계마다 그림체가 갈립니다.
 *
 * ⚠️ 결과 URL은 **ComfyUI 서버가 켜져 있는 동안만** 유효합니다. 서버를 끄면
 *    이미 만든 사진도 안 보입니다. 오래 남기려면 받아서 저장해야 합니다.
 */

/** 기다리는 동안 보여줄 안내. 단계가 넘어가는 게 보여야 멈춘 것처럼 안 느껴집니다. */
const STEP_TEXT: Record<GenerateStep, string> = {
  uploading: '사진을 보내는 중...',
  queued: '순서를 기다리는 중...',
  generating: '그림을 그리는 중...',
};

export default function PhotoGenScreen() {
  const c = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{
    breed?: string;
    stage?: string;
    photoUri?: string;
    prompt?: string;
    caption?: string;
  }>();

  // 링크로 들어온 문자열이라 그대로 믿지 않고 아는 값인지 확인합니다.
  const breed = resolveBreed(params.breed);
  const stage = resolveStage(params.stage);
  const photoUri = typeof params.photoUri === 'string' && params.photoUri ? params.photoUri : null;
  const prompt = typeof params.prompt === 'string' && params.prompt ? params.prompt : null;
  const caption = typeof params.caption === 'string' ? params.caption : null;

  const [step, setStep] = useState<GenerateStep | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 화면을 떠난 뒤에도 폴링이 계속 도는 것을 막습니다.
   *
   * 생성은 수십 초가 걸려서, 기다리다 뒤로 가는 일이 흔합니다. 그때
   * setState를 하면 이미 사라진 화면을 갱신하게 됩니다.
   */
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const busy = step !== null;
  // 재료가 하나라도 없으면 부를 수가 없습니다. 원인을 나눠서 안내합니다.
  const missing = !photoUri ? '사진' : !prompt ? '프롬프트' : null;

  async function run() {
    if (!photoUri || !prompt) return;

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setError(null);
    setResult(null);
    setStep('uploading');

    try {
      const url = await generate({
        photoUri,
        prompt,
        signal: controller.signal,
        onStep: setStep,
      });
      if (controller.signal.aborted) return;
      setResult(url);
    } catch (e) {
      if (controller.signal.aborted) return;
      // ComfyError는 사용자에게 보여줄 문장을 따로 들고 있습니다.
      // 그 외(네트워크 끊김 등)는 서버 주소부터 의심하는 게 보통 맞습니다.
      setError(
        e instanceof ComfyError
          ? e.hint
          : '사진 생성 서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해 주세요.',
      );
    } finally {
      if (!controller.signal.aborted) setStep(null);
    }
  }

  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>사진 만들기</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        {caption ?? '함께한 모습을 한 장으로 남겨 드려요.'}
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
          {result ? (
            <Image source={{ uri: result }} style={styles.resultImage} contentFit="cover" />
          ) : busy ? (
            <View style={styles.stageCenter}>
              <ActivityIndicator color={c.primary} />
              <Text style={[styles.stageText, { color: c.textSecondary }]}>{STEP_TEXT[step]}</Text>
              <Text style={[styles.stageHint, { color: c.textSecondary }]}>
                한 장에 1분 가까이 걸릴 수 있어요
              </Text>
            </View>
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

        {missing === '사진' ? (
          // 웹에서는 새로고침만 해도 blob: URI가 무효가 됩니다. 다시 고르게 안내합니다.
          <Text style={[styles.message, { color: c.textSecondary }]}>
            올린 사진을 찾을 수 없어요. 사진 화면에서 다시 골라 주세요.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label={result ? '다시 만들기' : '사진 만들기'}
          onPress={() => void run()}
          loading={busy}
          disabled={missing !== null}
        />
        <Button
          label="돌아가기"
          variant="secondary"
          onPress={() => router.back()}
          disabled={busy}
        />
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

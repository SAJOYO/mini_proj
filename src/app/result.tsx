import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PetCharacter } from '@/components/pet-character';
import { Screen } from '@/components/screen';
import { BREEDS, type BreedId } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notify } from '@/lib/dialog';
import { usePet } from '@/lib/pet';
import { resolveMix, type BreedMix } from '@/lib/persona';
import { loadAnalysis, loadPhotoUri, saveAnalysis, type StoredAnalysis } from '@/lib/storage';

/** 카드 안에 그리는 캐릭터 크기(px). */
const PREVIEW_SIZE = 68;

/**
 * 판정 결과 화면 — 사진 분석과 게임 사이.
 *
 * 예전에는 분석이 끝나면 곧바로 게임으로 넘어갔습니다. 그러면 모델이 낸 1순위가
 * 그대로 캐릭터가 되고, 사용자는 자기 얼굴이 어떻게 읽혔는지도 2·3순위가
 * 무엇이었는지도 못 봅니다. 여기서 보여주고 고르게 합니다.
 *
 * **API를 다시 부르지 않습니다.** 저장된 판정(`@pet/analysis`)만 읽습니다 —
 * 무료 한도가 하루 20건이라 화면을 드나들 때마다 부르면 금방 막힙니다.
 *
 * 고른 품종은 `chosen` 으로 저장되고, 성격·생김새의 **기준점**이 됩니다.
 * 퍼센트는 모델이 낸 그대로 둡니다 (`persona/synthesize.ts`의 `anchorMix` 참고) —
 * 2순위를 골랐다고 그 품종이 1순위 퍼센트를 가져가지는 않습니다.
 */
export default function ResultScreen() {
  const c = useTheme();
  const router = useRouter();
  const { hatch } = usePet();

  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [mix, setMix] = useState<BreedMix>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<BreedId | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadAnalysis().then((saved) => {
      if (cancelled) return;
      setAnalysis(saved);
      if (saved) {
        const resolved = resolveMix(saved.mix);
        setMix(resolved);
        // 이미 고른 적이 있으면 그걸 선택해 둡니다(되돌아온 경우).
        // 없으면 모델이 낸 1순위를 기본값으로 — 아무것도 안 고른 상태를 만들지
        // 않으려는 것입니다. 그냥 [이 친구로 시작하기]를 누르면 예전과 같습니다.
        const already = saved.chosen as BreedId | undefined;
        setPicked(
          already && resolved.some((m) => m.breed === already) ? already : resolved[0].breed,
        );
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function start() {
    if (!picked || !analysis || busy) return;

    setBusy(true);
    try {
      // 선택을 먼저 저장합니다. 여기서 실패하면 게임으로 넘어가도 대화 쪽이
      // 옛 기준점을 읽어서 게임과 채팅의 동물이 어긋납니다.
      await saveAnalysis({ ...analysis, chosen: picked });
      await hatch(picked, await loadPhotoUri());
      router.replace('/game');
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      notify('시작하지 못했어요', reason);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen center>
        <Text style={[styles.empty, { color: c.textSecondary }]}>결과를 불러오는 중...</Text>
      </Screen>
    );
  }

  // 판정 없이 주소로 바로 들어온 경우. 되돌아갈 길을 줍니다.
  if (!analysis || mix.length === 0) {
    return (
      <Screen center>
        <Text style={[styles.empty, { color: c.textSecondary }]}>아직 분석한 결과가 없어요.</Text>
        <View style={styles.emptyAction}>
          <Button label="사진 올리러 가기" onPress={() => router.replace('/photo')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Text style={[styles.title, { color: c.text }]}>이런 동물을 닮았어요</Text>

      {/* face 는 모델이 안 줄 수도 있습니다. 그때는 칸을 통째로 숨깁니다 —
          빈 상자만 남으면 뭔가 실패한 것처럼 보입니다. */}
      {analysis.face ? (
        <View style={[styles.face, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          <Text style={[styles.faceLabel, { color: c.textSecondary }]}>사진에서 읽은 얼굴</Text>
          <Text style={[styles.faceText, { color: c.text }]}>{analysis.face}</Text>
        </View>
      ) : null}

      <Text style={[styles.guide, { color: c.textSecondary }]}>
        마음에 드는 친구를 골라 주세요. 고른 동물이 성격의 기준이 됩니다.
      </Text>

      <View style={styles.cards}>
        {mix.map((item) => {
          const breed = item.breed;
          const selected = picked === breed;
          const reason = analysis.reasons?.[breed];

          return (
            <Pressable
              key={breed}
              onPress={() => setPicked(breed)}
              disabled={busy}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={[
                styles.card,
                {
                  backgroundColor: c.surface,
                  borderColor: selected ? c.primary : c.border,
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              <PetCharacter breed={breed} size={PREVIEW_SIZE} />

              <View style={styles.cardBody}>
                <View style={styles.cardHead}>
                  <Text style={[styles.breed, { color: c.text }]}>{BREEDS[breed].label}</Text>
                  <Text style={[styles.percent, { color: selected ? c.primary : c.textSecondary }]}>
                    {Math.round(item.ratio)}%
                  </Text>
                </View>

                {/* 근거도 없을 수 있습니다. 있는 것만 보여줍니다. */}
                {reason ? (
                  <Text style={[styles.reason, { color: c.textSecondary }]}>{reason}</Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Button
          label={picked ? `${BREEDS[picked].label}(으)로 시작하기` : '시작하기'}
          onPress={start}
          loading={busy}
          disabled={!picked}
        />
        <Button
          label="사진 다시 고르기"
          variant="secondary"
          onPress={() => router.replace('/photo')}
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
    marginBottom: Spacing.md,
  },
  face: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  faceLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  faceText: {
    fontSize: FontSize.body,
    lineHeight: 22,
  },
  guide: {
    fontSize: FontSize.body,
    marginBottom: Spacing.md,
  },
  cards: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.xs,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  breed: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  percent: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  reason: {
    fontSize: FontSize.caption,
    lineHeight: 19,
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  empty: {
    fontSize: FontSize.body,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
  },
});

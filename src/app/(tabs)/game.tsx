import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { BREEDS } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { DEFAULT_MIX, dominantBreed, resolveMix, synthesize } from '@/lib/persona';
import { loadAnalysis, loadPhotoUri, type StoredAnalysis } from '@/lib/storage';

/**
 * 다마고치 게임 화면 (왼쪽 페이지).
 *
 * TODO(조윤주, 최윤우): 여기가 게임 담당 화면입니다.
 *   지금 들어 있는 건 자리만 잡아둔 껍데기이니 마음대로 갈아엎으세요.
 *
 *   판정 결과를 읽는 법은 아래 useEffect 를 그대로 쓰시면 됩니다.
 *     mix          품종 혼합 비율. dominantBreed(mix) 가 1순위 품종 id 입니다.
 *     card         성격 카드. card.archetype, card.axes 등
 *     analysis.face      얼굴 관찰 문장
 *     analysis.reasons   품종별 근거 문장 (breedId 로 찾습니다)
 *
 *   품종 id 는 BREEDS 의 키(corgi, shiba, jindo ...)이고,
 *   캐릭터 그림을 그 id 로 매핑하시면 됩니다. 판정은 이 16종 밖으로 나가지 않습니다
 *   (스키마 enum 으로 막아뒀습니다).
 *
 *   - 캐릭터 자리에는 아직 사용자 사진이 임시로 들어갑니다.
 *   - 상태 바(배고픔/행복도)는 지금 하드코딩된 숫자입니다.
 *   - 화면 아래 여백은 점 인디케이터 자리라 남겨두는 게 좋습니다.
 *
 * 주의: `edges={['top']}` 입니다. 아래쪽 안전영역은 탭 레이아웃의 점 인디케이터가
 * 이미 처리하므로 여기서 또 넣으면 여백이 두 번 들어갑니다.
 */
export default function GameScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPhotoUri().then((uri) => {
      if (!cancelled) setPhotoUri(uri);
    });
    loadAnalysis().then((saved) => {
      if (!cancelled) setAnalysis(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 판정 전이면 중립으로 떨어집니다. 사진을 안 올렸다고 화면이 죽지 않게.
  const mix = useMemo(() => (analysis ? resolveMix(analysis.mix) : DEFAULT_MIX), [analysis]);
  const card = useMemo(() => synthesize(mix), [mix]);
  const breed = dominantBreed(mix);
  const petName = BREEDS[breed].label;

  async function handleSignOut() {
    await signOut();
    router.replace('/start');
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: c.text }]}>
          <Text style={{ color: c.primary }}>{user?.nickname ?? '친구'}</Text>님의 반려동물
        </Text>
        <Pressable onPress={handleSignOut} hitSlop={8}>
          <Text style={[styles.signOut, { color: c.textSecondary }]}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <View style={[styles.pet, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.petImage} contentFit="cover" />
          ) : (
            <Text style={styles.petFace}>🐶</Text>
          )}
        </View>

        <Text style={[styles.petName, { color: c.text }]}>{petName}</Text>
        <Text style={[styles.petMood, { color: c.textSecondary }]}>{card.archetype}</Text>

        {/* 왜 이 동물인지. 판정 전에는 안내로 대신합니다. */}
        <Text style={[styles.why, { color: c.textSecondary }]} numberOfLines={3}>
          {analysis?.face || '사진을 올리면 닮은 동물을 찾아드려요.'}
        </Text>
      </View>

      <View style={styles.stats}>
        <StatBar label="배고픔" value={0.7} />
        <StatBar label="행복도" value={0.45} />
      </View>

      <View style={styles.actions}>
        {['🍚 밥주기', '🎾 놀아주기', '🛁 씻기기'].map((label) => (
          <View
            key={label}
            style={[styles.actionChip, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.actionLabel, { color: c.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.placeholder, { color: c.textSecondary }]}>
        게임 기능은 준비 중이에요 (담당: 조윤주, 최윤우)
      </Text>
    </Screen>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  const c = useTheme();
  const ratio = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, { color: c.textSecondary }]}>{label}</Text>
      <View style={[styles.statTrack, { backgroundColor: c.surfaceAlt }]}>
        <View style={[styles.statFill, { backgroundColor: c.primary, width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  signOut: {
    fontSize: FontSize.caption,
    textDecorationLine: 'underline',
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pet: {
    width: 176,
    height: 176,
    borderRadius: Radius.pill,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
  petFace: {
    fontSize: 84,
  },
  petName: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  petMood: {
    fontSize: FontSize.body,
  },
  why: {
    fontSize: FontSize.caption,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: Spacing.xs,
  },
  stats: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    width: 48,
  },
  statTrack: {
    flex: 1,
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  actionChip: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  placeholder: {
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});

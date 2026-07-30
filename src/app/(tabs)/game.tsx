import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { loadPhotoUri } from '@/lib/storage';

/**
 * 다마고치 게임 화면 (왼쪽 페이지).
 *
 * TODO(조윤주, 최윤우): 여기가 게임 담당 화면입니다.
 *   지금 들어 있는 건 자리만 잡아둔 껍데기이니 마음대로 갈아엎으세요.
 *   - 캐릭터 이미지: 아래 photoUri 자리에 "닮은 동물 캐릭터" 결과 이미지가 들어옵니다.
 *     (그 이미지를 만드는 건 홍가연 담당. 그 전까지는 사용자 사진을 임시로 보여줍니다.)
 *   - 상태 바(배고픔/행복도)는 지금 하드코딩된 숫자입니다.
 *   - 화면 아래 여백(Spacing.xl)은 점 인디케이터 자리라 남겨두는 게 좋습니다.
 *
 * 주의: `edges={['top']}` 입니다. 아래쪽 안전영역은 탭 레이아웃의 점 인디케이터가
 * 이미 처리하므로 여기서 또 넣으면 여백이 두 번 들어갑니다.
 */
export default function GameScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    loadPhotoUri().then(setPhotoUri);
  }, []);

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

        <Text style={[styles.petName, { color: c.text }]}>이름 없는 아이</Text>
        <Text style={[styles.petMood, { color: c.textSecondary }]}>기분이 좋아 보여요</Text>
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

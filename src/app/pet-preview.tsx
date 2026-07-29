import { StyleSheet, Text, View } from 'react-native';

import { PetCharacter } from '@/components/pet-character';
import { Screen } from '@/components/screen';
import { PetRig, type PetPose } from '@/components/pet-rig';
import { ANIMATION_NAMES, BREEDS, type BreedId } from '@/constants/pet';
import { FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 캐릭터 확인용 개발 화면 (`/pet-preview`).
 *
 * 품종별 생김새와 자세(pose) 변화를 한눈에 늘어놓고 눈으로 확인합니다.
 * 제품 화면이 아니니 배포 전에 지우거나 개발 빌드에서만 노출하세요.
 */
export default function PetPreviewScreen() {
  const c = useTheme();
  const breeds = Object.keys(BREEDS) as BreedId[];

  return (
    <Screen scroll>
      <Text style={[styles.heading, { color: c.text }]}>품종</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        같은 리그에 숫자만 바꿔 끼운 결과입니다.
      </Text>
      <View style={styles.row}>
        {breeds.map((b) => (
          <View key={b} style={styles.cell}>
            <PetRig preset={BREEDS[b]} size={130} />
            <Text style={[styles.caption, { color: c.text }]}>{BREEDS[b].label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.heading, { color: c.text }]}>자세</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        품종은 시바견으로 고정하고 pose만 바꾼 결과입니다.
      </Text>
      <View style={styles.row}>
        {POSES.map(({ label, pose }) => (
          <View key={label} style={styles.cell}>
            <PetRig preset={BREEDS.shiba} size={130} pose={pose} />
            <Text style={[styles.caption, { color: c.text }]}>{label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.heading, { color: c.text }]}>동작</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        게임 쪽에서 넘기는 animation 값이 이렇게 보입니다.
      </Text>
      <View style={styles.row}>
        {ANIMATION_NAMES.map((a) => (
          <PetCharacter key={a} breed="shiba" animation={a} size={130} debug />
        ))}
      </View>
    </Screen>
  );
}

const POSES: { label: string; pose: Partial<PetPose> }[] = [
  { label: '기본', pose: {} },
  { label: '고개 갸웃', pose: { headTilt: 14 } },
  { label: '귀 처짐', pose: { earFlap: 45 } },
  { label: '눈 감음', pose: { eyeOpen: 0 } },
  { label: '반쯤 감음', pose: { eyeOpen: 0.4 } },
  { label: '입 벌림', pose: { mouthOpen: 1 } },
  { label: '꼬리 흔들기', pose: { tailWag: -25 } },
  { label: '납작', pose: { bodySquash: 0.9, bodyLift: 6 } },
];

const styles = StyleSheet.create({
  heading: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  note: {
    fontSize: FontSize.caption,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  cell: {
    alignItems: 'center',
    gap: 2,
  },
  caption: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});

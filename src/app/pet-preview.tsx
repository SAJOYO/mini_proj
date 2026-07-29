import { StyleSheet, Text, View } from 'react-native';

import { PetCharacter } from '@/components/pet-character';
import { ANIMATION_NAMES, BREEDS, type BreedId } from '@/constants/pet';
import { Screen } from '@/components/screen';
import { FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 캐릭터 확인용 개발 화면 (`/pet-preview`).
 *
 * 품종·동작을 한눈에 늘어놓고 눈으로 확인하는 용도입니다.
 * 게임 담당도 여기 들어와서 어떤 동작 이름이 있는지 보면 됩니다.
 * 제품 화면이 아니니 배포 전에 지우거나 개발 빌드에서만 노출하세요.
 */
export default function PetPreviewScreen() {
  const c = useTheme();
  const breeds = Object.keys(BREEDS) as BreedId[];

  return (
    <Screen scroll>
      <Text style={[styles.heading, { color: c.text }]}>품종</Text>
      <View style={styles.row}>
        {breeds.map((b) => (
          <PetCharacter key={b} breed={b} size={110} />
        ))}
      </View>

      <Text style={[styles.heading, { color: c.text }]}>동작</Text>
      <View style={styles.row}>
        {ANIMATION_NAMES.map((a) => (
          <PetCharacter key={a} breed="shiba" animation={a} size={110} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: FontSize.title,
    fontWeight: '800',
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});

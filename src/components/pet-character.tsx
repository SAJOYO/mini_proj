import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PetRig } from '@/components/pet-rig';
import {
  BREEDS,
  DEFAULT_ANIMATION,
  DEFAULT_BREED,
  type AnimationName,
  type BreedId,
} from '@/constants/pet';
import { FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PetCharacterProps = {
  /** 닮은 동물 검색 결과로 정해지는 품종. 없으면 기본 형태로 그립니다. */
  breed?: BreedId;
  /** 게임 로직이 펫 상태를 보고 골라 넘기는 동작. 계속 반복 재생됩니다. */
  animation?: AnimationName;
  /** 캐릭터가 차지할 정사각형 한 변 길이(px). */
  size?: number;
  /** 품종·동작 이름을 밑에 같이 보여줍니다. 개발 중 확인용. */
  debug?: boolean;
  style?: ViewStyle;
};

/**
 * 반려동물 캐릭터.
 *
 * 게임 동작 담당은 이 컴포넌트에 상태만 흘려보내면 됩니다.
 *   <PetCharacter breed="shiba" animation="wagTail" />
 *
 * 안쪽은 PetRig(부위별로 쪼갠 SVG 구조)이고, 넘긴 동작을 계속 반복 재생합니다.
 * 동작이 바뀌면 알아서 새 움직임으로 갈아탑니다.
 */
export function PetCharacter({
  breed = DEFAULT_BREED,
  animation = DEFAULT_ANIMATION,
  size = 180,
  debug = false,
  style,
}: PetCharacterProps) {
  const c = useTheme();
  const preset = BREEDS[breed];

  return (
    <View style={[styles.wrap, style]} accessibilityLabel={`${preset.label} 캐릭터, ${animation}`}>
      <PetRig preset={preset} size={size} animation={animation} />

      {debug && (
        <View style={styles.caption}>
          <Text style={[styles.breed, { color: c.text }]}>{preset.label}</Text>
          <Text style={[styles.animation, { color: c.primary }]}>{animation}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  caption: {
    alignItems: 'center',
    gap: 2,
  },
  breed: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  animation: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
});

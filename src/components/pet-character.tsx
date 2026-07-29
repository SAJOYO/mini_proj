import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { PetRig, type PetPose } from '@/components/pet-rig';
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
  /** 게임 로직이 펫 상태를 보고 골라 넘기는 동작. */
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
 * 안쪽은 PetRig(부위별로 쪼갠 SVG 구조)이고, 동작마다 정해둔 자세를 물려줍니다.
 *
 * ⚠️ 아직 **정지 자세**입니다. 동작별로 모양은 다르지만 움직이지는 않습니다.
 * TODO(캐릭터 담당): Reanimated로 POSES 사이를 보간해서 실제로 움직이게 하기.
 *   props는 그대로 두고 내부만 바꾸면 되므로 게임 쪽 코드는 영향받지 않습니다.
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
      <PetRig preset={preset} size={size} pose={POSES[animation]} />

      {debug && (
        <View style={styles.caption}>
          <Text style={[styles.breed, { color: c.text }]}>{preset.label}</Text>
          <Text style={[styles.animation, { color: c.primary }]}>{animation}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * 동작별 자세.
 *
 * 지금은 정지 자세 한 컷이지만, 애니메이션이 붙으면 이 값이
 * "그 동작에서 오갈 양 끝점" 역할을 하게 됩니다.
 * 새 동작을 추가할 땐 constants/pet.ts의 ANIMATION_NAMES와 여기 둘 다 채워야 합니다.
 */
const POSES: Record<AnimationName, Partial<PetPose>> = {
  breathe: {},
  lookAround: { headTilt: 12, earFlap: -6 },
  chew: { mouthOpen: 0.6, headTilt: -3 },
  yawn: { mouthOpen: 1, eyeOpen: 0.25, headTilt: 4 },
  sleep: { eyeOpen: 0, bodySquash: 0.96, bodyLift: 5, earFlap: 12 },
  wagTail: { tailWag: -24, mouthOpen: 0.45, bodyLift: -3 },
  droop: { earFlap: 28, eyeOpen: 0.45, bodyLift: 6, bodySquash: 0.95 },
};

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

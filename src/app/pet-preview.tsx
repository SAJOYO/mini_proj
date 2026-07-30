import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PetCharacter } from '@/components/pet-character';
import { PetRig, type PetPose } from '@/components/pet-rig';
import { Scene, SCENE_KINDS, type SceneKind } from '@/components/pet-scene';
import { Screen } from '@/components/screen';
import {
  ANIMATION_NAMES,
  BREEDS,
  breedsByGroup,
  LIFE_STAGES,
  LIFE_STAGE_NAMES,
  type AnimationName,
  type BreedId,
  type LifeStage,
} from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PAINT_STYLES, type PaintStyle } from '@/lib/paint';

/**
 * 캐릭터 확인용 개발 화면 (`/pet-preview`).
 *
 * 위쪽에서 동작을 눌러가며 움직임을 확인하고,
 * 아래쪽에서 품종별 생김새와 자세를 한눈에 봅니다.
 * 제품 화면이 아니니 배포 전에 지우거나 개발 빌드에서만 노출하세요.
 */
export default function PetPreviewScreen() {
  const c = useTheme();
  const [animation, setAnimation] = useState<AnimationName>('breathe');
  const [breed, setBreed] = useState<BreedId>('shiba');
  const [stage, setStage] = useState<LifeStage>('adult');
  const [scene, setScene] = useState<SceneKind>('meadow');
  const [paint, setPaint] = useState<PaintStyle>('pastel');

  const breeds = Object.keys(BREEDS) as BreedId[];
  const sceneLabels: Record<SceneKind, string> = {
    room: '방',
    water: '물속',
    neutral: '뉴트럴',
    meadow: '꽃밭',
  };

  return (
    <Screen scroll>
      <Text style={[styles.heading, { color: c.text }]}>움직임</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        눌러서 배경·동작·품종·생애 단계를 바꿔보세요. 계속 반복 재생됩니다.
      </Text>

      <View style={styles.stage}>
        <Scene kind={scene} painterly={paint !== 'flat'}>
          <PetCharacter
            breed={breed}
            stage={stage}
            animation={animation}
            size={220}
            style={paint}
          />
        </Scene>
      </View>

      <View style={styles.chips}>
        {SCENE_KINDS.map((s) => (
          <Chip key={s} label={sceneLabels[s]} active={s === scene} onPress={() => setScene(s)} />
        ))}
      </View>
      <View style={styles.chips}>
        {PAINT_STYLES.map((p) => (
          <Chip key={p} label={PAINT_LABELS[p]} active={p === paint} onPress={() => setPaint(p)} />
        ))}
      </View>
      <View style={styles.chips}>
        {ANIMATION_NAMES.map((a) => (
          <Chip key={a} label={a} active={a === animation} onPress={() => setAnimation(a)} />
        ))}
      </View>
      <View style={styles.chips}>
        {breeds.map((b) => (
          <Chip key={b} label={BREEDS[b].label} active={b === breed} onPress={() => setBreed(b)} />
        ))}
      </View>
      <View style={styles.chips}>
        {LIFE_STAGE_NAMES.map((s) => (
          <Chip
            key={s}
            label={LIFE_STAGES[s].label}
            active={s === stage}
            onPress={() => setStage(s)}
          />
        ))}
      </View>

      <Text style={[styles.heading, { color: c.text }]}>회화 강도</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        네 단계 모두 같은 리그, 같은 애니메이션입니다. 이미지 에셋은 한 장도 없습니다. 붓결(2단계)
        보다 외곽선을 걷고 빛을 넣는 3단계에서 인상이 훨씬 크게 바뀝니다 — &ldquo;유화 같다&rdquo;는
        느낌의 정체가 붓결이 아니라는 뜻입니다.
      </Text>
      <View style={styles.row}>
        {PAINT_STYLES.map((p) => (
          <View key={p} style={styles.cell}>
            <PetRig
              preset={BREEDS[breed]}
              stage={LIFE_STAGES[stage]}
              size={150}
              animation="breathe"
              style={p}
            />
            <Text style={[styles.caption, { color: c.text }]}>{PAINT_LABELS[p]}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.heading, { color: c.text }]}>생애 단계</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        같은 품종({BREEDS[breed].label})이 자라는 순서입니다. 아기는 머리·발이 크고 눈을 다 못 뜨며,
        노년은 눈이 탁해지고 털이 희끗해집니다.
      </Text>
      <View style={styles.row}>
        {LIFE_STAGE_NAMES.map((s) => (
          <View key={s} style={styles.cell}>
            <PetRig preset={BREEDS[breed]} stage={LIFE_STAGES[s]} size={120} animation="breathe" />
            <Text style={[styles.caption, { color: c.text }]}>{LIFE_STAGES[s].label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.heading, { color: c.text }]}>품종 (FCI 그룹별)</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        같은 리그에 숫자만 바꿔 끼운 결과입니다. 전부 숨 쉬는 중입니다. 강아지 190여 종을 계통별로
        묶은 FCI 10개 그룹에 맞춰, 그룹마다 대표 견종부터 채워 넣었습니다.
      </Text>
      {breedsByGroup().map(({ group, label, breeds: groupBreeds }) => (
        <View key={group} style={styles.group}>
          <Text style={[styles.groupTitle, { color: c.primary }]}>{label}</Text>
          <View style={styles.row}>
            {groupBreeds.map((b) => (
              <View key={b} style={styles.cell}>
                <PetRig preset={BREEDS[b]} size={110} animation="breathe" />
                <Text style={[styles.caption, { color: c.text }]}>{BREEDS[b].label}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={[styles.heading, { color: c.text }]}>자세</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        애니메이션을 끄고 pose만 고정한 모습입니다. 부위별로 뜯어볼 때 씁니다.
      </Text>
      <View style={styles.row}>
        {FROZEN_POSES.map(({ label, pose }) => (
          <View key={label} style={styles.cell}>
            <PetRig preset={BREEDS.shiba} size={120} pose={pose} />
            <Text style={[styles.caption, { color: c.text }]}>{label}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? c.primary : 'transparent',
          borderColor: active ? c.primary : c.border,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? c.onPrimary : c.textSecondary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const PAINT_LABELS: Record<PaintStyle, string> = {
  flat: '1 단색',
  brush: '2 붓결',
  painted: '3 선 제거+빛',
  pastel: '4 파스텔',
};

const FROZEN_POSES: { label: string; pose: Partial<PetPose> }[] = [
  { label: '기본', pose: {} },
  { label: '고개 갸웃', pose: { headTilt: 14 } },
  { label: '귀 처짐', pose: { earFlap: 45 } },
  { label: '눈 감음', pose: { eyeOpen: 0 } },
  { label: '입 벌림', pose: { mouthOpen: 1 } },
  { label: '꼬리 흔들기', pose: { tailWag: -25 } },
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
  stage: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  group: {
    marginBottom: Spacing.lg,
  },
  groupTitle: {
    fontSize: FontSize.label,
    fontWeight: '700',
    marginBottom: Spacing.sm,
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

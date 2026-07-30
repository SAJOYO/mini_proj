import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PetAvatar } from '@/components/pet-avatar';
import { Screen } from '@/components/screen';
import { StatBar } from '@/components/stat-bar';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { confirmAction } from '@/lib/dialog';
import {
  CARE_ACTIONS,
  daysTogether,
  endingOf,
  progressToNext,
  STATS,
  stageOf,
  type CareActionId,
} from '@/lib/game';
import { usePet } from '@/lib/pet';

/** 이 값보다 낮은 스탯이 하나라도 있으면 캐릭터가 시무룩해집니다. */
const SAD_BELOW = 25;

/**
 * 다마고치 게임 화면.
 *
 * 사진 화면에서 품종을 넘겨받아 캐릭터를 만들고, 돌보면서 4단계로 키웁니다.
 * 규칙(경험치·스탯 감소·단계 판정)은 전부 lib/game.ts에 있습니다.
 *
 * 캐릭터 이미지는 아직 없어서 단계별 이모지로 대신하고 있습니다.
 * → components/pet-avatar.tsx 의 TODO(조윤주) 참고
 */
export default function GameScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { pet, isLoading, hatch, care, release, skipStage } = usePet();

  const params = useLocalSearchParams<{ breed?: string; photoUri?: string }>();
  const breedParam = typeof params.breed === 'string' ? params.breed : null;
  const photoParam = typeof params.photoUri === 'string' ? params.photoUri : null;

  /** 돌봄 반응 말풍선. 아바타를 튀게 하는 트리거도 겸합니다. */
  const [reaction, setReaction] = useState<{ key: number; text: string } | null>(null);
  const reactionSeq = useRef(0);

  // 넘겨받은 품종으로 캐릭터를 만듭니다. 이미 키우는 중이면 그대로 둡니다.
  const hatching = useRef(false);
  useEffect(() => {
    if (isLoading || pet || !breedParam || hatching.current) return;

    hatching.current = true;
    void hatch(breedParam, photoParam);
  }, [isLoading, pet, breedParam, photoParam, hatch]);

  function showReaction(text: string) {
    reactionSeq.current += 1;
    setReaction({ key: reactionSeq.current, text });
  }

  async function handleCare(actionId: CareActionId) {
    const result = await care(actionId);
    if (!result) return;

    // 성장했으면 돌봄 반응 대신 성장 소식을 말풍선에 띄웁니다.
    // (알림 창을 쓰지 않는 이유는 웹에서 Alert가 동작하지 않기 때문 — lib/dialog.ts 참고)
    showReaction(result.grewInto ? `🎉 ${result.grewInto.label}가 되었어요!` : result.message);
  }

  async function handleRelease() {
    const ok = await confirmAction({
      title: '처음부터 다시 키울까요?',
      message: '지금까지 키운 기록은 사라집니다.',
      confirmLabel: '다시 키우기',
      destructive: true,
    });
    if (!ok) return;

    await release();
    router.replace('/photo');
  }

  // 아직 저장소를 읽는 중이거나, 품종을 받아 캐릭터를 만드는 중
  if (isLoading || (!pet && breedParam)) {
    return (
      <Screen center>
        <Text style={[styles.loading, { color: c.textSecondary }]}>캐릭터를 준비하는 중...</Text>
      </Screen>
    );
  }

  // 키우는 캐릭터도 없고 품종도 안 넘어왔으면 사진 화면으로 돌려보냅니다
  if (!pet) {
    return (
      <Screen center>
        <Text style={styles.emptyIcon}>🐾</Text>
        <Text style={[styles.emptyTitle, { color: c.text }]}>아직 키우는 친구가 없어요</Text>
        <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
          사진을 올려서 닮은 동물을 찾아보세요.
        </Text>
        <Button
          label="사진 올리기"
          onPress={() => router.replace('/photo')}
          style={styles.emptyButton}
        />
      </Screen>
    );
  }

  const stage = stageOf(pet);
  const progress = progressToNext(pet);
  const ending = endingOf(pet);
  const days = daysTogether(pet);
  const sad = STATS.some((s) => pet.stats[s.id] < SAD_BELOW);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.breed, { color: c.text }]}>
            {user?.nickname ?? '나'}를 닮은 <Text style={{ color: c.primary }}>{pet.breed}</Text>
          </Text>
          <Text style={[styles.days, { color: c.textSecondary }]}>함께한 {days + 1}일째</Text>
        </View>
        <Pressable onPress={() => void handleRelease()} hitSlop={8}>
          <Text style={[styles.reset, { color: c.textSecondary }]}>다시 키우기</Text>
        </Pressable>
      </View>

      <View style={styles.stageWrap}>
        {/* 말풍선 자리를 늘 잡아둬서 아바타가 위아래로 흔들리지 않게 합니다 */}
        <View style={styles.bubbleSlot}>
          {reaction ? (
            <View style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.bubbleText, { color: c.text }]}>{reaction.text}</Text>
            </View>
          ) : null}
        </View>

        <PetAvatar
          stage={stage}
          imageUri={null /* TODO(조윤주): 단계별 캐릭터 이미지가 나오면 여기에 */}
          reactKey={reaction?.key ?? 0}
          sad={sad}
        />
      </View>

      {progress ? (
        <View style={styles.growth}>
          <View style={styles.growthLabelRow}>
            <Text style={[styles.growthLabel, { color: c.textSecondary }]}>성장</Text>
            <Text style={[styles.growthHint, { color: c.textSecondary }]}>{progress.hint}</Text>
          </View>
          <View
            style={[styles.growthTrack, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <View
              style={[
                styles.growthFill,
                { width: `${progress.ratio * 100}%`, backgroundColor: c.primary },
              ]}
            />
          </View>
        </View>
      ) : ending ? (
        <View style={[styles.ending, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={styles.endingEmoji}>{ending.emoji}</Text>
          <Text style={[styles.endingLabel, { color: c.text }]}>{ending.label}</Text>
          <Text style={[styles.endingBody, { color: c.textSecondary }]}>{ending.message}</Text>
        </View>
      ) : null}

      <View style={[styles.stats, { backgroundColor: c.surface, borderColor: c.border }]}>
        {STATS.map((s) => (
          <StatBar
            key={s.id}
            label={s.label}
            emoji={s.emoji}
            value={pet.stats[s.id]}
            warnBelow={s.warnBelow}
          />
        ))}
      </View>

      <View style={styles.careRow}>
        {CARE_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => void handleCare(action.id)}
            style={({ pressed }) => [
              styles.careButton,
              { backgroundColor: c.surface, borderColor: c.border },
              pressed && styles.carePressed,
            ]}>
            <Text style={styles.careEmoji}>{action.emoji}</Text>
            <Text style={[styles.careLabel, { color: c.text }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/*
        TODO(장유빈·임승현): 대화하기 화면으로 넘어가는 자리입니다.
        품종과 성장 단계를 넘기면 페르소나를 잡는 데 쓸 수 있습니다.
          router.push({ pathname: '/chat', params: { breed: pet.breed, stage: stage.id } })
      */}
      <Button label="대화하기 (준비 중)" variant="secondary" onPress={() => {}} disabled />

      {__DEV__ && (
        // 발표 시연용. 개발 중에만 보입니다.
        <Button
          label="[개발용] 다음 단계로"
          variant="ghost"
          onPress={() => void skipStage()}
          disabled={stage.id === 'elder'}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    fontSize: FontSize.body,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: FontSize.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  breed: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  days: {
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  reset: {
    fontSize: FontSize.caption,
    textDecorationLine: 'underline',
  },
  stageWrap: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  bubbleSlot: {
    height: 44,
    justifyContent: 'center',
  },
  bubble: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  bubbleText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  growth: {
    marginTop: Spacing.lg,
    gap: Spacing.xs,
  },
  growthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  growthLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  growthHint: {
    fontSize: FontSize.caption,
  },
  growthTrack: {
    height: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  growthFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  ending: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  endingEmoji: {
    fontSize: 28,
  },
  endingLabel: {
    fontSize: FontSize.label,
    fontWeight: '800',
    marginTop: Spacing.xs,
  },
  endingBody: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  stats: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  careRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  careButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  carePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  careEmoji: {
    fontSize: 26,
  },
  careLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
});

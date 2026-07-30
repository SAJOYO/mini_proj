import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { GrowthOverlay } from '@/components/growth-overlay';
import { PetAvatar, type ReactKind } from '@/components/pet-avatar';
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
  isCareOpen,
  progressToNext,
  STATS,
  stageOf,
  wishOf,
  wishSecondsLeft,
  type CareActionId,
  type CareResult,
  type Stage,
} from '@/lib/game';
import { objectParticle } from '@/lib/korean';
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
  const { pet, isLoading, hatch, care, pat, release, skipStage } = usePet();

  const params = useLocalSearchParams<{ breed?: string; photoUri?: string }>();
  const breedParam = typeof params.breed === 'string' ? params.breed : null;
  const photoParam = typeof params.photoUri === 'string' ? params.photoUri : null;

  /** 돌봄 반응 말풍선. 아바타를 움직이게 하는 트리거도 겸합니다. */
  const [reaction, setReaction] = useState<{
    key: number;
    text: string;
    kind: ReactKind;
    /** 떠오를 파티클 이모지. 거절이면 null. */
    emoji: string | null;
  } | null>(null);
  const reactionSeq = useRef(0);

  /** 성장 축하 연출. 성장한 순간에만 채워집니다. */
  const [grewInto, setGrewInto] = useState<Stage | null>(null);

  // 넘겨받은 품종으로 캐릭터를 만듭니다. 이미 키우는 중이면 그대로 둡니다.
  const hatching = useRef(false);
  useEffect(() => {
    if (isLoading || pet || !breedParam || hatching.current) return;

    hatching.current = true;
    void hatch(breedParam, photoParam);
  }, [isLoading, pet, breedParam, photoParam, hatch]);

  /**
   * 돌봄·쓰다듬기 결과를 화면에 반영합니다.
   *
   * 성공과 거절을 **다르게** 보여주는 게 핵심입니다. 예전에는 둘 다 똑같이
   * 튀어올라서, 스탯이 가득 차 거절당한 것인지 잘 먹은 것인지 구분되지 않았습니다.
   * (알림 창을 쓰지 않는 이유는 웹에서 Alert가 동작하지 않기 때문 — lib/dialog.ts 참고)
   */
  function showResult(result: CareResult, kind: 'care' | 'pat', emoji: string) {
    reactionSeq.current += 1;

    setReaction({
      key: reactionSeq.current,
      text: result.message,
      kind: result.applied ? kind : 'refused',
      // 거절이면 파티클을 띄우지 않습니다 — 아무 일도 일어나지 않았으니까요.
      emoji: result.applied ? emoji : null,
    });

    // 성장은 말풍선 한 줄로 지나가면 아까워서 별도 연출로 띄웁니다.
    if (result.grewInto) setGrewInto(result.grewInto);
  }

  async function handleCare(actionId: CareActionId) {
    const result = await care(actionId);
    if (!result) return;

    const action = CARE_ACTIONS.find((a) => a.id === actionId);
    showResult(result, 'care', action?.emoji ?? '✨');
  }

  async function handlePat() {
    const result = await pat();
    if (!result) return;

    showResult(result, 'pat', '💗');
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
  const careOpen = isCareOpen(pet);
  // 노년기에는 스탯이 멈추므로 시무룩한 표정도 쓰지 않습니다.
  const sad = careOpen && STATS.some((s) => pet.stats[s.id] < SAD_BELOW);

  const wish = careOpen ? wishOf(pet) : null;
  const wishAction = wish ? CARE_ACTIONS.find((a) => a.id === wish.actionId) : null;

  // 조사는 단어에 따라 갈립니다("멍멍을" / "루비를") — lib/korean.ts
  const nickname = user?.nickname ?? '나';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.breed, { color: c.text }]}>
            {nickname}
            {objectParticle(nickname)} 닮은 <Text style={{ color: c.primary }}>{pet.breed}</Text>
          </Text>
          <Text style={[styles.days, { color: c.textSecondary }]}>함께한 {days + 1}일째</Text>
        </View>
        <Pressable onPress={() => void handleRelease()} hitSlop={8}>
          <Text style={[styles.reset, { color: c.textSecondary }]}>다시 키우기</Text>
        </Pressable>
      </View>

      <View style={styles.stageWrap}>
        {/*
          말풍선 자리를 늘 잡아둬서 아바타가 위아래로 흔들리지 않게 합니다.
          아바타가 나중에 그려지는 형제라서, 튀어오를 때 말풍선을 덮지 않도록
          zIndex로 말풍선을 위에 올려둡니다.
        */}
        <View style={styles.bubbleSlot}>
          {reaction ? (
            <ReactionBubble
              key={reaction.key}
              text={reaction.text}
              muted={reaction.kind === 'refused'}
              onHidden={() => setReaction(null)}
            />
          ) : null}
        </View>

        <View style={styles.avatarSlot}>
          <PetAvatar
            stage={stage}
            imageUri={null /* TODO(조윤주): 단계별 캐릭터 이미지가 나오면 여기에 */}
            reactKey={reaction?.key ?? 0}
            reactKind={reaction?.kind ?? 'care'}
            reactEmoji={reaction?.emoji ?? null}
            sad={sad}
            // 노년기에는 돌봄이 끝났으니 쓰다듬기도 닫습니다.
            onPat={careOpen ? () => void handlePat() : undefined}
          />
        </View>
      </View>

      {wish && wishAction ? (
        <View style={[styles.wish, { backgroundColor: c.surface, borderColor: c.primary }]}>
          <Text style={styles.wishEmoji}>{wishAction.emoji}</Text>
          <View style={styles.wishText}>
            <Text style={[styles.wishAsk, { color: c.text }]}>{wishAction.wishAsk}</Text>
            <Text style={[styles.wishHint, { color: c.textSecondary }]}>
              {wishAction.label}로 들어주면 보너스 · {wishSecondsLeft(pet)}초 남음
            </Text>
          </View>
        </View>
      ) : null}

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
        <View style={[styles.ending, { backgroundColor: c.surface, borderColor: c.primary }]}>
          <Text style={[styles.endingTag, { color: c.primary }]}>ENDING</Text>
          <Text style={styles.endingEmoji}>{ending.emoji}</Text>
          <Text style={[styles.endingLabel, { color: c.text }]}>{ending.label}</Text>
          <Text style={[styles.endingBody, { color: c.textSecondary }]}>{ending.message}</Text>
        </View>
      ) : null}

      {careOpen ? (
        <>
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
            {CARE_ACTIONS.map((action) => {
              // 지금 바라는 돌봄은 테두리를 강조해서 어디를 눌러야 할지 바로 보이게 합니다.
              const wanted = wish?.actionId === action.id;

              return (
                <Pressable
                  key={action.id}
                  accessibilityRole="button"
                  accessibilityLabel={wanted ? `${action.label} (지금 바라는 것)` : action.label}
                  onPress={() => void handleCare(action.id)}
                  style={({ pressed }) => [
                    styles.careButton,
                    {
                      backgroundColor: c.surface,
                      borderColor: wanted ? c.primary : c.border,
                      borderWidth: wanted ? 2.5 : 1.5,
                    },
                    pressed && styles.carePressed,
                  ]}>
                  <Text style={styles.careEmoji}>{action.emoji}</Text>
                  <Text style={[styles.careLabel, { color: c.text }]}>{action.label}</Text>
                  {wanted ? (
                    <Text style={[styles.careWish, { color: c.primary }]}>바라는 중</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        // 노년기 = 돌봄 마감. 스탯 게이지와 돌봄 버튼 대신 함께한 기록을 보여줍니다.
        // (게이지가 계속 움직이면 엔딩이 확정된 결과로 읽히지 않습니다)
        <View style={[styles.record, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.recordTitle, { color: c.text }]}>함께한 기록</Text>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: c.textSecondary }]}>함께한 날</Text>
            <Text style={[styles.recordValue, { color: c.text }]}>{days + 1}일</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: c.textSecondary }]}>돌봐준 횟수</Text>
            <Text style={[styles.recordValue, { color: c.text }]}>{pet.careCount}번</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: c.textSecondary }]}>쓰다듬은 횟수</Text>
            <Text style={[styles.recordValue, { color: c.text }]}>{pet.pats}번</Text>
          </View>
          <View style={styles.recordRow}>
            <Text style={[styles.recordLabel, { color: c.textSecondary }]}>쌓은 경험치</Text>
            <Text style={[styles.recordValue, { color: c.text }]}>{pet.exp} EXP</Text>
          </View>
          <Text style={[styles.recordNote, { color: c.textSecondary }]}>
            돌봄은 여기서 끝나요. 엔딩은 더 이상 바뀌지 않습니다.
          </Text>
        </View>
      )}

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

      {grewInto ? <GrowthOverlay stage={grewInto} onDone={() => setGrewInto(null)} /> : null}
    </Screen>
  );
}

/** 말풍선이 떠 있는 시간(ms). 이 뒤로는 스스로 사라집니다. */
const BUBBLE_HOLD_MS = 2600;

/**
 * 돌봄 반응 말풍선. `key`가 바뀌면 새로 마운트되면서 다시 나타납니다.
 * (텍스트만 바꾸면 같은 말이 반복될 때 아무 변화가 없어 보입니다)
 *
 * 잠깐 떠 있다가 스스로 사라집니다. 계속 남아 있으면 방금 한 행동의 반응인지
 * 한참 전 것인지 알 수 없습니다.
 */
function ReactionBubble({
  text,
  muted = false,
  onHidden,
}: {
  text: string;
  /** 거절 반응이면 흐리게 — 성공과 톤을 구분합니다. */
  muted?: boolean;
  onHidden: () => void;
}) {
  const c = useTheme();
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // 0 → 1(등장) → 유지 → 2(사라짐)
    Animated.sequence([
      Animated.timing(appear, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(BUBBLE_HOLD_MS),
      Animated.timing(appear, { toValue: 2, duration: 300, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onHidden();
    });
  }, [appear, onHidden]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          backgroundColor: c.surface,
          borderColor: muted ? c.border : c.primary,
          borderStyle: muted ? 'dashed' : 'solid',
        },
        {
          opacity: appear.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            {
              translateY: appear.interpolate({ inputRange: [0, 1, 2], outputRange: [6, 0, -6] }),
            },
          ],
        },
      ]}>
      <Text
        style={[styles.bubbleText, { color: muted ? c.textSecondary : c.text }]}
        numberOfLines={2}>
        {text}
      </Text>
    </Animated.View>
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
    minHeight: 52,
    justifyContent: 'center',
    // 아바타가 튀어올라도 말풍선이 가려지지 않게 위에 둡니다 (elevation은 안드로이드용)
    zIndex: 2,
    elevation: 2,
  },
  avatarSlot: {
    zIndex: 1,
  },
  bubble: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    maxWidth: 260,
  },
  bubbleText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  wish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  wishEmoji: {
    fontSize: 22,
  },
  wishText: {
    flex: 1,
  },
  wishAsk: {
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
  wishHint: {
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  careWish: {
    fontSize: FontSize.caption,
    fontWeight: '800',
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
    borderWidth: 2,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  endingTag: {
    fontSize: FontSize.caption,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  endingEmoji: {
    fontSize: 28,
  },
  record: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  recordTitle: {
    fontSize: FontSize.label,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recordLabel: {
    fontSize: FontSize.caption,
  },
  recordValue: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recordNote: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
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
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    // 게이지가 한 줄짜리로 줄어서 여백도 같이 줄였습니다(화면을 덜 차지하게)
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
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

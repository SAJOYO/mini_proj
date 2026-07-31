import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ActivityBar } from '@/components/activity-bar';
import { Button } from '@/components/button';
import { GrowthOverlay } from '@/components/growth-overlay';
import { PetAvatar, type ReactKind } from '@/components/pet-avatar';
import { PetCharacter } from '@/components/pet-character';
import { Screen } from '@/components/screen';
import { StatBar } from '@/components/stat-bar';
import { BREEDS, resolveBreed } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { confirmAction } from '@/lib/dialog';
import {
  CARE_ACTIONS,
  daysTogether,
  DEPARTURE,
  departureSecondsLeft,
  endingOf,
  GameConfig,
  hasDeparted,
  isCareOpen,
  isPackingBags,
  patStreakReaction,
  progressToNext,
  sideEffectHint,
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
import { isRunning, usePhotoJob } from '@/lib/photo-job';
import { buildKeepsakePrompt } from '@/lib/photo-prompt';

/** 이 값보다 낮은 스탯이 하나라도 있으면 캐릭터가 시무룩해집니다. */
const SAD_BELOW = 25;

/** 이 간격 안에 다시 쓰다듬으면 "연달아 쓰다듬는 중"으로 봅니다. */
const PAT_STREAK_WINDOW_MS = 1500;

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
  const { pet, isLoading, hatch, care, pat, release, skipStage, rewind, forceStats, forceDepart } =
    usePet();
  const photoJob = usePhotoJob();

  const params = useLocalSearchParams<{ breed?: string; photoUri?: string }>();
  // 링크로 들어온 문자열이라 그대로 믿지 않고 아는 품종인지 확인합니다.
  // 모르는 값이면 기본 형태로 떨어지므로 화면이 깨지지 않습니다.
  const breedParam = typeof params.breed === 'string' ? resolveBreed(params.breed) : null;
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

  /**
   * 방금 떠나온 단계. 성장 연출이 끝난 뒤 "기념 사진 남길까요?"를 띄우는 데 씁니다.
   *
   * 축하 연출 안에 질문을 넣지 않은 이유 — GrowthOverlay는 pointerEvents="none"에
   * 1.5초 뒤 스스로 사라집니다. 조작을 막지 않으려고 그렇게 만든 것이라, 거기에
   * 예/아니오를 넣으면 성격이 정반대가 됩니다. 축하는 그대로 흘려보내고,
   * 사라진 자리에 남는 카드로 물어봅니다 — 2초 안에 결정하라고 몰지 않습니다.
   */
  const [keepsakeOf, setKeepsakeOf] = useState<Stage | null>(null);

  /**
   * 진행 중인 돌봄. 버튼을 누르면 곧바로 끝나지 않고 여기에 들어가고,
   * 진행 바가 다 차면 실제로 적용됩니다.
   *
   * 저장하지 않는 화면 상태입니다 — 앱을 닫으면 진행은 사라집니다. 진행 중인
   * 것까지 저장하면 "껐다 켰더니 밥을 먹고 있다"를 다뤄야 해서, 미니 프로젝트
   * 범위에서는 화면 안에서만 살게 두었습니다.
   */
  const [activity, setActivity] = useState<CareActionId | null>(null);

  /** 연달아 쓰다듬은 횟수. 손을 떼면(1.5초) 초기화됩니다. */
  const patStreak = useRef(0);
  const lastPatAt = useRef(0);

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
    // 떠나온 모습은 지금이 아니면 다시 볼 수 없습니다. 연출이 끝나면 물어봅니다.
    if (result.grewFrom) setKeepsakeOf(result.grewFrom);
  }

  /**
   * 돌봄을 시작합니다. 실제 적용은 진행 바가 끝날 때(finishCare)입니다.
   *
   * 진행 중에 다른 돌봄을 시작할 수 없게 막는 것이 연타 방지 역할을 겸합니다
   * (쿨다운을 따로 두지 않은 이유 — components/activity-bar.tsx 참고).
   */
  function startCare(actionId: CareActionId) {
    if (activity) return;
    setActivity(actionId);
  }

  async function finishCare(actionId: CareActionId) {
    setActivity(null);

    const result = await care(actionId);
    if (!result) return;

    const action = CARE_ACTIONS.find((a) => a.id === actionId);
    showResult(result, 'care', action?.emoji ?? '✨');
  }

  /**
   * 쓰다듬기. 횟수 제한이 없어서 돌봄이 진행 중이어도 누를 수 있습니다.
   * 연달아 누르면 반응이 점점 커집니다(patStreakReaction).
   */
  async function handlePat() {
    const now = Date.now();
    patStreak.current = now - lastPatAt.current < PAT_STREAK_WINDOW_MS ? patStreak.current + 1 : 1;
    lastPatAt.current = now;

    const result = await pat();
    if (!result) return;

    const streakText = patStreakReaction(patStreak.current);
    showResult(streakText ? { ...result, message: streakText } : result, 'pat', '💗');
  }

  /**
   * 기념 사진을 만들러 갑니다.
   *
   * 넘기는 건 네 가지입니다 — 품종, 단계, 사용자가 올린 사진, 그리고 그 둘로
   * 만든 문장. **단계를 인자로 받는 것이 핵심입니다.** 성장 직후 배너에서
   * 부를 때는 pet에서 다시 읽으면 안 됩니다. 그때는 이미 자란 뒤라 새 단계가
   * 나옵니다(CareResult.grewFrom 참고). 헤더 버튼에서는 지금 단계를 넘깁니다.
   */
  function goToKeepsake(from: Stage) {
    if (!pet) return;

    const { prompt, caption } = buildKeepsakePrompt(pet.breed, from.id);
    setKeepsakeOf(null);

    router.push({
      pathname: '/photo-gen',
      params: {
        breed: pet.breed,
        stage: from.id,
        photoUri: pet.photoUri ?? '',
        prompt,
        caption,
      },
    });
  }

  /**
   * 떠난 뒤 처음부터 다시 시작합니다.
   * 캐릭터를 지우고 사진 업로드 화면으로 보냅니다(확인 창은 띄우지 않습니다 —
   * 이미 게임이 끝난 상태라 되돌릴 것이 없습니다).
   */
  async function handleStartOver() {
    await release();
    router.replace('/photo');
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

  /**
   * 돌봄이 완전히 끊겨 캐릭터가 떠난 상태.
   *
   * 여기서 게임은 끝이고, 이어서 키울 수 있는 대상이 없습니다. 그래서 다른 UI를
   * 보여주지 않고 배웅 화면만 띄운 뒤 사진 업로드부터 다시 시작하게 합니다.
   */
  if (hasDeparted(pet)) {
    return (
      <Screen center>
        <Text style={styles.departEmoji}>{DEPARTURE.emoji}</Text>
        <Text style={[styles.departTitle, { color: c.text }]}>{DEPARTURE.title}</Text>
        <Text style={[styles.departBody, { color: c.textSecondary }]}>{DEPARTURE.message}</Text>

        <View style={[styles.departRecord, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.departRecordText, { color: c.textSecondary }]}>
            {BREEDS[pet.breed].label}와 함께한 {daysTogether(pet) + 1}일 · 돌봄 {pet.careCount}번 ·
            쓰다듬기 {pet.pats}번
          </Text>
        </View>

        <Button
          label="새 친구 만나기"
          onPress={() => void handleStartOver()}
          style={styles.departButton}
        />
      </Screen>
    );
  }

  const stage = stageOf(pet);
  // 사진은 화면 밖에서 만들어집니다. 여기서는 카메라 버튼 모양만 바꿉니다.
  const photoBusy = photoJob.key !== null && isRunning(photoJob, photoJob.key);
  const photoReady = photoJob.unseen !== null;
  const progress = progressToNext(pet);
  const ending = endingOf(pet);
  const days = daysTogether(pet);
  const careOpen = isCareOpen(pet);
  // 노년기에는 스탯이 멈추므로 시무룩한 표정도 쓰지 않습니다.
  const sad = careOpen && STATS.some((s) => pet.stats[s.id] < SAD_BELOW);

  const wish = careOpen ? wishOf(pet) : null;
  const wishAction = wish ? CARE_ACTIONS.find((a) => a.id === wish.actionId) : null;
  const activityAction = activity ? CARE_ACTIONS.find((a) => a.id === activity) : null;

  // 조사는 단어에 따라 갈립니다("멍멍을" / "루비를") — lib/korean.ts
  const nickname = user?.nickname ?? '나';

  return (
    <Screen scroll>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.breed, { color: c.text }]}>
            {nickname}
            {objectParticle(nickname)} 닮은{' '}
            <Text style={{ color: c.primary }}>{BREEDS[pet.breed].label}</Text>
          </Text>
          <Text style={[styles.days, { color: c.textSecondary }]}>함께한 {days + 1}일째</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => void handleRelease()} hitSlop={8}>
            <Text style={[styles.reset, { color: c.textSecondary }]}>다시 키우기</Text>
          </Pressable>

          {/*
            성장을 기다리지 않고 **지금 모습으로** 사진을 만드는 자리입니다.
            성장 직후 배너(goToKeepsake)와 달리 여기서는 지금 단계를 넘깁니다.

            사진이 만들어지는 동안에도 이 화면에서 계속 놀 수 있습니다.
            진행 상황은 lib/photo-job.tsx가 화면 밖에서 들고 있어서, 여기서는
            돌고 있는지(spinner)와 다 됐는지(빨간 점)만 보여주면 됩니다.
          */}
          <Pressable
            onPress={() => goToKeepsake(stage)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              photoBusy ? '사진 만드는 중' : photoReady ? '사진 완성됨' : '사진 만들기'
            }
            style={[styles.photoButton, { backgroundColor: c.surface, borderColor: c.border }]}>
            {photoBusy ? (
              // 이모지와 자리를 맞춰서 도는 동안 버튼 폭이 흔들리지 않게 합니다.
              <ActivityIndicator size="small" color={c.primary} style={styles.photoSpinner} />
            ) : (
              <Text style={styles.photoIcon}>📷</Text>
            )}
            <Text style={[styles.photoLabel, { color: c.textSecondary }]}>
              {photoBusy ? '만드는 중' : '사진 만들기'}
            </Text>
            {photoReady ? <View style={[styles.photoDot, { backgroundColor: c.primary }]} /> : null}
          </Pressable>
        </View>
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
            breed={pet.breed}
            reactKey={reaction?.key ?? 0}
            reactKind={reaction?.kind ?? 'care'}
            reactEmoji={reaction?.emoji ?? null}
            sad={sad}
            activity={activity}
            // 쓰다듬기는 제한이 없습니다 — 노년기에도, 돌봄이 진행 중에도 됩니다.
            onPat={() => void handlePat()}
          />
        </View>
      </View>

      {/*
        성장 연출이 완전히 끝난 뒤에만 띄웁니다(grewInto가 비워진 다음).
        축하가 뜨는 동안 뒤에서 같이 나타나면 둘 다 제대로 안 읽힙니다.
      */}
      {keepsakeOf && !grewInto ? (
        <View style={[styles.keepsake, { backgroundColor: c.surface, borderColor: c.primary }]}>
          {/* 무엇을 남기는지 말로만 설명하면 안 와닿습니다. 떠나온 모습을
              그대로 다시 그려서 보여줍니다 — 캐릭터가 SVG라 가능한 일입니다. */}
          <PetCharacter breed={pet.breed} stage={keepsakeOf.id} animation="breathe" size={68} />

          <View style={styles.keepsakeText}>
            <Text style={[styles.keepsakeTitle, { color: c.text }]}>
              {keepsakeOf.label} 모습, 남겨둘까요?
            </Text>
            <Text style={[styles.keepsakeBody, { color: c.textSecondary }]}>
              올린 사진과 함께 기념 사진으로 만들어 드려요.
            </Text>

            <View style={styles.keepsakeButtons}>
              <Pressable
                accessibilityRole="button"
                onPress={() => goToKeepsake(keepsakeOf)}
                style={({ pressed }) => [
                  styles.keepsakeButton,
                  { backgroundColor: c.primary, borderColor: c.primary },
                  pressed && styles.carePressed,
                ]}>
                <Text style={[styles.keepsakeButtonText, { color: c.surface }]}>사진 남기기</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => setKeepsakeOf(null)}
                style={({ pressed }) => [
                  styles.keepsakeButton,
                  { borderColor: c.border },
                  pressed && styles.carePressed,
                ]}>
                <Text style={[styles.keepsakeButtonText, { color: c.textSecondary }]}>
                  괜찮아요
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {isPackingBags(pet) ? (
        // 떠나기 전에 반드시 경고합니다. 예고 없이 사라지면 버그로 보입니다.
        <View style={[styles.depart, { backgroundColor: c.surface, borderColor: c.danger }]}>
          <Text style={styles.departWarnEmoji}>🚪</Text>
          <View style={styles.departWarnText}>
            <Text style={[styles.departWarnTitle, { color: c.danger }]}>{DEPARTURE.warning}</Text>
            <Text style={[styles.departWarnBody, { color: c.textSecondary }]}>
              {departureSecondsLeft(pet)}초 안에 돌봐주지 않으면 여행을 떠나요
            </Text>
          </View>
        </View>
      ) : null}

      {activityAction ? (
        <ActivityBar
          // 액션이 바뀌면 새로 시작해야 하므로 key를 붙입니다.
          key={activityAction.id}
          label={activityAction.activityLabel}
          emoji={activityAction.emoji}
          durationMs={activityAction.activityMs}
          onDone={() => void finishCare(activityAction.id)}
        />
      ) : null}

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
              // 무언가 진행 중이면 다른 돌봄은 시작할 수 없습니다.
              const busy = activity !== null;
              const running = activity === action.id;

              return (
                <Pressable
                  key={action.id}
                  accessibilityRole="button"
                  accessibilityLabel={wanted ? `${action.label} (지금 바라는 것)` : action.label}
                  accessibilityState={{ disabled: busy, busy: running }}
                  disabled={busy}
                  onPress={() => startCare(action.id)}
                  style={({ pressed }) => [
                    styles.careButton,
                    {
                      backgroundColor: c.surface,
                      borderColor: running ? c.primary : wanted ? c.primary : c.border,
                      borderWidth: running || wanted ? 2.5 : 1.5,
                    },
                    // 진행 중에는 눌리지 않는다는 걸 흐리게 보여줍니다.
                    busy && !running && styles.careDisabled,
                    pressed && styles.carePressed,
                  ]}>
                  <Text style={styles.careEmoji}>{action.emoji}</Text>
                  <Text style={[styles.careLabel, { color: c.text }]}>{action.label}</Text>
                  {running ? (
                    <Text style={[styles.careWish, { color: c.primary }]}>진행 중</Text>
                  ) : wanted ? (
                    <Text style={[styles.careWish, { color: c.primary }]}>바라는 중</Text>
                  ) : (
                    // 대가를 누른 뒤에 알려주면 속은 기분이 듭니다. 먼저 보여줍니다.
                    <Text style={[styles.careSide, { color: c.textSecondary }]}>
                      {sideEffectHint(action) ?? ' '}
                    </Text>
                  )}
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
        // 개발·발표 시연용. 개발 빌드에서만 보입니다.
        // 시간을 실제로 흘려 기다리지 않고도 성장·방치·엔딩을 확인하려는 목적입니다.
        <View style={[styles.dev, { borderColor: c.border }]}>
          <Text style={[styles.devTitle, { color: c.textSecondary }]}>개발용 시연 도구</Text>

          <View style={styles.devRow}>
            <DevButton
              label="다음 단계 →"
              onPress={() => void skipStage()}
              disabled={stage.id === 'elder'}
            />
            <DevButton label="영유아기로 ↺" onPress={() => void rewind()} />
          </View>

          <View style={styles.devRow}>
            <DevButton label="스탯 0 (방치)" onPress={() => void forceStats(0)} />
            <DevButton label="스탯 30" onPress={() => void forceStats(30)} />
            <DevButton label="스탯 100" onPress={() => void forceStats(100)} />
          </View>

          <View style={styles.devRow}>
            <DevButton label="여행 보내기 🧳" onPress={() => void forceDepart()} />
          </View>

          {/*
            배율이 기획값(1)이 아닐 때만 경고합니다. 늘 띄워두면 정상 상태에서도
            빨간 줄이 보여서, 정작 올려둔 채 커밋할 때 눈에 안 들어옵니다.
          */}
          <Text style={[styles.devNote, { color: c.textSecondary }]}>
            {GameConfig.decaySpeed === 1
              ? '감소 배율 1배(기획값) · 방치는 위 시연 도구로 확인하세요'
              : `지금 감소 배율 ${GameConfig.decaySpeed}배 · 커밋 전 1로 되돌리세요`}
          </Text>
        </View>
      )}

      {grewInto ? (
        <GrowthOverlay stage={grewInto} breed={pet.breed} onDone={() => setGrewInto(null)} />
      ) : null}
    </Screen>
  );
}

/** 시연 도구의 작은 버튼. 개발 빌드에서만 쓰입니다. */
function DevButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const c = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`개발용: ${label}`}
      style={({ pressed }) => [
        styles.devButton,
        { borderColor: c.border, backgroundColor: c.surfaceAlt },
        disabled && styles.careDisabled,
        pressed && styles.carePressed,
      ]}>
      <Text style={[styles.devButtonText, { color: c.textSecondary }]}>{label}</Text>
    </Pressable>
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
  headerActions: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  photoIcon: {
    fontSize: 15,
  },
  photoSpinner: {
    width: 15,
    height: 15,
  },
  /** 완성됐는데 아직 안 본 사진이 있다는 표시. */
  photoDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  photoLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
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
  keepsake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  keepsakeText: {
    flex: 1,
    gap: 2,
  },
  keepsakeTitle: {
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
  keepsakeBody: {
    fontSize: FontSize.caption,
  },
  keepsakeButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  keepsakeButton: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  keepsakeButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
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
  careSide: {
    fontSize: FontSize.caption,
    opacity: 0.7,
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
  careDisabled: {
    opacity: 0.45,
  },
  departEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  departTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  departBody: {
    fontSize: FontSize.body,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  departRecord: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  departRecordText: {
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  departButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.xl,
  },
  depart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  departWarnEmoji: {
    fontSize: 22,
  },
  departWarnText: {
    flex: 1,
  },
  departWarnTitle: {
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
  departWarnBody: {
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  dev: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  devTitle: {
    fontSize: FontSize.caption,
    fontWeight: '800',
  },
  devRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  devButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  devButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  devNote: {
    fontSize: FontSize.caption,
    opacity: 0.7,
  },
  careEmoji: {
    fontSize: 26,
  },
  careLabel: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
});

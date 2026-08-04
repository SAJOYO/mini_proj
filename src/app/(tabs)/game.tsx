import { useRouter } from 'expo-router';
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
import { BREEDS } from '@/constants/pet';
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
  SHOW_DEMO_TOOLS,
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
import { resetConversation } from '@/lib/persona-chat/memory-client';
import { clearPetName, ensureDeviceId, loadAnalysis } from '@/lib/storage';

/** 이 값보다 낮은 스탯이 하나라도 있으면 캐릭터가 시무룩해집니다. */
const SAD_BELOW = 25;

/** 이 간격 안에 다시 쓰다듬으면 "연달아 쓰다듬는 중"으로 봅니다. */
const PAT_STREAK_WINDOW_MS = 1500;

/**
 * 판정 근거 한 줄의 높이.
 *
 * "이 문장이 한 줄에 들어가는가"를 재는 기준이라 스타일과 **같은 값이어야**
 * 합니다. 아래 face/faceMore/faceProbe 의 lineHeight 가 전부 이걸 씁니다.
 */
const FACE_LINE_HEIGHT = 17;

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
  const {
    pet,
    isLoading,
    care,
    pat,
    release,
    skipStage,
    rewind,
    forceStats,
    forceDepart,
    forceWish,
  } = usePet();
  const photoJob = usePhotoJob();

  /**
   * 판정이 남긴 얼굴 관찰. "왜 이 동물인가"를 보여주는 데만 씁니다.
   *
   * 게임 규칙에는 안 씁니다 — 캐릭터의 생김새는 `pet.breed` 하나로 정해지고,
   * 퍼센트(혼합 비율)는 대화 쪽 성격 계산으로만 갑니다.
   */
  const [face, setFace] = useState<string>('');

  /** 위 관찰을 말풍선으로 펼쳐서 볼지. 기본은 접힘(한 줄)입니다. */
  const [faceOpen, setFaceOpen] = useState(false);

  /** 한 줄에 안 들어가는가. 그럴 때만 "더보기"를 답니다. */
  const [faceTruncated, setFaceTruncated] = useState(false);

  /** 말풍선이 뜰 높이. "함께한 N일째" 줄의 아래쪽입니다. */
  const [faceAnchorTop, setFaceAnchorTop] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadAnalysis().then((saved) => {
      if (!cancelled) setFace(saved?.face ?? '');
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /** 개발용 시연 도구를 펼쳤는지. 발표 화면을 가리지 않게 기본은 접어둡니다. */
  const [devOpen, setDevOpen] = useState(false);

  /** 연달아 쓰다듬은 횟수. 손을 떼면(1.5초) 초기화됩니다. */
  const patStreak = useRef(0);
  const lastPatAt = useRef(0);

  // 캐릭터는 여기서 만들지 않습니다. 사진 화면이 판정 직후에 hatch() 를 부릅니다.
  // (탭은 주소 파라미터로 진입하지 않아서, 예전처럼 params 로 품종을 받을 수 없습니다.)

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
    // 연타 간격을 재려면 지금 시각이 필요합니다. 렌더가 아니라 손가락이 닿았을
    // 때 부르는 함수라 매번 값이 달라도 됩니다 — 컴파일러는 그 구분을 못 해서
    // 렌더 중 호출로 봅니다.
    // eslint-disable-next-line react-hooks/purity
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

    setKeepsakeOf(null);

    // 단계만 넘깁니다. 품종·사진은 저 화면이 pet에서 직접 읽고, 문장은 그 둘로
    // 다시 만듭니다(buildKeepsakePrompt는 순수 함수라 어디서 불러도 같습니다).
    //
    // 예전에는 사진과 문장까지 실어 보냈는데, 그러면 **주소에 사진이 통째로
    // 들어갑니다.** 웹에서 사진을 문자열로 저장하던 때 주소가 수십만 자로
    // 불어났습니다. 화면 사이로 큰 값을 나르지 않는 편이 안전합니다.
    router.push({ pathname: '/photo-gen', params: { stage: from.id } });
  }

  /**
   * 캐릭터를 지울 때 채팅 쪽 흔적도 같이 지웁니다.
   *
   * `release()`(lib/pet.tsx)는 게임 캐릭터 상태만 지웁니다 — 채팅은 별개
   * 도메인이라 그쪽은 모릅니다(파일 상단 주석 참고). 여기서 지우지 않으면
   * 새로 키운(다른 품종·다른 성격의) 캐릭터가 이전 캐릭터의 이름과 대화
   * 기억(서버 요약)을 그대로 물려받습니다 — 다른 애완견인데 전 애를 기억하는
   * 셈이라 이상합니다.
   */
  async function resetChatForNewPet() {
    await clearPetName();
    const deviceId = await ensureDeviceId();
    await resetConversation(deviceId);
  }

  /**
   * 떠난 뒤 처음부터 다시 시작합니다.
   * 캐릭터를 지우고 사진 업로드 화면으로 보냅니다(확인 창은 띄우지 않습니다 —
   * 이미 게임이 끝난 상태라 되돌릴 것이 없습니다).
   */
  async function handleStartOver() {
    await release();
    await resetChatForNewPet();
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
    await resetChatForNewPet();
    router.replace('/photo');
  }

  // 아직 저장소를 읽는 중
  if (isLoading) {
    return (
      <Screen center edges={['top']}>
        <Text style={[styles.loading, { color: c.textSecondary }]}>캐릭터를 준비하는 중...</Text>
      </Screen>
    );
  }

  // 아직 판정을 안 했으면 사진 화면으로 안내합니다
  if (!pet) {
    return (
      <Screen center edges={['top']}>
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
      <Screen center edges={['top']}>
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
  const photoBusy = isRunning(photoJob);
  const photoReady = photoJob.unseen !== null;
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
    <Screen scroll edges={['top']}>
      {/*
        말풍선이 떠 있는 동안 화면 전체를 덮는 투명한 막.

        말풍선 밖 아무 데나 누르면 닫히게 하는 장치입니다. 이게 없으면 닫는
        방법이 헤더를 다시 누르는 것뿐이라, 열어놓고 다른 걸 만지려다 헛손질을
        합니다. 막이 눌림을 먹는 것도 그래서 일부러입니다 — 닫는 그 한 번은
        아래 버튼으로 넘어가지 않습니다.

        말풍선은 헤더(zIndex 2) 안에 있어서 이 막(zIndex 1) 위에 그대로 뜹니다.
        Screen 의 안쪽 여백만큼 음수로 빼서 화면 가장자리까지 덮습니다.
      */}
      {face && faceOpen ? (
        <Pressable
          style={styles.faceBackdrop}
          onPress={() => setFaceOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="닮은 이유 닫기"
        />
      ) : null}
      <View style={styles.header}>
        {/*
          품종 · 날짜 · 판정 근거를 **한 덩어리로** 누릅니다.

          처음에는 화살표만, 다음에는 날짜 줄만 버튼이었는데 폰에서 자꾸
          빗나갔습니다. 글자 한 줄은 손가락보다 얇습니다. 이 세 줄은 어차피
          "이 아이가 누구인가" 하나를 설명하는 묶음이라, 통째로 누르게 했습니다.
        */}
        <Pressable
          style={styles.headerText}
          onPress={face ? () => setFaceOpen((open) => !open) : undefined}
          disabled={!face}
          accessibilityRole={face ? 'button' : undefined}
          accessibilityState={face ? { expanded: faceOpen } : undefined}
          accessibilityLabel={
            face ? (faceOpen ? '닮은 이유 접기' : '닮은 이유 펼치기') : undefined
          }>
          <Text style={[styles.breed, { color: c.text }]}>
            {nickname}
            {objectParticle(nickname)} 닮은{' '}
            <Text style={{ color: c.primary }}>{BREEDS[pet.breed].label}</Text>
          </Text>
          {/*
            말풍선이 뜰 자리를 이 줄에서 재둡니다 — 헤더 높이는 오른쪽 버튼들이
            정해서, 그걸 기준으로 잡으면 말풍선이 한참 아래에 뜹니다.
          */}
          <View
            style={styles.daysRow}
            onLayout={(e) =>
              setFaceAnchorTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
            }>
            <Text style={[styles.days, { color: c.textSecondary }]}>함께한 {days + 1}일째</Text>
          </View>
          {face ? (
            <View style={styles.faceRow}>
              <Text
                // 말풍선이 떠 있는 동안에는 감춥니다. 안 그러면 잘린 첫 문장과
                // 말풍선 속 같은 문장이 나란히 보여서 두 번 쓴 것처럼 읽힙니다.
                // 지우지 않고 투명하게만 두는 건 자리를 남겨 화면이 안 튀게 하려는 것입니다.
                style={[styles.face, { color: c.textSecondary }, faceOpen && styles.faceHidden]}
                numberOfLines={1}>
                {face}
              </Text>
              {faceTruncated && !faceOpen ? (
                <Text style={[styles.faceMore, { color: c.primary }]}>더보기</Text>
              ) : null}

              {/*
                잘리는지 재기 위한 보이지 않는 복사본.

                RN 은 "이 글자가 잘렸는가"를 알려주지 않습니다. numberOfLines 를
                건 Text 는 잘린 뒤의 줄만 세어주기 때문입니다. 그래서 제한을
                걸지 않은 같은 글자를 한 벌 더 그려두고, **그게 한 줄보다 높으면**
                "한 줄에 안 들어간다"고 봅니다. 눈에는 안 보이고 자리도 안 먹습니다.

                줄 수를 세는 onTextLayout 이 더 곧바로지만 **웹에 없습니다.**
                (react-native-web 미구현) 그걸 쓰다가 앱에서만 "더보기"가 뜨고
                웹에서는 안 뜨는 일이 있었습니다. onLayout 은 양쪽 다 됩니다.
              */}
              <Text
                style={styles.faceProbe}
                onLayout={(e) =>
                  setFaceTruncated(e.nativeEvent.layout.height > FACE_LINE_HEIGHT + 1)
                }>
                {face}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={() => void handleRelease()} hitSlop={8}>
            <Text style={[styles.reset, { color: c.textSecondary }]}>다시 키우기</Text>
          </Pressable>

          {/*
            사진은 앨범에서 만듭니다. 여기 버튼은 앨범 하나뿐입니다.

            예전에는 "사진 만들기"가 따로 나란히 있었는데, 둘 다 결국 사진
            이야기라 헤더에서 자리만 다투었습니다. 만든 사진이 쌓이는 곳이
            앨범이니, 만드는 입구도 거기에 두는 편이 찾기 쉽습니다.

            다만 진행 상황은 여기 남깁니다 — 사진이 만들어지는 동안에도 이
            화면에서 계속 놀 수 있어서, 다 됐는지를 게임 화면에서 알 수 있어야
            합니다. 도는 중이면 spinner, 다 됐으면 빨간 점입니다.
            (진행 상태 자체는 lib/photo-job.tsx가 화면 밖에서 들고 있습니다)
          */}
          <Pressable
            onPress={() => router.push('/album')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              photoBusy ? '사진 만드는 중' : photoReady ? '사진 완성됨' : '앨범 보기'
            }
            style={[styles.photoButton, { backgroundColor: c.surface, borderColor: c.border }]}>
            {photoBusy ? (
              // 이모지와 자리를 맞춰서 도는 동안 버튼 폭이 흔들리지 않게 합니다.
              <ActivityIndicator size="small" color={c.primary} style={styles.photoSpinner} />
            ) : (
              <Text style={styles.photoIcon}>🖼️</Text>
            )}
            <Text style={[styles.photoLabel, { color: c.textSecondary }]}>
              {photoBusy ? '만드는 중' : '앨범'}
            </Text>
            {photoReady ? <View style={[styles.photoDot, { backgroundColor: c.primary }]} /> : null}
          </Pressable>
        </View>

        {/*
          펼친 판정 근거. 헤더 **위에 떠서** 보여줍니다.

          자리를 차지하며 늘어나면 아래 캐릭터가 통째로 밀려 내려가서, 펼칠
          때마다 화면이 출렁입니다. 말풍선으로 띄우면 뒤 배치는 그대로입니다.

          "함께한 N일째" 줄 바로 아래(faceAnchorTop)에 달고, 폭은 헤더 전체를
          씁니다. 오른쪽 사진/앨범 버튼을 덮지만, 잠깐 뜨는 것이라 괜찮습니다.
        */}
        {face && faceOpen ? (
          <Pressable
            onPress={() => setFaceOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="닮은 이유 닫기"
            style={[
              styles.facePopover,
              { top: faceAnchorTop, backgroundColor: c.surface, borderColor: c.border },
            ]}>
            <Text style={[styles.facePopoverText, { color: c.text }]}>{face}</Text>
          </Pressable>
        ) : null}
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

      {/*
        여기부터 아래(성장 바 · 스탯 · 돌봄 버튼)는 **화면 바닥에 붙여 둡니다.**

        위쪽에는 상황에 따라 나타났다 사라지는 카드가 넷 있습니다 — 성장 축하,
        떠나기 경고, 돌봄 진행 바, 바라는 것. 예전에는 그게 뜰 때마다 아래
        UI 가 통째로 밀려서, 밥 주려고 누른 버튼이 손가락 밑에서 움직였습니다.

        이 빈칸이 남는 세로 공간을 다 먹고 있다가 카드가 뜨면 그만큼 줄어듭니다.
        아래는 제자리에 그대로 있습니다. 화면보다 내용이 길어지면 빈칸이 0이
        되고 평소처럼 스크롤됩니다.
      */}
      <View style={styles.bottomSpacer} />

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
                    // 진행 바가 **버튼 안**에 들어갑니다. 예전에는 화면 가운데
                    // 별도 카드로 떠서, 어느 버튼을 눌러 시작한 건지 눈이 한 번
                    // 옮겨가야 했고 그때마다 아래 UI 가 통째로 밀렸습니다.
                    // 사이드이펙트 안내가 있던 줄에 그대로 앉힙니다.
                    <ActivityBar
                      compact
                      // 액션이 바뀌면 새로 시작해야 하므로 key를 붙입니다.
                      key={action.id}
                      label={action.activityLabel}
                      emoji={action.emoji}
                      durationMs={action.activityMs}
                      onDone={() => void finishCare(action.id)}
                    />
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
        대화는 버튼이 아니라 스와이프로 갑니다 — 이 화면과 대화 화면이 탭 형제입니다.
        (탭 형제로 router.push 를 하면 스택이 쌓여서 뒤로가기가 이상해집니다.)
        성격은 판정이 남긴 혼합 비율에서 만들어지므로 여기서 넘길 값이 없습니다.
      */}
      <Text style={[styles.swipeHint, { color: c.textSecondary }]}>
        ← 옆으로 밀면 {BREEDS[pet.breed].label}와 대화할 수 있어요
      </Text>

      {SHOW_DEMO_TOOLS && (
        // 개발·발표 시연용. `EXPO_PUBLIC_DEMO_TOOLS=1` 일 때만 보입니다
        // (로컬은 .env, 발표용 APK 는 eas.json 의 `demo` 프로필).
        // 시간을 실제로 흘려 기다리지 않고도 성장·방치·엔딩을 확인하려는 목적입니다.
        //
        // 켜더라도 기본은 접어둡니다. 펼친 채로 두면 게임 화면의 절반을 차지해서
        // 정작 보여줄 것을 가립니다. 그렇다고 지우면 성장·엔딩을 시연할 방법이
        // 없습니다 — 노년기 진입이 함께한 지 7일, 청년기가 180 EXP 라 실제로
        // 기다릴 수 없습니다.
        <View style={[styles.dev, { borderColor: c.border }]}>
          <Pressable
            onPress={() => setDevOpen((open) => !open)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ expanded: devOpen }}>
            <Text style={[styles.devTitle, { color: c.textSecondary }]}>
              개발용 시연 도구 {devOpen ? '▴' : '▾'}
            </Text>
          </Pressable>

          {devOpen && (
            <>
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

              {/*
                소원(바라는 것)을 지금 띄웁니다. 그냥 두면 1분 주기에 60%
                확률이라 시연 중에 안 나올 수 있습니다. 눌러서 들어주면
                보너스 경험치가 붙는 것까지 그대로 확인됩니다.
              */}
              <View style={styles.devRow}>
                {CARE_ACTIONS.map((action) => (
                  <DevButton
                    key={action.id}
                    label={`${action.emoji} 바라기`}
                    onPress={() => void forceWish(action.id)}
                    disabled={!careOpen}
                  />
                ))}
              </View>

              <View style={styles.devRow}>
                <DevButton label="여행 보내기 🧳" onPress={() => void forceDepart()} />
              </View>

              <Text style={[styles.devNote, { color: c.textSecondary }]}>
                감소 배율 1배(기획값) · 방치는 위 시연 도구로 확인하세요
              </Text>
            </>
          )}

          {/*
            배율 경고는 접어도 보입니다. 접힌 채로 숨기면 올려둔 걸 잊고
            커밋하게 됩니다 — 경고는 눈에 띄어야 경고입니다.
            기획값(1)일 때는 안 띄웁니다. 늘 띄우면 정상 상태에서도 빨간 줄이
            보여서, 정작 올려뒀을 때 눈에 안 들어옵니다.
          */}
          {GameConfig.decaySpeed !== 1 && (
            <Text style={[styles.devNote, { color: c.danger }]}>
              지금 감소 배율 {GameConfig.decaySpeed}배 · 커밋 전 1로 되돌리세요
            </Text>
          )}
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
    // 말풍선이 헤더 밖으로 나가 아래 내용을 덮어야 해서, 헤더가 위에 옵니다.
    // (안드로이드는 zIndex 만으로는 안 되고 elevation 이 있어야 합니다)
    zIndex: 2,
  },
  faceBackdrop: {
    position: 'absolute',
    // Screen 이 준 안쪽 여백(Spacing.lg) 밖까지 덮습니다.
    top: -Spacing.lg,
    left: -Spacing.lg,
    right: -Spacing.lg,
    bottom: -Spacing.lg,
    zIndex: 1,
  },
  facePopover: {
    position: 'absolute',
    // top 은 "함께한 N일째" 줄 아래로 화면에서 정합니다. 살짝 띄워서 붙어
    // 보이지 않게 합니다.
    marginTop: Spacing.xs,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
    elevation: 4,
  },
  facePopoverText: {
    fontSize: FontSize.caption,
    lineHeight: 19,
  },
  headerText: {
    flex: 1,
  },
  breed: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  days: {
    fontSize: FontSize.caption,
    marginTop: 2,
  },
  faceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  face: {
    fontSize: FontSize.caption,
    lineHeight: FACE_LINE_HEIGHT,
    // 줄어들 수 있어야 "더보기"에게 자리를 내주고 잘립니다.
    flexShrink: 1,
  },
  faceHidden: {
    opacity: 0,
  },
  faceMore: {
    fontSize: FontSize.caption,
    lineHeight: FACE_LINE_HEIGHT,
    fontWeight: '700',
    marginLeft: Spacing.xs,
    // 줄어들면 안 됩니다. 웹에서 이게 빠져 있어 "더/보/기" 로 세로로 쪼개졌습니다
    // — 자리가 모자라면 잘려야 하는 건 문장 쪽이지 이 글자가 아닙니다.
    flexShrink: 0,
  },
  faceProbe: {
    // 줄 수만 세는 용도라 보이지도, 자리를 차지하지도, 눌리지도 않습니다.
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
    pointerEvents: 'none',
    fontSize: FontSize.caption,
    lineHeight: FACE_LINE_HEIGHT,
  },
  swipeHint: {
    fontSize: FontSize.caption,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
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
    // 두 줄이 되는 경우(소원을 들어줘 보너스가 붙을 때)가 있어서 가운데로
    // 맞춥니다. 왼쪽 정렬이면 짧은 둘째 줄이 한쪽으로 쏠려 보입니다.
    textAlign: 'center',
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
  bottomSpacer: {
    // 남는 세로 공간을 전부 먹습니다. 위쪽 카드가 뜨면 그만큼 줄어듭니다.
    flex: 1,
    // 카드가 많이 떠서 빈칸이 0이 되어도 성장 바가 위 내용에 딱 붙지는 않게.
    minHeight: Spacing.md,
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
    // 시연 도구는 접혀 있을 때 한 줄짜리라, 위아래로 넉넉히 띄우면 그 여백이
    // 도구보다 커 보입니다. 게임 화면에 얹힌 군더더기라 조용히 붙여 둡니다.
    marginTop: Spacing.xs,
    marginBottom: 0,
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

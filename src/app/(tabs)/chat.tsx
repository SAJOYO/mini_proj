import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { type BreedId } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { ChatCompletionsClient } from '@/lib/llm/client';
import { chatTarget } from '@/lib/llm/config';
import { anchorMix, dominantBreed, resolveMix, synthesize, DEFAULT_MIX } from '@/lib/persona';
import { ChatCompletionsPersonaClient, type ChatTurn } from '@/lib/persona-chat/chat-client';
import { appendTurns, fetchConversation } from '@/lib/persona-chat/memory-client';
import { describeFailure, NO_CHAT_KEY } from '@/lib/failure-message';
import { ensureDeviceId, loadAnalysis, loadPetName, savePetName } from '@/lib/storage';

/**
 * 반려동물과 대화하는 화면 (오른쪽 페이지).
 *
 * 성격은 사진 판정 결과(`@pet/analysis`의 mix)에서 나옵니다.
 * mix → `synthesize()` → 성격 카드 → 시스템 프롬프트 순서로 흘러가고,
 * 그 배관은 전부 `lib/persona`와 `lib/persona-chat`에 있습니다.
 * 이 파일은 화면과 입력만 담당합니다.
 *
 * 판정 전이면 `DEFAULT_MIX`(중립)로 떨어져서 기본 말투로 대화합니다 —
 * 사진을 안 올렸다고 화면이 죽지는 않습니다.
 *
 * 주의: `edges={['top']}` 입니다. 아래쪽 안전영역은 탭 레이아웃의 점 인디케이터가
 * 이미 처리하므로 여기서 또 넣으면 여백이 두 번 들어갑니다.
 *
 * 주의: 좌우 스와이프로 화면을 넘기는 구조라, 가로로 스크롤되는 요소를 넣으면
 * 제스처가 서로 잡아먹습니다. 세로 스크롤은 문제없습니다.
 */

type Message = { id: string; role: 'user' | 'assistant'; content: string; failed?: boolean };

/** 대화 설정. 모듈 최상위에서 한 번만 읽습니다. 키가 없으면 null 입니다. */
const CHAT = chatTarget();

/** 안내 문구가 스스로 사라지기까지. */
const NOTICE_MS = 5000;

/** user?.nickname마저 없는(이론상 거의 없는) 경우에만 쓰는 최후 fallback. */
const DEFAULT_PET_NAME = '닉네임';

/** 이름이 없을 때 대화창에 먼저 띄우는 인사. 파싱 없이 결정적으로 동작하도록,
 * 이 말풍선 다음에 오는 사용자의 답을 그대로 이름으로 저장합니다(LLM 호출 없음). */
const NAMING_PROMPT = '안녕! 아직 이름이 없어 ㅠㅠ\n내 이름을 뭐라고 지어줄래?';

/** 따옴표 안쪽을 이름으로 봅니다. 없으면 문장 전체를 그대로 씁니다. */
function fallbackName(raw: string): string {
  const quoted = raw.match(/["'「『]([^"'」』]{1,20})["'」』]/);
  return (quoted?.[1] ?? raw).trim().slice(0, 20);
}

/**
 * 사용자가 자유 문장으로 지어준 이름에서 이름만 뽑아냅니다.
 *
 * "안녕 너의 이름은 오늘부터 "먕먕이"야" 처럼 문장째로 답하는 경우가 흔해서,
 * 그 문장을 통째로 저장하면 헤더에 문장이 그대로 뜹니다. 캐릭터 연기용
 * 페르소나 클라이언트(`persona-chat/chat-client.ts`)는 "3줄 이하로 답한다"
 * 같은 규칙이 껴 있어 이 추출에는 안 맞아서, 여기서는 `llm/client.ts`를
 * 직접 써서 이름만 뽑도록 시킵니다. 키가 없거나 호출이 실패하면
 * `fallbackName`(따옴표 추출 → 문장 전체)으로 내려갑니다.
 */
async function extractPetName(raw: string): Promise<string> {
  if (!CHAT) return fallbackName(raw);

  try {
    const client = new ChatCompletionsClient({ apiKey: CHAT.apiKey, baseUrl: CHAT.baseUrl });
    const text = await client.complete({
      model: CHAT.model,
      messages: [
        {
          role: 'user',
          content: [
            '다음 문장에서 사용자가 반려동물에게 지어준 이름만 뽑아라.',
            '다른 설명, 조사, 문장부호 없이 이름만 출력해라.',
            '',
            `문장: ${raw}`,
          ].join('\n'),
        },
      ],
      maxTokens: 20,
    });
    const cleaned = text.trim().replace(/^["'「『]+|["'」』]+$/g, '');
    return cleaned || fallbackName(raw);
  } catch {
    return fallbackName(raw);
  }
}

export default function ChatScreen() {
  const c = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [mix, setMix] = useState(DEFAULT_MIX);
  const [analyzed, setAnalyzed] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  /** 사용자가 채팅으로 지어준 이름. 아직 없으면 null(헤더엔 사용자 자신의 닉네임으로 표시). */
  const [petName, setPetName] = useState<string | null>(null);
  /** 다음 사용자 메시지를 "이름 짓기 답변"으로 처리할지. */
  const [namingMode, setNamingMode] = useState(false);
  /** 서버가 압축해 돌려준 이전 대화 요약(롱텀 메모리). 저장 서버가 없으면 계속 null. */
  const [summary, setSummary] = useState<string | null>(null);
  /** 이 기기의 익명 ID. 대화를 저장/복원할 때 씁니다. 준비되기 전엔 저장을 건너뜁니다. */
  const deviceId = useRef<string | null>(null);
  /**
   * 입력창 위에 잠깐 뜨는 안내.
   *
   * 다시 시도하면 되는 오류(한도·네트워크)는 말풍선으로 남기지 않습니다.
   * 남기면 대화 기록이 에러로 채워지고, 캐릭터가 그 말을 한 것처럼 보입니다.
   */
  const [notice, setNotice] = useState<string | null>(null);

  // 중복 전송 차단은 ref 로 합니다. state 는 다음 렌더에야 바뀌므로 같은 틱에
  // 두 번 눌리면 둘 다 false 를 읽고 통과합니다.
  const busy = useRef(false);
  const scroller = useRef<ScrollView>(null);

  /** 안내를 띄우고 잠시 뒤 스스로 사라지게 합니다. */
  const showNotice = useCallback((text: string) => {
    setNotice(text);
    setTimeout(() => setNotice((current) => (current === text ? null : current)), NOTICE_MS);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadAnalysis().then((saved) => {
      if (cancelled) return;
      if (saved) {
        // 결과 화면에서 고른 품종을 맨 앞으로 올립니다. 이걸 빼면 게임에는
        // 고른 동물이, 여기에는 판정 1순위가 떠서 같은 캐릭터가 둘로 보입니다.
        // 퍼센트는 모델이 낸 그대로입니다 — 순서만 바뀝니다.
        setMix(anchorMix(resolveMix(saved.mix), saved.chosen as BreedId | undefined));
      }
      setAnalyzed(saved !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 저장된 이름이 있으면 그걸 씁니다. 없으면 새로고침 때마다(대화가 항상
  // 빈 화면으로 시작하는 것과 같은 이유로) 이름부터 다시 물어봅니다.
  useEffect(() => {
    let cancelled = false;
    loadPetName().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setPetName(stored);
        return;
      }
      setNamingMode(true);
      setMessages((prev) =>
        prev.length === 0
          ? [{ id: 'naming-prompt', role: 'assistant', content: NAMING_PROMPT }]
          : prev,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 새로고침하면 화면의 말풍선은 항상 빈 대화로 시작합니다 — 원문 턴을
  // 다시 그리지 않습니다. 대신 서버가 압축해 둔 요약(summary)만 가져와서
  // 시스템 프롬프트에 끼워 넣습니다. "화면은 비었지만 캐릭터는 이전 대화를
  // 기억한다"가 이 기능의 핵심이라, turns는 일부러 messages에 반영하지 않습니다.
  useEffect(() => {
    let cancelled = false;
    ensureDeviceId().then(async (id) => {
      if (cancelled) return;
      deviceId.current = id;

      const { summary: savedSummary } = await fetchConversation(id);
      if (cancelled) return;

      setSummary(savedSummary);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // mix 는 이미 기준점이 맨 앞입니다. 그래도 synthesize 에 다시 넘겨야 합니다 —
  // 안에서 resolveMix 로 비율 내림차순 재정렬을 하기 때문에, 안 넘기면
  // 애써 올려둔 기준점이 도로 내려갑니다.
  const breed = dominantBreed(mix);
  // 성격은 저장하지 않고 mix 에서 매번 다시 만듭니다 (synthesize 는 순수 함수).
  const card = useMemo(() => synthesize(mix, breed), [mix, breed]);
  // 아직 채팅으로 이름을 안 지어줬으면 로그인 때 정한 내 닉네임을 자리표시자로 씁니다
  // (문자 그대로 "닉네임"이라는 라벨을 보여주는 게 아니라, 실제 내 닉네임입니다).
  const displayName = petName ?? user?.nickname ?? DEFAULT_PET_NAME;

  const client = useMemo(
    () =>
      CHAT
        ? new ChatCompletionsPersonaClient({ apiKey: CHAT.apiKey, baseUrl: CHAT.baseUrl })
        : null,
    [],
  );

  async function send() {
    const text = draft.trim();
    if (!text || busy.current) return;

    if (namingMode) {
      busy.current = true;
      setSending(true);
      setDraft('');
      setMessages((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', content: text }]);

      const name = await extractPetName(text);
      const confirmation = `${name}구나! 마음에 들어 헤헤`;

      setMessages((prev) => [
        ...prev,
        { id: `a-${prev.length}`, role: 'assistant', content: confirmation },
      ]);
      setPetName(name);
      setNamingMode(false);
      void savePetName(name);

      busy.current = false;
      setSending(false);
      return;
    }

    if (!client || !CHAT) {
      showNotice(NO_CHAT_KEY);
      return;
    }

    busy.current = true;
    setSending(true);
    setNotice(null);
    setDraft('');

    // 실패한 답은 히스토리에서 뺍니다. 에러 문구를 캐릭터가 한 말로
    // 기억시키면 다음 대답이 그걸 이어받습니다.
    const history: ChatTurn[] = [
      ...messages.filter((m) => !m.failed).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: text },
    ];

    setMessages((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', content: text }]);

    try {
      const answer = await client.reply({
        model: CHAT.model,
        card,
        name: displayName,
        history,
        summary,
      });
      setMessages((prev) => [
        ...prev,
        { id: `a-${prev.length}`, role: 'assistant', content: answer },
      ]);

      // 저장은 부가 기능입니다 — 실패해도 대화 자체는 막지 않습니다(memory-client 참고).
      if (deviceId.current) {
        void appendTurns(deviceId.current, [
          { role: 'user', content: text },
          { role: 'assistant', content: answer },
        ]);
      }
    } catch (error) {
      // 원본은 화면에 뿌리지 않되 버리지도 않습니다. 개발 중에는 원인을 봐야 합니다.
      console.warn('[chat] 요청 실패:', error);

      const { text: message, retryable } = describeFailure(error);
      if (retryable) {
        // 다시 하면 되는 것은 안내로만. 대화 기록을 에러로 채우지 않습니다.
        showNotice(message);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: `a-${prev.length}`, role: 'assistant', content: message, failed: true },
        ]);
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  }

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}>
            <Text style={styles.avatarFace}>🐶</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.name, { color: c.text }]}>{displayName}</Text>
          </View>
        </View>

        <ScrollView
          ref={scroller}
          style={styles.thread}
          contentContainerStyle={styles.threadBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 &&
            (analyzed ? (
              <Text style={[styles.empty, { color: c.textSecondary }]}>
                {displayName}에게 말을 걸어보세요.
              </Text>
            ) : (
              // 판정 전에는 중립 캐릭터라 성격이 없습니다. 왜 그런지 보여줍니다.
              // 대화 자체는 막지 않습니다 — 막으면 챗봇팀이 개발할 때 불편합니다.
              <View style={styles.emptyBox}>
                <Text style={[styles.empty, { color: c.textSecondary }]}>
                  아직 닮은 동물을 찾지 않았어요.{'\n'}
                  사진을 올리면 그 아이의 성격으로 대화해요.
                </Text>
                <Pressable
                  onPress={() => router.push('/photo')}
                  style={[styles.emptyButton, { borderColor: c.primary }]}>
                  <Text style={[styles.emptyButtonText, { color: c.primary }]}>
                    사진 올리러 가기
                  </Text>
                </Pressable>
              </View>
            ))}

          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'user'
                  ? [styles.mine, { backgroundColor: c.primary }]
                  : [
                      styles.theirs,
                      { backgroundColor: c.surface, borderColor: m.failed ? c.danger : c.border },
                    ],
              ]}>
              <Text
                style={[
                  styles.bubbleText,
                  { color: m.role === 'user' ? c.onPrimary : m.failed ? c.danger : c.text },
                ]}>
                {m.content}
              </Text>
            </View>
          ))}

          {sending && (
            <View
              style={[
                styles.bubble,
                styles.theirs,
                { backgroundColor: c.surfaceAlt, borderColor: c.border },
              ]}>
              <Text style={[styles.bubbleText, { color: c.textSecondary }]}>...</Text>
            </View>
          )}
        </ScrollView>

        {/* 다시 하면 되는 오류는 여기에 잠깐 떴다 사라집니다. 대화 기록은 안 건드립니다. */}
        {notice && (
          <View style={[styles.notice, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
            <Text style={[styles.noticeText, { color: c.textSecondary }]}>{notice}</Text>
          </View>
        )}

        <View style={[styles.composer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={CHAT ? '메시지를 입력하세요' : '대화용 API 키가 필요해요'}
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text }]}
            returnKeyType="send"
            onSubmitEditing={send}
            onKeyPress={(e) => {
              // multiline 입력창은 웹에서 Enter가 onSubmitEditing을 안 띄우고
              // 줄바꿈만 넣습니다. Shift+Enter는 줄바꿈으로 남기고 Enter만 전송으로 뺍니다.
              if (Platform.OS !== 'web') return;
              const { key, shiftKey } = e.nativeEvent as unknown as {
                key: string;
                shiftKey?: boolean;
              };
              if (key === 'Enter' && !shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            editable={!sending}
            multiline
          />
          <Pressable
            onPress={send}
            disabled={sending || !draft.trim()}
            hitSlop={8}
            style={[
              styles.sendButton,
              { backgroundColor: draft.trim() && !sending ? c.primary : c.border },
            ]}>
            <Text style={[styles.sendLabel, { color: c.onPrimary }]}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFace: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  thread: {
    flex: 1,
  },
  threadBody: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  empty: {
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 20,
  },
  emptyBox: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyButton: {
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  emptyButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  notice: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  noticeText: {
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  theirs: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderBottomLeftRadius: Radius.sm,
  },
  mine: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: Radius.sm,
  },
  bubbleText: {
    fontSize: FontSize.body,
    lineHeight: 21,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    maxHeight: 96,
    // Screen 이 userSelect: 'none' 을 걸어두므로 입력창에서만 다시 켭니다.
    userSelect: 'text',
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendLabel: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
});

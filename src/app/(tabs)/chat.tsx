import { useEffect, useMemo, useRef, useState } from 'react';
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
import { BREEDS } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { chatTarget } from '@/lib/llm/config';
import { dominantBreed, resolveMix, synthesize, DEFAULT_MIX } from '@/lib/persona';
import { ChatCompletionsPersonaClient, type ChatTurn } from '@/lib/persona-chat/chat-client';
import { loadAnalysis } from '@/lib/storage';

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

export default function ChatScreen() {
  const c = useTheme();
  const { user } = useAuth();

  const [mix, setMix] = useState(DEFAULT_MIX);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // 중복 전송 차단은 ref 로 합니다. state 는 다음 렌더에야 바뀌므로 같은 틱에
  // 두 번 눌리면 둘 다 false 를 읽고 통과합니다.
  const busy = useRef(false);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    loadAnalysis().then((saved) => {
      if (!cancelled && saved) setMix(resolveMix(saved.mix));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 성격은 저장하지 않고 mix 에서 매번 다시 만듭니다 (synthesize 는 순수 함수).
  const card = useMemo(() => synthesize(mix), [mix]);
  const breed = dominantBreed(mix);
  const petName = BREEDS[breed].label;

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

    if (!client || !CHAT) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${prev.length}`,
          role: 'assistant',
          failed: true,
          content: 'API 키가 없어서 대답할 수 없어요. .env 를 확인해 주세요.',
        },
      ]);
      return;
    }

    busy.current = true;
    setSending(true);
    setDraft('');

    // 실패한 답은 히스토리에서 뺍니다. 에러 문구를 캐릭터가 한 말로
    // 기억시키면 다음 대답이 그걸 이어받습니다.
    const history: ChatTurn[] = [
      ...messages.filter((m) => !m.failed).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: text },
    ];

    setMessages((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', content: text }]);

    try {
      const answer = await client.reply({ model: CHAT.model, card, name: petName, history });
      setMessages((prev) => [
        ...prev,
        { id: `a-${prev.length}`, role: 'assistant', content: answer },
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setMessages((prev) => [
        ...prev,
        { id: `a-${prev.length}`, role: 'assistant', content: reason, failed: true },
      ]);
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
            <Text style={[styles.name, { color: c.text }]}>{petName}</Text>
            <Text style={[styles.status, { color: c.textSecondary }]} numberOfLines={1}>
              {card.archetype} · {user?.nickname ?? '친구'}님과 대화 중
            </Text>
          </View>
        </View>

        <ScrollView
          ref={scroller}
          style={styles.thread}
          contentContainerStyle={styles.threadBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 && (
            <Text style={[styles.empty, { color: c.textSecondary }]}>
              {petName}에게 말을 걸어보세요.
            </Text>
          )}

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

        <View style={[styles.composer, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={CHAT ? '메시지를 입력하세요' : 'API 키가 없어요'}
            placeholderTextColor={c.textSecondary}
            style={[styles.input, { color: c.text }]}
            returnKeyType="send"
            onSubmitEditing={send}
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
  status: {
    fontSize: FontSize.caption,
    marginTop: 2,
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

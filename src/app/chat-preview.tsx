import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import {
  AXES,
  AXIS_KEYS,
  dominantBreed,
  resolveMix,
  synthesize,
  traitOf,
  type BreedMix,
} from '@/constants/persona';
import { BREEDS } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ChatCompletionsPersonaClient, type ChatTurn } from '@/lib/persona-chat/chat-client';

/**
 * 대화 확인용 화면 (개발용).
 *
 * 품종 혼합을 받아 성격을 확정하고, 그 성격으로 실제 대화가 되는지 봅니다.
 * `pet-preview`와 같은 성격의 화면입니다 — 최종 대화 화면이 아닙니다.
 *
 * ── 판정은 여기서 하지 않습니다 ─────────────────────────
 * 사진 → 품종 혼합은 이미 스크립트로 검증됐습니다(`npm run persona:infer`).
 * 이 화면이 확인하려는 건 "확정된 성격이 대화에 실제로 먹히는가"입니다.
 * 그래서 혼합은 밖에서 들어온 걸로 받습니다.
 *
 *   router.push({ pathname: '/chat-preview', params: { mix: JSON.stringify(mix) } })
 *
 * 넘어온 게 없으면 아래 샘플로 떨어집니다.
 *
 * ── 키에 대하여 ──────────────────────────────────────
 * Expo는 `EXPO_PUBLIC_*` 만 번들에 넣습니다. 그리고 번들에 들어간 값은
 * 앱을 열어보면 보입니다(README의 API 키 섹션 참고).
 *
 * 지금은 `EXPO_PUBLIC_CHAT_BASE_URL` 을 공급자로 직접 두고 있어서 키가
 * 노출되는 B안 형태입니다. 프록시를 두는 A안으로 가면 이 화면 코드는
 * 그대로 두고 `BASE_URL`을 프록시 주소로 바꾸고 키를 비우면 됩니다.
 */

/** 판정 결과가 안 넘어왔을 때 쓸 값. dog1.jpg 실측 결과입니다. */
const SAMPLE_MIX: BreedMix = [
  { breed: 'doberman', ratio: 55 },
  { breed: 'greyhound', ratio: 30 },
  { breed: 'pointer', ratio: 15 },
];

// Expo가 번들에 넣으려면 이렇게 통째로 적어야 합니다. 동적 접근은 치환되지 않습니다.
const CHAT_API_KEY = process.env.EXPO_PUBLIC_CHAT_API_KEY;
const CHAT_MODEL = process.env.EXPO_PUBLIC_CHAT_MODEL;
const CHAT_BASE_URL = process.env.EXPO_PUBLIC_CHAT_BASE_URL;

type Message = ChatTurn & { failed?: boolean };

export default function ChatPreviewScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ mix?: string; name?: string }>();
  const name = params.name ?? '단무';

  // 넘어온 mix를 파싱합니다. 깨져 있어도 resolveMix가 걸러냅니다.
  const card = useMemo(() => {
    const raw = params.mix ? safeParse(params.mix) : null;
    const mix = resolveMix(raw ?? SAMPLE_MIX);
    return synthesize(mix);
  }, [params.mix]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const configured = Boolean(CHAT_API_KEY && CHAT_MODEL && CHAT_BASE_URL);

  const client = useMemo(
    () =>
      configured
        ? new ChatCompletionsPersonaClient({
            apiKey: CHAT_API_KEY as string,
            baseUrl: CHAT_BASE_URL as string,
          })
        : null,
    [configured],
  );

  async function send() {
    const text = draft.trim();
    if (!text || !client || sending) return;

    const history: ChatTurn[] = [
      ...messages.filter((m) => !m.failed).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: text },
    ];

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setDraft('');
    setSending(true);

    try {
      const answer = await client.reply({ model: CHAT_MODEL as string, card, name, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setMessages((prev) => [...prev, { role: 'assistant', content: reason, failed: true }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      {/* ── 확정된 값. 답이 이상할 때 프롬프트 문제인지 모델 문제인지 여기서 갈립니다 ── */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>
          {name} — {card.archetype}
        </Text>
        <Text style={[styles.caption, { color: c.textSecondary }]}>
          {BREEDS[dominantBreed(card.mix)].label} 생김새 ·{' '}
          {card.mix.map((m) => `${BREEDS[m.breed].label} ${Math.round(m.ratio)}`).join(' / ')}
        </Text>
        <Text style={[styles.body, { color: c.text }]}>{card.description}</Text>

        <View style={styles.axes}>
          {AXIS_KEYS.map((key) => (
            <View key={key} style={[styles.axisChip, { backgroundColor: c.surfaceAlt }]}>
              <Text style={[styles.axisText, { color: c.textSecondary }]}>
                {AXES[key].label} {card.axes[key]} · {traitOf(key, card.axes[key])}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 대화 ── */}
      <ScrollView
        ref={scroller}
        style={styles.log}
        contentContainerStyle={styles.logBody}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
        {!configured && (
          <Text style={[styles.notice, { color: c.danger }]}>
            {'.env.local 에 EXPO_PUBLIC_CHAT_API_KEY / _MODEL / _BASE_URL 을 넣고\n'}
            개발 서버를 다시 띄워주세요.
          </Text>
        )}

        {configured && messages.length === 0 && (
          <Text style={[styles.notice, { color: c.textSecondary }]}>
            아무 말이나 걸어보세요. 성격이 말투에 실제로 반영되는지 봅니다.
          </Text>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              m.role === 'user'
                ? { alignSelf: 'flex-end', backgroundColor: c.primary }
                : { alignSelf: 'flex-start', backgroundColor: c.surfaceAlt },
              m.failed && { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.danger },
            ]}>
            <Text
              style={[
                styles.bubbleText,
                { color: m.failed ? c.danger : m.role === 'user' ? c.onPrimary : c.text },
              ]}>
              {m.content}
            </Text>
          </View>
        ))}

        {sending && <ActivityIndicator style={styles.spinner} color={c.textSecondary} />}
      </ScrollView>

      {/* ── 입력 ── */}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          editable={configured && !sending}
          placeholder={configured ? '말 걸어보기' : '설정이 필요합니다'}
          placeholderTextColor={c.textSecondary}
          returnKeyType="send"
          style={[
            styles.input,
            { backgroundColor: c.surface, borderColor: c.border, color: c.text },
          ]}
        />
        <Button
          label="전송"
          onPress={send}
          disabled={!configured || draft.trim().length === 0}
          loading={sending}
          style={styles.sendButton}
        />
      </View>
    </Screen>
  );
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.label,
    fontWeight: '700',
  },
  caption: {
    fontSize: FontSize.caption,
  },
  body: {
    fontSize: FontSize.body,
    marginTop: Spacing.xs,
  },
  axes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  axisChip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  axisText: {
    fontSize: FontSize.caption,
  },
  log: {
    flex: 1,
    marginTop: Spacing.md,
  },
  logBody: {
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  notice: {
    fontSize: FontSize.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleText: {
    fontSize: FontSize.body,
  },
  spinner: {
    alignSelf: 'flex-start',
    marginLeft: Spacing.sm,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 54,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.body,
  },
  sendButton: {
    paddingHorizontal: Spacing.md,
  },
});

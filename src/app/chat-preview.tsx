import { useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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
 * 넘어온 값은 목록 맨 앞에 "들어온 값"으로 붙습니다. 없으면 아래 표본만 씁니다.
 *
 * ── 개체를 바꿔가며 본다 ─────────────────────────────
 * 하나만 보면 "그럴듯한 답이 온다"까지만 알 수 있습니다. 성격 값이 답을
 * 바꾸는지는 같은 말을 다른 성격에게 걸어봐야 보입니다. 그래서 카드 안에
 * 개체를 넘기는 버튼이 있습니다. 누르면 축 값이 바뀌고, 그 뒤 입력은 바뀐
 * 성격으로 호출됩니다.
 *
 * 대화 기록은 개체별로 따로 남습니다. 왔다 갔다 해도 앞서 받은 답이
 * 지워지지 않아서, 같은 말에 대한 답을 나란히 비교할 수 있습니다.
 *
 * ── 키에 대하여 ──────────────────────────────────────
 * Expo는 `EXPO_PUBLIC_*` 만 번들에 넣습니다. 그리고 번들에 들어간 값은
 * 앱을 열어보면 보입니다(README의 API 키 섹션 참고).
 *
 * 지금은 `EXPO_PUBLIC_CHAT_BASE_URL` 을 공급자로 직접 두고 있어서 키가
 * 노출되는 B안 형태입니다. 프록시를 두는 A안으로 가면 이 화면 코드는
 * 그대로 두고 `BASE_URL`을 프록시 주소로 바꾸고 키를 비우면 됩니다.
 */

type Fixture = {
  id: string;
  label: string;
  /** 이 표본이 목록에 있는 이유. 화면에 띄워서 스왑 자체가 설명이 되게 합니다. */
  note: string;
  name: string;
  mix: BreedMix;
};

/**
 * 스왑할 표본들.
 *
 * 아무거나 모아두면 "다르게 나오네"까지만 보입니다. 그래서 **애착 × 표현
 * 4분면**을 채우도록 골랐습니다. 이 격자가 채워져야 츤데레(애착↑·표현↓)가
 * 성립한다는 게 프리셋을 그렇게 적은 근거였으니, 스왑이 곧 그 검증입니다.
 *
 * 축 값은 여기 적지 않습니다. `synthesize`가 계산한 실제 값이 헤더에 뜨므로,
 * 여기 베껏 적으면 프리셋을 고칠 때 조용히 어긋납니다.
 */
const FIXTURES: Fixture[] = [
  // 실제로 판정에서 나온 값. 나머지는 만든 값이라 이게 기준점입니다.
  {
    id: 'measured',
    label: '실측 dog1',
    note: '판정이 실제로 뽑은 값 · 도베르만 55 / 그레이하운드 30 / 포인터 15',
    name: '단무',
    mix: [
      { breed: 'doberman', ratio: 55 },
      { breed: 'greyhound', ratio: 30 },
      { breed: 'pointer', ratio: 15 },
    ],
  },

  // ── 4분면. 단일 품종이라 블렌드가 개입하지 않습니다 ──
  {
    id: 'shiba',
    label: '시바',
    note: '애착↓ 표현↓ — 안 붙고 안 티냄',
    name: '콩',
    mix: [{ breed: 'shiba', ratio: 100 }],
  },
  {
    id: 'retriever',
    label: '리트리버',
    note: '애착↑ 표현↑ — 붙고 다 티냄',
    name: '보리',
    mix: [{ breed: 'retriever', ratio: 100 }],
  },
  {
    id: 'dachshund',
    label: '닥스훈트',
    note: '애착↑ 표현↓ — 츤데레. 이 칸이 비면 설계가 실패입니다',
    name: '쿠키',
    mix: [{ breed: 'dachshund', ratio: 100 }],
  },
  {
    id: 'beagle',
    label: '비글',
    note: '애착↓ 표현↑ — 시끄러운데 안 붙음',
    name: '초코',
    mix: [{ breed: 'beagle', ratio: 100 }],
  },

  // 위 넷은 대체로 낙천적입니다. 예민·비관 쪽이 말투를 바꾸는지 따로 봅니다.
  {
    id: 'maltese',
    label: '말티즈',
    note: '예민↑ 낙천↓ — 껌딱지인데 시무룩',
    name: '설기',
    mix: [{ breed: 'maltese', ratio: 100 }],
  },

  // ── 알려진 취약점 ──
  // 정반대 품종이 반반이면 1%p 차이로 기준 품종이 뒤집히고 밴드까지 갈립니다.
  // 고쳐야 할 문제라서가 아니라(MBTI도 경계에서 갈립니다) 눈으로 확인해두려고
  // 둡니다. 둘을 번갈아 눌러보면 입력 1%p 차이가 답을 어디까지 바꾸는지 보입니다.
  {
    id: 'edge-a',
    label: '경계 R51',
    note: '리트리버 51 / 시바 49 — 아래와 1%p 차이',
    name: '가',
    mix: [
      { breed: 'retriever', ratio: 51 },
      { breed: 'shiba', ratio: 49 },
    ],
  },
  {
    id: 'edge-b',
    label: '경계 S51',
    note: '시바 51 / 리트리버 49 — 위와 1%p 차이',
    name: '나',
    mix: [
      { breed: 'shiba', ratio: 51 },
      { breed: 'retriever', ratio: 49 },
    ],
  },
];

// Expo가 번들에 넣으려면 이렇게 통째로 적어야 합니다. 동적 접근은 치환되지 않습니다.
const CHAT_API_KEY = process.env.EXPO_PUBLIC_CHAT_API_KEY;
const CHAT_MODEL = process.env.EXPO_PUBLIC_CHAT_MODEL;
const CHAT_BASE_URL = process.env.EXPO_PUBLIC_CHAT_BASE_URL;

type Message = ChatTurn & { failed?: boolean };

export default function ChatPreviewScreen() {
  const c = useTheme();
  const params = useLocalSearchParams<{ mix?: string; name?: string }>();

  // 넘어온 값이 있으면 목록 맨 앞에 붙습니다. 깨져 있어도 resolveMix가 걸러냅니다.
  const fixtures = useMemo<Fixture[]>(() => {
    const raw = params.mix ? safeParse(params.mix) : null;
    if (!raw) return FIXTURES;
    return [
      {
        id: 'incoming',
        label: '들어온 값',
        note: '라우트 파라미터로 넘어온 판정 결과',
        name: params.name ?? '단무',
        mix: resolveMix(raw),
      },
      ...FIXTURES,
    ];
  }, [params.mix, params.name]);

  const [activeId, setActiveId] = useState(fixtures[0].id);
  // 목록이 바뀌어도(넘어온 값이 붙거나 빠져도) 고른 게 사라지지 않게 방어합니다.
  const index = Math.max(
    0,
    fixtures.findIndex((f) => f.id === activeId),
  );
  const active = fixtures[index];
  const nextFixture = () => setActiveId(fixtures[(index + 1) % fixtures.length].id);

  const card = useMemo(() => synthesize(resolveMix(active.mix)), [active.mix]);

  // 대화는 표본별로 따로 남깁니다. 스왑해도 앞서 받은 답이 지워지지 않아야
  // 같은 질문에 대한 답을 나란히 비교할 수 있습니다.
  const [logs, setLogs] = useState<Record<string, Message[]>>({});
  const messages = logs[active.id] ?? [];

  const [draft, setDraft] = useState('');
  // 어느 표본의 답을 기다리는지. 답이 늦게 와도 그 사이 스왑한 쪽이 아니라
  // 물어본 쪽 기록으로 들어가야 합니다.
  const [pending, setPending] = useState<string | null>(null);
  const sending = pending !== null;
  // 위 `sending`은 화면을 흐리게 만드는 용도입니다. 중복 전송 차단에는 못 씁니다 —
  // state는 다음 렌더에야 바뀌므로, 같은 틱에 두 번 눌리면 둘 다 `false`를 읽고
  // 통과합니다(실제로 그렇게 두 번 보냈습니다). 그래서 차단은 ref로 합니다.
  const busy = useRef(false);
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

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || !client || busy.current) return;
    busy.current = true;

    // 지금 이 표본을 붙잡아 둡니다. 답을 기다리는 동안 스왑해도 여기로 들어갑니다.
    const target = active;
    const append = (m: Message) =>
      setLogs((prev) => ({ ...prev, [target.id]: [...(prev[target.id] ?? []), m] }));

    const history: ChatTurn[] = [
      ...messages.filter((m) => !m.failed).map(({ role, content }) => ({ role, content })),
      { role: 'user', content: text },
    ];

    append({ role: 'user', content: text });
    setDraft('');
    setPending(target.id);

    try {
      const answer = await client.reply({
        model: CHAT_MODEL as string,
        card,
        name: target.name,
        history,
      });
      append({ role: 'assistant', content: answer });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      append({ role: 'assistant', content: reason, failed: true });
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  return (
    <Screen>
      {/* ── 확정된 값. 답이 이상할 때 프롬프트 문제인지 모델 문제인지 여기서 갈립니다 ── */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        {/* 이 버튼이 개체를 바꿉니다. 누르면 축 값이 바뀌고, 그 뒤 입력은 바뀐
            성격으로 호출됩니다. 대화 기록은 개체별로 따로 남습니다. */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: c.text }]}>
            {active.name} — {card.archetype}
          </Text>
          <Pressable
            onPress={nextFixture}
            style={[styles.swapButton, { backgroundColor: c.primary }]}>
            <Text style={[styles.swapButtonText, { color: c.onPrimary }]}>
              다른 개체 {index + 1}/{fixtures.length} →
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.caption, { color: c.textSecondary }]}>
          {BREEDS[dominantBreed(card.mix)].label} 생김새 ·{' '}
          {card.mix.map((m) => `${BREEDS[m.breed].label} ${Math.round(m.ratio)}`).join(' / ')}
        </Text>
        <Text style={[styles.note, { color: c.textSecondary }]}>{active.note}</Text>
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
            {'말을 걸어보세요. 위 버튼으로 개체를 바꾸면\n'}
            같은 말에 다른 답이 옵니다.
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

        {/* 스왑해서 넘어온 화면에는 스피너를 띄우지 않습니다 — 여긴 안 기다리는 중 */}
        {pending === active.id && (
          <ActivityIndicator style={styles.spinner} color={c.textSecondary} />
        )}
      </ScrollView>

      {/* ── 입력 ── */}
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => send(draft)}
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
          onPress={() => send(draft)}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  swapButton: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  swapButtonText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  note: {
    fontSize: FontSize.caption,
    fontStyle: 'italic',
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

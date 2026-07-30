import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

/**
 * 반려동물과 대화하는 화면 (오른쪽 페이지).
 *
 * TODO(장유빈, 임승현): 여기가 대화 담당 화면입니다.
 *   지금은 말풍선 모양만 잡아둔 껍데기입니다. 자유롭게 갈아엎으세요.
 *   - 아래 SAMPLE은 화면 모양 확인용 더미 데이터입니다. 실제로는 상태로 관리하세요.
 *   - 입력창을 붙일 때 KeyboardAvoidingView가 필요합니다 (login.tsx 참고).
 *   - 페르소나(말투)는 품종에 따라 달라져야 하는데, 품종 판정 결과는
 *     홍가연 쪽에서 넘어옵니다. 그때까지는 기본 말투로 두면 됩니다.
 *
 * 주의: `edges={['top']}` 입니다. 아래쪽 안전영역은 탭 레이아웃의 점 인디케이터가
 * 이미 처리하므로 여기서 또 넣으면 여백이 두 번 들어갑니다.
 *
 * 주의: 좌우 스와이프로 화면을 넘기는 구조라, 가로로 스크롤되는 요소를 넣으면
 * 제스처가 서로 잡아먹습니다. 세로 스크롤은 문제없습니다.
 */

type Message = { id: string; from: 'pet' | 'me'; text: string };

const SAMPLE: Message[] = [
  { id: '1', from: 'pet', text: '왔구나! 기다렸어 🐾' },
  { id: '2', from: 'me', text: '오늘 뭐 했어?' },
  { id: '3', from: 'pet', text: '창밖 보면서 너 생각했지. 밥은 먹었어?' },
];

export default function ChatScreen() {
  const c = useTheme();
  const { user } = useAuth();

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}>
          <Text style={styles.avatarFace}>🐶</Text>
        </View>
        <View>
          <Text style={[styles.name, { color: c.text }]}>이름 없는 아이</Text>
          <Text style={[styles.status, { color: c.textSecondary }]}>
            {user?.nickname ?? '친구'}님과 대화 중
          </Text>
        </View>
      </View>

      <View style={styles.thread}>
        {SAMPLE.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.from === 'me'
                ? [styles.mine, { backgroundColor: c.primary }]
                : [styles.theirs, { backgroundColor: c.surface, borderColor: c.border }],
            ]}>
            <Text style={[styles.bubbleText, { color: m.from === 'me' ? c.onPrimary : c.text }]}>
              {m.text}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.composer, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.composerHint, { color: c.textSecondary }]}>
          대화 기능은 준비 중이에요 (담당: 장유빈, 임승현)
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.lg,
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
    gap: Spacing.sm,
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
    minHeight: 54,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerHint: {
    fontSize: FontSize.caption,
  },
});

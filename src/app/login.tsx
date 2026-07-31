import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { usePet } from '@/lib/pet';

const NICKNAME_MIN = 2;
const NICKNAME_MAX = 10;

/**
 * 로그인 화면.
 *
 * 서버가 없어서 "닉네임을 이 기기에 저장한다"가 로그인의 전부입니다.
 * 나중에 실제 인증(카카오/구글 등)을 붙인다면 signIn() 안쪽만 바꾸면 됩니다.
 */
export default function LoginScreen() {
  const c = useTheme();
  const router = useRouter();
  const { signIn } = useAuth();
  const { pet } = usePet();

  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmed = nickname.trim();
  const canSubmit = trimmed.length >= NICKNAME_MIN && trimmed.length <= NICKNAME_MAX;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await signIn(trimmed);
      // 기기에 키우던 친구가 남아 있으면 사진 화면을 건너뜁니다 — index.tsx와 같은 규칙입니다.
      // 여기서 무조건 /photo로 보내면, 키우는 중인데도 사진을 다시 올리게 되고
      // 그렇게 넘긴 품종은 game.tsx가 무시해서 분석 결과가 조용히 사라집니다.
      router.replace(pet ? '/game' : '/photo');
    } catch {
      setError('저장에 실패했어요. 다시 시도해 주세요.');
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.body}>
          <Text style={[styles.title, { color: c.text }]}>어떻게 불러드릴까요?</Text>
          <Text style={[styles.description, { color: c.textSecondary }]}>
            반려동물이 이 이름으로 말을 걸어요.
          </Text>

          <TextInput
            value={nickname}
            onChangeText={(text) => {
              setNickname(text);
              if (error) setError(null);
            }}
            placeholder="닉네임"
            placeholderTextColor={c.textSecondary}
            maxLength={NICKNAME_MAX}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={[
              styles.input,
              {
                backgroundColor: c.surface,
                borderColor: error ? c.danger : c.border,
                color: c.text,
              },
            ]}
          />

          <Text style={[styles.helper, { color: error ? c.danger : c.textSecondary }]}>
            {error ?? `${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`}
          </Text>
        </View>

        <Button
          label="다음"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting}
          style={styles.submit}
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  description: {
    fontSize: FontSize.body,
    marginBottom: Spacing.md,
  },
  input: {
    height: 56,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.label,
  },
  helper: {
    fontSize: FontSize.caption,
    paddingHorizontal: Spacing.xs,
  },
  submit: {
    marginBottom: Spacing.md,
  },
});

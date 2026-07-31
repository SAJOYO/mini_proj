import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { PetCharacter } from '@/components/pet-character';
import { Screen } from '@/components/screen';
import { resolveBreed, resolveStage } from '@/constants/pet';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * 사진 만들기 화면 — **자리만 잡아둔 임시 화면입니다.**
 *
 * TODO(김경빈): 이 파일을 통째로 갈아끼우세요. 지금은 넘어온 값을 화면에
 * 그대로 보여주기만 합니다. 생성 호출도, 결과 저장도 없습니다.
 *
 * 게임 쪽에서 넘어오는 값은 아래 다섯 개입니다(src/app/game.tsx의 goToKeepsake).
 *
 *   breed     품종 키. 한글 이름이 아니라 constants/pet.ts의 키입니다
 *   stage     성장 단계 키. **떠나온** 단계입니다 (지금 단계가 아닙니다)
 *   photoUri  사용자가 올린 원본 사진. 인물이 여기서 나옵니다
 *   prompt    위 둘로 만든 생성용 문장 (src/lib/photo-prompt.ts)
 *   caption   사진에 얹을 한 줄 ("청소년기의 마지막 날")
 *
 * 문장을 다듬고 싶으면 이 화면이 아니라 **src/lib/photo-prompt.ts**를 고치세요.
 * 네 단계가 한 표에 모여 있고, 그림체·조명 같은 공통 부분은 KEEPSAKE_STYLE
 * 한 곳에 있습니다. 여기서 문자열을 이어붙이면 단계마다 그림체가 갈립니다.
 *
 * ⚠️ 외부 API를 부르기 전에 README의 "API 키" 절을 먼저 읽어주세요.
 *    키를 앱에 넣으면 번들에 그대로 노출됩니다. 팀에서 방식을 정하고 시작하세요.
 *
 * ⚠️ 웹에서 photoUri는 blob: URI라 탭을 닫으면 무효가 됩니다(README 참고).
 *    새로고침 뒤에는 원본이 사라져 있을 수 있으니 없을 때를 처리해 주세요.
 */
export default function PhotoGenScreen() {
  const c = useTheme();
  const router = useRouter();

  const params = useLocalSearchParams<{
    breed?: string;
    stage?: string;
    photoUri?: string;
    prompt?: string;
    caption?: string;
  }>();

  // 링크로 들어온 문자열이라 그대로 믿지 않고 아는 값인지 확인합니다.
  const breed = resolveBreed(params.breed);
  const stage = resolveStage(params.stage);
  const photoUri = typeof params.photoUri === 'string' && params.photoUri ? params.photoUri : null;

  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>사진 만들기</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        아직 생성 기능이 붙지 않은 자리입니다. 넘어온 값만 보여줍니다.
      </Text>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>받은 재료</Text>

          <View style={styles.materials}>
            <View style={styles.material}>
              <PetCharacter breed={breed} stage={stage} animation="breathe" size={92} />
              <Text style={[styles.materialLabel, { color: c.textSecondary }]}>
                {breed} · {stage}
              </Text>
            </View>

            <View style={styles.material}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photo, styles.photoEmpty, { borderColor: c.border }]}>
                  <Text style={{ color: c.textSecondary, fontSize: FontSize.caption }}>
                    사진 없음
                  </Text>
                </View>
              )}
              <Text style={[styles.materialLabel, { color: c.textSecondary }]}>올린 사진</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>caption</Text>
          <Text style={[styles.value, { color: c.text }]}>{params.caption ?? '(없음)'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.textSecondary }]}>prompt</Text>
          <Text style={[styles.value, { color: c.text }]}>{params.prompt ?? '(없음)'}</Text>
        </View>
      </ScrollView>

      <Button label="돌아가기" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.title,
    fontWeight: '800',
  },
  note: {
    fontSize: FontSize.caption,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  body: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardTitle: {
    fontSize: FontSize.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  materials: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  material: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  materialLabel: {
    fontSize: FontSize.caption,
  },
  photo: {
    width: 92,
    height: 92,
    borderRadius: Radius.sm,
  },
  photoEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: FontSize.caption,
    lineHeight: 20,
  },
});

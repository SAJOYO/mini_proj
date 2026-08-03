import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  listPhotos,
  photoUri,
  removePhoto,
  revokePhotoUri,
  SAVE_DENIED_MESSAGE,
  SAVE_SUCCESS_MESSAGE,
  savePhotoToDevice,
  type PhotoEntry,
} from '@/lib/album';
import { confirmAction, notify } from '@/lib/dialog';
import { STAGES, stageOf } from '@/lib/game';
import { usePet } from '@/lib/pet';
import { isRunning, usePhotoJob } from '@/lib/photo-job';

/**
 * 앨범 — 지금까지 만든 사진을 성장 단계별로 모아 봅니다.
 *
 * ## 네 장짜리가 아닙니다
 *
 * 단계마다 한 장씩 채우는 스탬프판처럼 보이지만, 실제로는 **한 단계에 몇
 * 장이든** 들어갑니다. 마음에 들 때까지 다시 만들 수 있고 그 과정이 전부
 * 남습니다. 아직 사진이 없는 단계는 빈 칸으로 남겨둬서, 다음 단계에서도
 * 찍어보고 싶게 만듭니다.
 *
 * ## 이미지는 필요할 때만 읽습니다
 *
 * 목록(누가·언제)은 AsyncStorage에 있어서 가볍지만 이미지는 한 장에 1MB가
 * 넘습니다. 그래서 화면에 들어올 때 목록만 먼저 읽고, 이미지는 그 뒤에
 * 한 장씩 채웁니다. 사진이 늘어나도 화면이 늦게 뜨지 않습니다.
 */

/** 화면에 살아 있는 blob: URL. 언마운트할 때 한꺼번에 정리합니다. */
type Loaded = Record<string, string>;

/**
 * 사진을 받은 날. "2026. 8. 3." 처럼 씁니다.
 *
 * toLocaleDateString 을 쓰지 않는 건 기기마다 결과가 다르기 때문입니다 —
 * 안드로이드 런타임은 Intl 데이터를 다 들고 있지 않아서, 같은 코드가 폰에서는
 * 영어로 나오기도 합니다. 앨범에 날짜가 섞여 보이는 것보다는 직접 맞추는
 * 편이 낫습니다.
 */
function shotDate(createdAt: number): string {
  const at = new Date(createdAt);
  return `${at.getFullYear()}. ${at.getMonth() + 1}. ${at.getDate()}.`;
}

export default function AlbumScreen() {
  const c = useTheme();
  const router = useRouter();
  const { pet } = usePet();
  const photoBusy = isRunning(usePhotoJob());

  const [entries, setEntries] = useState<PhotoEntry[] | null>(null);
  const [urls, setUrls] = useState<Loaded>({});
  /** 크게 보고 있는 사진. null 이면 목록만 보이는 상태입니다. */
  const [viewing, setViewing] = useState<PhotoEntry | null>(null);

  /** 내려받는 중. 연타로 갤러리에 같은 사진이 여러 장 들어가는 것을 막습니다. */
  const [saving, setSaving] = useState(false);

  /**
   * 웹에서 만든 blob: 주소는 명시적으로 지워야 사라집니다. 사진이 쌓일수록
   * 커지는 값이라 화면을 떠날 때 반드시 정리합니다.
   * (폰의 file: 경로는 지울 것이 없습니다 — revokePhotoUri 가 알아서 거릅니다)
   */
  const created = useRef<string[]>([]);
  useEffect(() => {
    const urlList = created.current;
    return () => urlList.forEach(revokePhotoUri);
  }, []);

  useEffect(() => {
    let alive = true;

    listPhotos().then(async (list) => {
      if (!alive) return;
      setEntries(list);

      // 목록을 먼저 그려두고 이미지를 한 장씩 채웁니다.
      for (const entry of list) {
        const uri = await photoUri(entry.id);
        if (!alive) return;
        if (!uri) continue;

        created.current.push(uri);
        setUrls((prev) => ({ ...prev, [entry.id]: uri }));
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  /**
   * 사진을 기기에 내려받습니다.
   *
   * 결과를 반드시 말해줍니다. 폰에서는 갤러리로 들어가서 화면상 아무 변화가
   * 없는데, 아무 말이 없으면 눌린 건지조차 알 수 없습니다.
   */
  async function handleSave(entry: PhotoEntry) {
    setSaving(true);
    try {
      const result = await savePhotoToDevice(entry);
      if (result === 'saved') notify('사진을 내려받았어요', SAVE_SUCCESS_MESSAGE);
      else if (result === 'denied') notify('저장 권한이 필요해요', SAVE_DENIED_MESSAGE);
      else notify('사진을 내려받지 못했어요', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(entry: PhotoEntry) {
    const ok = await confirmAction({
      title: '이 사진을 지울까요?',
      message: '앨범에서 사라집니다. 되돌릴 수 없어요.',
      confirmLabel: '지우기',
      destructive: true,
    });
    if (!ok) return;

    await removePhoto(entry.id);
    setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? null);
    // 지운 사진을 계속 크게 띄워둘 수는 없습니다.
    setViewing((current) => (current?.id === entry.id ? null : current));
  }

  function goBack() {
    // 새로고침 뒤에는 돌아갈 이력이 없습니다 (photo-gen.tsx의 goBack 참고).
    if (router.canGoBack()) router.back();
    else router.replace('/game');
  }

  const total = entries?.length ?? 0;

  return (
    <Screen>
      <Text style={[styles.title, { color: c.text }]}>앨범</Text>
      <Text style={[styles.note, { color: c.textSecondary }]}>
        {total > 0 ? `지금까지 ${total}장을 남겼어요.` : '아직 남긴 사진이 없어요.'}
      </Text>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {STAGES.map((stage) => {
          const shots = entries?.filter((entry) => entry.stage === stage.id) ?? [];

          return (
            <View key={stage.id} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>{stage.label}</Text>
                {shots.length > 0 ? (
                  <Text style={[styles.count, { color: c.textSecondary }]}>{shots.length}장</Text>
                ) : null}
              </View>

              {shots.length === 0 ? (
                // 빈 칸을 숨기지 않습니다. 아직 안 찍은 단계가 보여야
                // 다음 단계에서도 남겨볼 마음이 생깁니다.
                <View
                  style={[styles.empty, { borderColor: c.border, backgroundColor: c.surfaceAlt }]}>
                  <Text style={styles.emptyIcon}>🖼️</Text>
                  <Text style={[styles.emptyText, { color: c.textSecondary }]}>
                    이 시절의 사진이 아직 없어요
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.row}>
                    {shots.map((entry) => (
                      <View key={entry.id} style={styles.shot}>
                        {/*
                          눌러서 크게 봅니다. 내려받기·삭제도 그 화면에 있습니다 —
                          여기 작은 글씨로 나란히 두었더니 사진을 보려다 삭제를
                          누르기 쉬웠습니다. 되돌릴 수 없는 일은 한 걸음 안쪽에.
                        */}
                        <Pressable
                          onPress={() => setViewing(entry)}
                          accessibilityRole="button"
                          accessibilityLabel={`${shotDate(entry.createdAt)} 사진 크게 보기`}
                          style={[
                            styles.frame,
                            { borderColor: c.border, backgroundColor: c.surfaceAlt },
                          ]}>
                          {urls[entry.id] ? (
                            <Image
                              source={{ uri: urls[entry.id] }}
                              style={styles.image}
                              contentFit="cover"
                            />
                          ) : null}
                        </Pressable>

                        {/*
                          찍은 날을 적습니다. 예전에는 "영유아기의 마지막 날"
                          같은 문구였는데, 어느 단계인지는 위 소제목이 이미
                          말해주고 있어서 같은 말을 두 번 하는 셈이었습니다.
                          앨범에서 궁금한 건 "언제 찍었나" 쪽입니다.
                        */}
                        <Text
                          style={[styles.caption, { color: c.textSecondary }]}
                          numberOfLines={1}>
                          {shotDate(entry.createdAt)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        {/*
          사진을 만드는 입구. 예전에는 게임 화면 헤더에 따로 있었는데, 만든
          사진이 쌓이는 곳이 여기라 입구도 여기로 옮겼습니다.

          **지금 단계**로 만듭니다. 성장 직후에 뜨는 배너는 방금 떠나온 단계로
          만드는데(그 모습은 다시 못 봅니다), 여기서는 그럴 이유가 없습니다.

          캐릭터를 아직 안 만들었으면 만들 대상이 없어서 버튼을 감춥니다.
        */}
        {pet ? (
          <Button
            // 만드는 중에도 **눌립니다.** 사진 찍기 화면이 진행 상황을 보여주는
            // 유일한 곳이라, 여기서 막으면 얼마나 남았는지 볼 방법이 없어집니다.
            // (전에 disabled 를 걸었다가 실제로 갇혔습니다)
            //
            // 중복으로 시작될 걱정은 없습니다 — 진행 중이면 저쪽 화면의 실행
            // 버튼이 잠깁니다. 막는 자리는 한 곳이면 충분합니다.
            label={photoBusy ? '사진 만드는 중...' : '사진 찍기'}
            variant={photoBusy ? 'secondary' : undefined}
            onPress={() =>
              router.push({ pathname: '/photo-gen', params: { stage: stageOf(pet).id } })
            }
          />
        ) : null}
        <Button label="돌아가기" variant="secondary" onPress={goBack} />
      </View>

      {/*
        크게 보기.

        Modal 을 쓰는 건 화면 전환이 아니라 **잠깐 덮는 것**이기 때문입니다.
        새 화면으로 밀어 넣으면 뒤로 가기 이력이 쌓이고, 사진 한 장 보고
        닫는 동작치고는 무겁습니다.

        내려받기·삭제가 여기 있는 것도 일부러입니다. 목록의 작은 글씨로 두면
        사진을 보려다 삭제를 누르기 쉽습니다 — 되돌릴 수 없는 일은 한 걸음
        안쪽에 두고, 그 걸음이 "크게 보기"라 자연스럽습니다.
      */}
      <Modal
        visible={viewing !== null}
        transparent
        animationType="fade"
        // 안드로이드 뒤로 가기로도 닫힙니다.
        onRequestClose={() => setViewing(null)}>
        <View style={styles.viewerBackdrop}>
          {/* 사진 바깥 아무 데나 누르면 닫힙니다. */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setViewing(null)}
            accessibilityRole="button"
            accessibilityLabel="크게 보기 닫기"
          />

          {viewing ? (
            <View style={styles.viewerBody} pointerEvents="box-none">
              <Image
                source={{ uri: urls[viewing.id] }}
                style={styles.viewerImage}
                // contain 입니다 — 사진 전체가 보여야 합니다. 잘라내면 크게
                // 보려고 연 의미가 없습니다.
                contentFit="contain"
              />
              <Text style={styles.viewerCaption}>{shotDate(viewing.createdAt)}</Text>

              {/*
                버튼마다 **자기 배경**을 깔아줍니다.

                secondary 는 배경 없이 테두리와 글자만 그리고 그 색이 테마에서
                옵니다. 어두운 오버레이 위에 그냥 두면 밝은 테마(웹)에서 검은
                글자가 검은 배경에 묻혀 안 보입니다. 폰은 어두운 테마라 우연히
                보였을 뿐입니다.

                배경색도 테마에서 오므로 밝은 테마든 어두운 테마든 글자가 제
                배경 위에 놓입니다. 버튼을 판으로 묶지 않은 건, 셋이 하나의
                덩어리처럼 보이면 "닫기"까지 같은 무게로 읽히기 때문입니다.
              */}
              <View style={styles.viewerActions}>
                <Button
                  label={saving ? '내려받는 중...' : '내려받기'}
                  variant="secondary"
                  style={{ backgroundColor: c.surface }}
                  onPress={() => void handleSave(viewing)}
                  disabled={saving}
                />
                <Button
                  label="삭제"
                  variant="secondary"
                  style={{ backgroundColor: c.surface }}
                  onPress={() => void handleRemove(viewing)}
                  disabled={saving}
                />
                <Button label="닫기" onPress={() => setViewing(null)} />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
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
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  count: {
    fontSize: FontSize.caption,
  },
  empty: {
    height: 96,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  emptyIcon: {
    fontSize: 22,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: FontSize.caption,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shot: {
    width: 148,
    gap: Spacing.xs,
  },
  frame: {
    width: 148,
    height: 148,
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  caption: {
    fontSize: FontSize.caption,
  },
  viewerBackdrop: {
    flex: 1,
    // 뒤를 어둡게 깔아야 사진이 도드라집니다. 테마 색을 안 쓰는 건 밝은
    // 테마에서도 사진 뒤는 어두워야 하기 때문입니다.
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  viewerBody: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: Spacing.md,
  },
  viewerImage: {
    width: '100%',
    // 정사각형으로 만든 사진이라 칸도 정사각형입니다.
    aspectRatio: 1,
    borderRadius: Radius.md,
  },
  viewerCaption: {
    // 어두운 배경 위라 테마 색 대신 흰색입니다.
    color: '#FFFFFF',
    fontSize: FontSize.caption,
  },
  viewerActions: {
    width: '100%',
    gap: Spacing.sm,
  },
  actions: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});

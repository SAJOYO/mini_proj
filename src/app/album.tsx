import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  canDownload,
  downloadBlob,
  listPhotos,
  loadPhoto,
  photoUri,
  removePhoto,
  revokePhotoUri,
  type PhotoEntry,
} from '@/lib/album';
import { confirmAction } from '@/lib/dialog';
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
  /**
   * 내려받기에 필요해서 들고 있습니다. URL만으로는 파일을 만들 수 없습니다.
   * (ref가 아니라 state인 이유 — 버튼을 언제 눌릴 수 있게 할지가 이 값에
   * 달려 있어서, 값이 채워지면 화면이 다시 그려져야 합니다)
   */
  const [blobs, setBlobs] = useState<Record<string, Blob>>({});

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

        // 내려받기 버튼이 있는 환경(웹)에서만 바이트까지 들고 있습니다.
        // 폰에서는 쓰지도 않을 사진을 통째로 메모리에 올릴 이유가 없습니다.
        if (canDownload()) {
          const blob = await loadPhoto(entry.id);
          if (!alive) return;
          if (blob) setBlobs((prev) => ({ ...prev, [entry.id]: blob }));
        }
      }
    });

    return () => {
      alive = false;
    };
  }, []);

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
                        <View
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
                        </View>

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

                        <View style={styles.shotActions}>
                          {canDownload() ? (
                            <Pressable
                              onPress={() => {
                                const blob = blobs[entry.id];
                                if (blob) {
                                  downloadBlob(blob, `${entry.breed}-${entry.stage}.png`);
                                }
                              }}
                              disabled={!blobs[entry.id]}
                              hitSlop={6}>
                              <Text style={[styles.shotAction, { color: c.textSecondary }]}>
                                내려받기
                              </Text>
                            </Pressable>
                          ) : null}
                          <Pressable onPress={() => void handleRemove(entry)} hitSlop={6}>
                            <Text style={[styles.shotAction, { color: c.textSecondary }]}>
                              삭제
                            </Text>
                          </Pressable>
                        </View>
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
  shotActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  shotAction: {
    fontSize: FontSize.caption,
    textDecorationLine: 'underline',
  },
  actions: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
});

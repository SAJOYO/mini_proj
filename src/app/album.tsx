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
  removePhoto,
  type PhotoEntry,
} from '@/lib/album';
import { confirmAction } from '@/lib/dialog';
import { STAGES } from '@/lib/game';

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

export default function AlbumScreen() {
  const c = useTheme();
  const router = useRouter();

  const [entries, setEntries] = useState<PhotoEntry[] | null>(null);
  const [urls, setUrls] = useState<Loaded>({});
  /**
   * 내려받기에 필요해서 들고 있습니다. URL만으로는 파일을 만들 수 없습니다.
   * (ref가 아니라 state인 이유 — 버튼을 언제 눌릴 수 있게 할지가 이 값에
   * 달려 있어서, 값이 채워지면 화면이 다시 그려져야 합니다)
   */
  const [blobs, setBlobs] = useState<Record<string, Blob>>({});

  /**
   * createObjectURL로 만든 주소는 명시적으로 지워야 사라집니다.
   * 사진이 쌓일수록 커지는 값이라 화면을 떠날 때 반드시 정리합니다.
   */
  const created = useRef<string[]>([]);
  useEffect(() => {
    const urlList = created.current;
    return () => urlList.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    let alive = true;

    listPhotos().then(async (list) => {
      if (!alive) return;
      setEntries(list);

      // 목록을 먼저 그려두고 이미지를 한 장씩 채웁니다.
      for (const entry of list) {
        const blob = await loadPhoto(entry.id);
        if (!alive) return;
        if (!blob) continue;

        const url = URL.createObjectURL(blob);
        created.current.push(url);
        setBlobs((prev) => ({ ...prev, [entry.id]: blob }));
        setUrls((prev) => ({ ...prev, [entry.id]: url }));
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

                        <Text
                          style={[styles.caption, { color: c.textSecondary }]}
                          numberOfLines={1}>
                          {entry.caption || stage.label}
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
    paddingBottom: Spacing.md,
  },
});

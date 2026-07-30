import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop, Svg } from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * 캐릭터 뒤에 깔리는 배경(씬).
 *
 * 품종·생애단계·애니메이션과 마찬가지로 캐릭터와 분리된 레이어입니다.
 * "무슨 동물이냐"에 따라 사는 공간이 다르므로, 배경도 전역 고정이 아니라
 * 매칭된 동물에 맞춰 갈아끼웁니다.
 *   - room    포유류(강아지·고양이…) → 방
 *   - neutral 애매하거나 아직 전용 씬이 없는 경우 → 톤 있는 뉴트럴 (완전 백색 아님)
 *
 * 서식지를 중첩하지 않는 게 핵심입니다. 금붕어라고 "방 안에 어항"을 두는 게
 * 아니라 화면 전체를 물속으로 바꿉니다. 그래서 "방에 덩그러니 어항", "어항 속
 * 오징어" 같은 어색함이 애초에 생기지 않습니다.
 *
 * 여기에는 강아지 리그에 실제로 필요한 방·뉴트럴 둘만 둡니다.
 * 물속·초원·숲·사막·하늘·극지 같은 확장 서식지는 `claude/scene-habitats-by-biome`
 * 브랜치가 담당합니다. 닮은 동물 검색이 강아지 밖으로 넓어질 때 합칩니다.
 */

export const SCENE_KINDS = ['room', 'neutral'] as const;
export type SceneKind = (typeof SCENE_KINDS)[number];

/** 아직 전용 씬을 못 정했을 때 쓸 기본 씬. */
export const DEFAULT_SCENE: SceneKind = 'neutral';

/**
 * 현재는 리그가 강아지 전용이라 모든 품종이 방(room)입니다.
 *
 * 나중에 닮은 동물 검색이 강아지 밖(물고기·새 등)까지 내놓으면,
 * 그 동물 카테고리를 받아 여기서 씬을 갈라주면 됩니다.
 * (지금은 배경 레이어를 분리해 두는 뼈대만 세워 둡니다.)
 */
export function sceneForBreed(_breed: string): SceneKind {
  return 'room';
}

export type SceneProps = {
  /** 배경 종류. 없으면 뉴트럴. */
  kind?: SceneKind;
  /** 씬 위에 얹을 캐릭터 등. 가운데 정렬됩니다. */
  children?: ReactNode;
  style?: ViewStyle;
};

/**
 * 씬 하나.
 *
 * 컨테이너 크기를 재서(onLayout) 그 픽셀 좌표계로 배경을 그립니다.
 * 덕분에 어떤 비율의 영역에 넣어도 바닥선·창문 위치가 틀어지지 않습니다.
 * 배경 SVG는 절대 위치로 꽉 채우고, children은 그 위 정중앙에 놓입니다.
 */
export function Scene({ kind = DEFAULT_SCENE, children, style }: SceneProps) {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const [size, setSize] = useState({ w: 0, h: 0 });

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    if (width !== size.w || height !== size.h) setSize({ w: width, h: height });
  }

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {size.w > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={size.w} height={size.h}>
          <Backdrop kind={kind} w={size.w} h={size.h} dark={dark} />
        </Svg>
      )}
      <View style={styles.content} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * 씬별 그림
 * ------------------------------------------------------------------ */

type BackdropProps = { kind: SceneKind; w: number; h: number; dark: boolean };

function Backdrop({ kind, w, h, dark }: BackdropProps) {
  if (kind === 'room') return <RoomScene w={w} h={h} dark={dark} />;
  return <NeutralScene w={w} h={h} dark={dark} />;
}

/** 방 — 벽 + 바닥 + 러그 + 창문. 잡동사니 없이 분위기만. */
function RoomScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const c = dark
    ? {
        wall: '#241C17',
        floor: '#171210',
        edge: '#0F0B0A',
        rug: '#2E241C',
        glass: '#33454E',
        frame: '#3B3028',
        plant: '#2C5A44',
        pot: '#5A3B2A',
      }
    : {
        wall: '#FCEBDC',
        floor: '#E8CDB4',
        edge: '#D8B392',
        rug: '#F6DEC4',
        glass: '#CFE6F2',
        frame: '#F7EEE4',
        plant: '#7FBE95',
        pot: '#C98A5B',
      };
  const floorY = h * 0.66;
  const fw = Math.max(3, w * 0.018); // 창틀 두께
  const winX = w * 0.12;
  const winY = h * 0.13;
  const winW = w * 0.24;
  const winH = h * 0.26;

  return (
    <G>
      {/* 벽 / 바닥 */}
      <Rect x={0} y={0} width={w} height={h} fill={c.wall} />
      <Rect x={0} y={floorY} width={w} height={h - floorY} fill={c.floor} />
      <Line x1={0} y1={floorY} x2={w} y2={floorY} stroke={c.edge} strokeWidth={2} />

      {/* 창문 — 유리 + 십자 창틀 */}
      <Rect x={winX} y={winY} width={winW} height={winH} rx={6} fill={c.glass} />
      <Rect
        x={winX}
        y={winY}
        width={winW}
        height={winH}
        rx={6}
        fill="none"
        stroke={c.frame}
        strokeWidth={fw}
      />
      <Line
        x1={winX + winW / 2}
        y1={winY}
        x2={winX + winW / 2}
        y2={winY + winH}
        stroke={c.frame}
        strokeWidth={fw}
      />
      <Line
        x1={winX}
        y1={winY + winH / 2}
        x2={winX + winW}
        y2={winY + winH / 2}
        stroke={c.frame}
        strokeWidth={fw}
      />

      {/* 러그 — 캐릭터가 올라선 자리 */}
      <Ellipse cx={w / 2} cy={h * 0.86} rx={w * 0.34} ry={h * 0.07} fill={c.rug} />

      {/* 화분 하나 */}
      <G>
        <Ellipse cx={w * 0.85} cy={floorY - h * 0.11} rx={w * 0.07} ry={h * 0.08} fill={c.plant} />
        <Path
          d={`M ${w * 0.81} ${floorY - h * 0.04} L ${w * 0.89} ${floorY - h * 0.04} L ${w * 0.875} ${floorY} L ${w * 0.825} ${floorY} Z`}
          fill={c.pot}
        />
      </G>
    </G>
  );
}

/** 뉴트럴 — 완전 백색이 아니라 살짝 톤 있는 세로 그라데이션 + 캐릭터 뒤 은은한 스포트라이트. */
function NeutralScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const gid = `neutral-${useId()}`;
  const c = dark
    ? { top: '#231C18', bottom: '#191410', glow: '#33291F' }
    : { top: '#FCF3EA', bottom: '#F0E0D0', glow: '#FFFFFF' };
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      {/* 캐릭터 뒤를 살짝 밝혀 시선을 모읍니다 */}
      <Ellipse
        cx={w / 2}
        cy={h * 0.55}
        rx={w * 0.4}
        ry={h * 0.32}
        fill={c.glow}
        opacity={dark ? 0.16 : 0.5}
      />
    </G>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

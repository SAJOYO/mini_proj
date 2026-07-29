import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
} from 'react-native-svg';

import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * 캐릭터 뒤에 깔리는 배경(씬).
 *
 * 품종·생애단계·애니메이션과 마찬가지로 캐릭터와 분리된 레이어입니다.
 * "무슨 동물이냐"에 따라 사는 공간이 다르므로, 배경도 전역 고정이 아니라
 * 매칭된 동물에 맞춰 갈아끼웁니다.
 *   - room    포유류(강아지·고양이…) → 방
 *   - water   수중 동물(금붕어·오징어…) → 물속 (어항이 아니라 화면 전체가 물속)
 *   - neutral 애매하거나 아직 전용 씬이 없는 경우 → 톤 있는 뉴트럴 (완전 백색 아님)
 *
 * 서식지를 중첩하지 않는 게 핵심입니다. 금붕어라고 "방 안에 어항"을 두는 게
 * 아니라 화면 전체를 물속으로 바꿉니다. 그래서 "방에 덩그러니 어항", "어항 속
 * 오징어" 같은 어색함이 애초에 생기지 않습니다.
 */

export const SCENE_KINDS = [
  'room', // 방 — 반려 포유류 (강아지·고양이·토끼·햄스터)
  'savanna', // 초원 — 야생 대형 포유류 (사자·기린·코끼리)
  'forest', // 숲 — 숲/산 포유류 (사슴·곰·여우·다람쥐)
  'desert', // 사막 — 건조지 동물 (낙타·사막여우)
  'sky', // 하늘 — 조류 (참새·앵무새·비둘기)
  'water', // 물속 — 수중 동물 (물고기 등)
  'polar', // 극지 — 바다에 빙하 (펭귄·북극곰·북극여우)
  'neutral', // 뉴트럴 — 애매하거나 전용 씬이 없을 때의 fallback
] as const;
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
  switch (kind) {
    case 'room':
      return <RoomScene w={w} h={h} dark={dark} />;
    case 'savanna':
      return <SavannaScene w={w} h={h} dark={dark} />;
    case 'forest':
      return <ForestScene w={w} h={h} dark={dark} />;
    case 'desert':
      return <DesertScene w={w} h={h} dark={dark} />;
    case 'sky':
      return <SkyScene w={w} h={h} dark={dark} />;
    case 'water':
      return <WaterScene w={w} h={h} dark={dark} />;
    case 'polar':
      return <PolarScene w={w} h={h} dark={dark} />;
    default:
      return <NeutralScene w={w} h={h} dark={dark} />;
  }
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

/** 물속 — 위는 밝고 아래로 깊어지는 그라데이션 + 기포 + 해초. 어항이 아니라 탁 트인 물속. */
function WaterScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  // 그라데이션 id는 인스턴스마다 유일해야 합니다. 웹에서는 모든 SVG가 한 문서를
  // 공유해서, id가 겹치면 먼저 정의된 그라데이션이 덮어써집니다.
  const gid = `water-${useId()}`;
  const c = dark
    ? { top: '#173A4A', bottom: '#081722', bubble: '#BFE0EE', weed: '#1E5A48' }
    : { top: '#C4E8F4', bottom: '#2E86B8', bubble: '#FFFFFF', weed: '#2E8B6F' };
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />

      {/* 수면 근처 빛 무리 */}
      <Ellipse
        cx={w * 0.3}
        cy={h * 0.08}
        rx={w * 0.3}
        ry={h * 0.05}
        fill={c.bubble}
        opacity={0.12}
      />
      <Ellipse
        cx={w * 0.75}
        cy={h * 0.12}
        rx={w * 0.22}
        ry={h * 0.04}
        fill={c.bubble}
        opacity={0.1}
      />

      {/* 기포 */}
      <Circle cx={w * 0.2} cy={h * 0.55} r={w * 0.02} fill={c.bubble} opacity={0.5} />
      <Circle cx={w * 0.26} cy={h * 0.4} r={w * 0.013} fill={c.bubble} opacity={0.45} />
      <Circle cx={w * 0.82} cy={h * 0.5} r={w * 0.017} fill={c.bubble} opacity={0.5} />
      <Circle cx={w * 0.88} cy={h * 0.34} r={w * 0.011} fill={c.bubble} opacity={0.4} />

      {/* 해초 — 바닥에서 올라오는 물결 */}
      <Path
        d={`M ${w * 0.12} ${h} Q ${w * 0.05} ${h * 0.78} ${w * 0.14} ${h * 0.62} Q ${w * 0.2} ${h * 0.78} ${w * 0.16} ${h}`}
        fill={c.weed}
        opacity={0.75}
      />
      <Path
        d={`M ${w * 0.88} ${h} Q ${w * 0.96} ${h * 0.8} ${w * 0.86} ${h * 0.66} Q ${w * 0.8} ${h * 0.82} ${w * 0.84} ${h}`}
        fill={c.weed}
        opacity={0.75}
      />
    </G>
  );
}

/** 초원(세렝게티) — 하늘 + 금빛 초지 + 아카시아 한 그루 + 해. 단순하게 분위기만. */
function SavannaScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const gid = `savanna-${useId()}`;
  const c = dark
    ? { skyTop: '#3B2A44', skyBot: '#7A4A3A', ground: '#4A3A22', sun: '#C97A4A', tree: '#1E160F' }
    : { skyTop: '#BFE3EF', skyBot: '#F3DDA6', ground: '#D9B36A', sun: '#F6C35A', tree: '#7A5A34' };
  const gy = h * 0.7;
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.skyTop} />
          <Stop offset="1" stopColor={c.skyBot} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      <Circle cx={w * 0.74} cy={h * 0.26} r={w * 0.09} fill={c.sun} opacity={0.9} />
      <Rect x={0} y={gy} width={w} height={h - gy} fill={c.ground} />
      {/* 아카시아 — 가는 줄기 + 납작한 우산형 수관 */}
      <Rect x={w * 0.2 - 3} y={gy - h * 0.22} width={6} height={h * 0.22} fill={c.tree} />
      <Ellipse cx={w * 0.2} cy={gy - h * 0.24} rx={w * 0.16} ry={h * 0.05} fill={c.tree} />
    </G>
  );
}

/** 숲 — 초록 그라데이션 + 나무 줄기 몇 개 + 바닥. 사슴·곰·여우 같은 숲 동물용. */
function ForestScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const gid = `forest-${useId()}`;
  const c = dark
    ? { top: '#1B3320', bot: '#0C160F', trunk: '#2A1E14', ground: '#14100A', canopy: '#22301C' }
    : { top: '#CDE9C0', bot: '#8FB57A', trunk: '#7A5636', ground: '#6E5236', canopy: '#8CC178' };
  const gy = h * 0.78;
  const trunk = (x: number, ww: number) => (
    <Rect key={x} x={x} y={h * 0.2} width={ww} height={gy - h * 0.2} fill={c.trunk} opacity={0.9} />
  );
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bot} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      {/* 위쪽 나뭇잎 덩어리 */}
      <Ellipse
        cx={w * 0.25}
        cy={h * 0.12}
        rx={w * 0.3}
        ry={h * 0.12}
        fill={c.canopy}
        opacity={0.7}
      />
      <Ellipse
        cx={w * 0.8}
        cy={h * 0.1}
        rx={w * 0.28}
        ry={h * 0.11}
        fill={c.canopy}
        opacity={0.7}
      />
      {trunk(w * 0.14, w * 0.05)}
      {trunk(w * 0.82, w * 0.06)}
      <Rect x={0} y={gy} width={w} height={h - gy} fill={c.ground} />
    </G>
  );
}

/** 사막 — 모래언덕 + 피라미드 + 해. 낙타·사막여우 같은 건조지 동물용. */
function DesertScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const gid = `desert-${useId()}`;
  const c = dark
    ? {
        skyTop: '#232145',
        skyBot: '#4A3A57',
        sand: '#5A4A34',
        dune: '#4A3B28',
        pyramid: '#3A2E20',
        sun: '#D8D2E0',
      }
    : {
        skyTop: '#F3E1B5',
        skyBot: '#F7D89A',
        sand: '#E4C48A',
        dune: '#D6B074',
        pyramid: '#C99A5E',
        sun: '#FBE7B0',
      };
  const hz = h * 0.62;
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.skyTop} />
          <Stop offset="1" stopColor={c.skyBot} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      <Circle cx={w * 0.75} cy={h * 0.24} r={w * 0.08} fill={c.sun} opacity={0.95} />
      {/* 피라미드 */}
      <Path
        d={`M ${w * 0.2} ${hz} L ${w * 0.36} ${hz - h * 0.26} L ${w * 0.52} ${hz} Z`}
        fill={c.pyramid}
      />
      {/* 모래 지평선 + 앞쪽 언덕 */}
      <Rect x={0} y={hz} width={w} height={h - hz} fill={c.sand} />
      <Ellipse cx={w * 0.7} cy={h} rx={w * 0.6} ry={h * 0.22} fill={c.dune} />
    </G>
  );
}

/** 하늘 — 하늘색 그라데이션 + 구름 + 앞쪽에 잎 달린 나뭇가지(횃대). 조류용. */
function SkyScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const gid = `sky-${useId()}`;
  const c = dark
    ? {
        top: '#0E1730',
        bot: '#243458',
        cloud: '#3A4A6A',
        branch: '#2A1E14',
        leaf: '#22402A',
        orb: '#E8ECF5',
      }
    : {
        top: '#8FC6EE',
        bot: '#DCEFFB',
        cloud: '#FFFFFF',
        branch: '#7A5636',
        leaf: '#7FBF74',
        orb: '#FCEFA0',
      };
  const by = h * 0.72;
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bot} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      {/* 해 또는 달 */}
      <Circle cx={w * 0.78} cy={h * 0.2} r={w * 0.07} fill={c.orb} opacity={0.9} />
      {/* 구름 */}
      <Ellipse
        cx={w * 0.28}
        cy={h * 0.3}
        rx={w * 0.16}
        ry={h * 0.055}
        fill={c.cloud}
        opacity={0.85}
      />
      <Ellipse
        cx={w * 0.4}
        cy={h * 0.28}
        rx={w * 0.1}
        ry={h * 0.045}
        fill={c.cloud}
        opacity={0.85}
      />
      {/* 잎 달린 나뭇가지 — 캐릭터가 앉는 횃대 */}
      <Rect x={0} y={by} width={w} height={Math.max(6, h * 0.028)} rx={4} fill={c.branch} />
      <Ellipse cx={w * 0.16} cy={by - h * 0.02} rx={w * 0.05} ry={h * 0.03} fill={c.leaf} />
      <Ellipse cx={w * 0.84} cy={by - h * 0.02} rx={w * 0.055} ry={h * 0.032} fill={c.leaf} />
      <Ellipse cx={w * 0.72} cy={by - h * 0.015} rx={w * 0.04} ry={h * 0.025} fill={c.leaf} />
    </G>
  );
}

/** 극지 — 차가운 하늘색 바다에 빙하가 떠 있는 배경. 펭귄·북극곰·북극여우용. */
function PolarScene({ w, h, dark }: { w: number; h: number; dark: boolean }) {
  const gid = `polar-${useId()}`;
  const c = dark
    ? { sky: '#1A2A38', seaTop: '#173A4A', seaBot: '#0A1E29', ice: '#AEC8D4', iceShade: '#7C97A6' }
    : { sky: '#DCEFF5', seaTop: '#AFD3E4', seaBot: '#5E93AE', ice: '#F1FAFD', iceShade: '#C6DEE9' };
  const sea = h * 0.5;
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.seaTop} />
          <Stop offset="1" stopColor={c.seaBot} />
        </LinearGradient>
      </Defs>
      {/* 하늘 + 바다 */}
      <Rect x={0} y={0} width={w} height={sea} fill={c.sky} />
      <Rect x={0} y={sea} width={w} height={h - sea} fill={`url(#${gid})`} />
      {/* 떠 있는 빙하 — 수면 위 삼각 + 수면에 닿는 밑동 */}
      <Path
        d={`M ${w * 0.34} ${sea} L ${w * 0.5} ${sea - h * 0.2} L ${w * 0.66} ${sea} Z`}
        fill={c.ice}
      />
      <Path
        d={`M ${w * 0.34} ${sea} L ${w * 0.5} ${sea - h * 0.2} L ${w * 0.5} ${sea} Z`}
        fill={c.iceShade}
        opacity={0.6}
      />
      {/* 앞쪽 유빙 */}
      <Ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.42} ry={h * 0.09} fill={c.ice} />
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

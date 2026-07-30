import { useId, useMemo, useState, type ReactNode } from 'react';
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

import { Brush } from '@/components/brush';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fieldStrokes, mix, rng, shade, type BrushStroke } from '@/lib/paint';

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
 *
 * 칠하는 방식은 두 가지입니다.
 *   - painterly(기본) 면마다 붓자국을 얹어 유화처럼 보이게 합니다.
 *   - 끄면 예전의 납작한 단색 면.
 * 배경은 캐릭터보다 면적이 넓어서, 화면 전체의 인상은 대부분 여기서 정해집니다.
 */

export const SCENE_KINDS = ['room', 'water', 'neutral', 'meadow'] as const;
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
  /** 면마다 붓자국을 얹습니다. 끄면 납작한 단색. */
  painterly?: boolean;
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
export function Scene({ kind = DEFAULT_SCENE, painterly = true, children, style }: SceneProps) {
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
          <Backdrop kind={kind} w={size.w} h={size.h} dark={dark} painterly={painterly} />
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

type SceneArgs = { w: number; h: number; dark: boolean; painterly: boolean };

function Backdrop({ kind, ...rest }: SceneArgs & { kind: SceneKind }) {
  if (kind === 'room') return <RoomScene {...rest} />;
  if (kind === 'water') return <WaterScene {...rest} />;
  if (kind === 'meadow') return <MeadowScene {...rest} />;
  return <NeutralScene {...rest} />;
}

/**
 * 꽃밭 — 레퍼런스에 가장 가까운 씬.
 *
 * "저 느낌"의 정체가 뭔지 확인하려고 만든 씬입니다. 무지개·언덕·들꽃까지
 * 전부 절차적으로 그리므로 이미지 에셋은 여전히 0장입니다.
 *
 * 레퍼런스에서 질감이 살아 있는 면적은 대부분 캐릭터가 아니라 배경입니다.
 * 배경은 정지 화면이라 붓자국을 몇백 개 깔아도 부담이 없고(애니메이션이
 * 없으니 매 프레임 다시 그리지 않습니다), 그래서 같은 비용으로 캐릭터보다
 * 훨씬 많은 인상을 살 수 있습니다.
 */
function MeadowScene({ w, h, dark, painterly }: SceneArgs) {
  const gid = `meadow-${useId()}`;
  const c = dark
    ? {
        skyTop: '#1E3350',
        skyLow: '#33506E',
        hillFar: '#2A4A3C',
        hillNear: '#33573F',
        grass: '#2E5B3C',
      }
    : {
        skyTop: '#8FC4F0',
        skyLow: '#CDE8FA',
        hillFar: '#A8CE85',
        hillNear: '#8FC46C',
        grass: '#87BE62',
      };
  const horizon = h * 0.52;

  // 무지개는 안쪽(보라)부터 바깥(빨강)으로 갈수록 반지름이 커집니다.
  // 파스텔이라 채도를 낮추고, 두께를 겹쳐 경계를 흐립니다.
  const bow = ['#F7B7B7', '#FBD9A6', '#FBF3B0', '#B9E6C0', '#B3D4F5', '#CDBEEC'];
  const bowR = Math.max(w, h) * 0.62;
  const bowW = Math.max(w, h) * 0.045;

  const sky = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: 0,
            w,
            h: horizon,
            base: c.skyLow,
            seed: 707,
            count: 30,
            angle: 0.06,
            spread: 0.2,
            length: 0.8,
            width: 0.08,
            lift: 26,
            opacity: 0.4,
            chroma: 0.5,
            pastel: true,
          })
        : [],
    [painterly, w, horizon, c.skyLow],
  );
  const grass = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: horizon,
            w,
            h: h - horizon,
            base: c.grass,
            seed: 808,
            // 풀은 캐릭터가 서 있는 바닥이라 촘촘해야 잔디로 읽힙니다.
            count: 70,
            // 거의 수직으로 세워야 풀, 눕히면 잔디밭이 아니라 카펫입니다.
            angle: -Math.PI / 2,
            spread: 0.5,
            length: 0.28,
            width: 0.022,
            lift: 52,
            opacity: 0.7,
            chroma: 0.35,
            pastel: true,
          })
        : [],
    [painterly, w, h, horizon, c.grass],
  );
  const flowers = useMemo(
    () => (painterly ? flowerField(w, h, horizon, 909) : []),
    [painterly, w, h, horizon],
  );

  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.skyTop} />
          <Stop offset="1" stopColor={c.skyLow} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />

      {/* 무지개 — 지평선 아래에 중심을 두면 화면 위쪽을 크게 가로지릅니다 */}
      <G opacity={dark ? 0.3 : 0.55}>
        {bow.map((color, i) => (
          <Path
            key={color}
            d={arc(w * 0.42, horizon + h * 0.34, bowR - i * bowW)}
            stroke={color}
            strokeWidth={bowW * 1.25}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </G>
      <Brush strokes={sky} />

      {/* 먼 언덕 / 가까운 언덕 — 두 겹이면 깊이가 생깁니다 */}
      <Ellipse cx={w * 0.2} cy={horizon + h * 0.06} rx={w * 0.42} ry={h * 0.12} fill={c.hillFar} />
      <Ellipse cx={w * 0.86} cy={horizon + h * 0.07} rx={w * 0.38} ry={h * 0.1} fill={c.hillFar} />
      <Rect x={0} y={horizon + h * 0.04} width={w} height={h} fill={c.hillNear} />
      <Brush strokes={grass} />
      <Brush strokes={flowers} />
    </G>
  );
}

/** 반원 호 하나. 무지개 띠를 그리는 데 씁니다. */
function arc(cx: number, cy: number, r: number): string {
  return `M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r).toFixed(1)} ${cy.toFixed(1)}`;
}

/**
 * 들꽃 — 짧은 획 몇 개를 한자리에 모으면 꽃 한 송이가 됩니다.
 *
 * 꽃잎을 정확히 그리려 들면 개수만큼 비용이 붙고, 이 크기에서는 어차피
 * 안 보입니다. 색 점 하나 + 짧은 획 서넛이면 눈은 꽃으로 읽습니다.
 * 아래쪽일수록(가까울수록) 크게 그려야 원근이 맞습니다.
 */
function flowerField(w: number, h: number, horizon: number, seed: number): BrushStroke[] {
  const r = rng(seed);
  const petals = ['#FFE066', '#FFFFFF', '#FF9FC4', '#FFB870', '#D9A6F5'];
  const out: BrushStroke[] = [];

  for (let i = 0; i < 26; i++) {
    const depth = r();
    const x = r() * w;
    const y = horizon + h * 0.06 + depth * (h - horizon) * 0.92;
    const size = Math.max(w, h) * (0.008 + depth * 0.016);
    const color = petals[Math.floor(r() * petals.length)];

    for (let p = 0; p < 4; p++) {
      const a = (p / 4) * Math.PI * 2 + r() * 0.6;
      const dx = Math.cos(a) * size;
      const dy = Math.sin(a) * size * 0.8;
      out.push({
        d: `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`,
        width: size * 1.1,
        color,
        opacity: 0.85,
      });
    }
    // 꽃 한가운데 점 — 이게 있어야 꽃잎이 흩어진 얼룩으로 안 보입니다.
    out.push({
      d: `M ${x.toFixed(1)} ${y.toFixed(1)} L ${(x + 0.5).toFixed(1)} ${y.toFixed(1)}`,
      width: size * 0.9,
      color: '#F7A23B',
      opacity: 0.9,
    });
  }
  return out;
}

/** 방 — 벽 + 바닥 + 러그 + 창문. 잡동사니 없이 분위기만. */
function RoomScene({ w, h, dark, painterly }: SceneArgs) {
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

  // 벽은 위아래로, 바닥은 좌우로 쓸어야 두 면이 각각 평면으로 읽힙니다.
  // 방향을 섞으면 벽과 바닥의 경계가 흐려져 공간이 무너집니다.
  const wall = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: 0,
            w,
            h: floorY,
            base: c.wall,
            seed: 101,
            // 벽은 캐릭터 바로 뒤라 조금만 세도 커튼처럼 보입니다.
            // 넓은 붓으로 옅게, 몇 번만 쓸고 끝냅니다.
            count: 22,
            angle: Math.PI / 2,
            spread: 0.2,
            length: 0.6,
            width: 0.12,
            lift: 18,
            opacity: 0.3,
          })
        : [],
    [painterly, w, floorY, c.wall],
  );
  const floor = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: floorY,
            w,
            h: h - floorY,
            base: c.floor,
            seed: 202,
            count: 26,
            angle: 0,
            spread: 0.12,
            length: 0.75,
            width: 0.085,
            lift: 30,
            opacity: 0.55,
          })
        : [],
    [painterly, w, h, floorY, c.floor],
  );
  const rug = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: w * 0.18,
            y: h * 0.8,
            w: w * 0.64,
            h: h * 0.11,
            base: c.rug,
            seed: 303,
            count: 14,
            angle: 0,
            spread: 0.1,
            length: 0.9,
            width: 0.13,
            lift: 26,
            opacity: 0.6,
          })
        : [],
    [painterly, w, h, c.rug],
  );

  return (
    <G>
      {/* 벽 / 바닥 */}
      <Rect x={0} y={0} width={w} height={h} fill={c.wall} />
      <Brush strokes={wall} />
      <Rect x={0} y={floorY} width={w} height={h - floorY} fill={c.floor} />
      <Brush strokes={floor} />
      <Line x1={0} y1={floorY} x2={w} y2={floorY} stroke={c.edge} strokeWidth={2} />

      {/* 창문 — 유리 + 십자 창틀 */}
      <Rect x={winX} y={winY} width={winW} height={winH} rx={6} fill={c.glass} />
      {painterly && (
        // 유리에 비스듬히 그은 몇 획이 반사광을 만듭니다.
        <G opacity={0.5}>
          <Line
            x1={winX + winW * 0.1}
            y1={winY + winH * 0.8}
            x2={winX + winW * 0.55}
            y2={winY + winH * 0.12}
            stroke={mix(c.glass, '#FFFFFF', 0.7)}
            strokeWidth={fw * 0.9}
            strokeLinecap="round"
          />
          <Line
            x1={winX + winW * 0.45}
            y1={winY + winH * 0.88}
            x2={winX + winW * 0.85}
            y2={winY + winH * 0.3}
            stroke={mix(c.glass, '#FFFFFF', 0.5)}
            strokeWidth={fw * 0.6}
            strokeLinecap="round"
          />
        </G>
      )}
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
      <Brush strokes={rug} />

      {/* 화분 하나 */}
      <G>
        <Ellipse cx={w * 0.85} cy={floorY - h * 0.11} rx={w * 0.07} ry={h * 0.08} fill={c.plant} />
        {painterly && <Leaves cx={w * 0.85} cy={floorY - h * 0.11} r={w * 0.07} base={c.plant} />}
        <Path
          d={`M ${w * 0.81} ${floorY - h * 0.04} L ${w * 0.89} ${floorY - h * 0.04} L ${w * 0.875} ${floorY} L ${w * 0.825} ${floorY} Z`}
          fill={c.pot}
        />
      </G>
    </G>
  );
}

/** 물속 — 위는 밝고 아래로 깊어지는 그라데이션 + 기포 + 해초. 어항이 아니라 탁 트인 물속. */
function WaterScene({ w, h, dark, painterly }: SceneArgs) {
  // 그라데이션 id는 인스턴스마다 유일해야 합니다. 웹에서는 모든 SVG가 한 문서를
  // 공유해서, id가 겹치면 먼저 정의된 그라데이션이 덮어써집니다.
  const gid = `water-${useId()}`;
  const c = dark
    ? { top: '#173A4A', bottom: '#081722', bubble: '#BFE0EE', weed: '#1E5A48' }
    : { top: '#C4E8F4', bottom: '#2E86B8', bubble: '#FFFFFF', weed: '#2E8B6F' };

  // 물은 옆으로 길게 쓸어야 넘실대는 층으로 보입니다. 세로로 그으면 비가 옵니다.
  const upper = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: 0,
            w,
            h: h * 0.5,
            base: c.top,
            seed: 404,
            count: 22,
            angle: 0.08,
            spread: 0.16,
            length: 0.85,
            width: 0.07,
            lift: 34,
            opacity: 0.45,
          })
        : [],
    [painterly, w, h, c.top],
  );
  const lower = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: h * 0.45,
            w,
            h: h * 0.55,
            base: c.bottom,
            seed: 505,
            count: 24,
            angle: -0.06,
            spread: 0.18,
            length: 0.8,
            width: 0.08,
            lift: 30,
            opacity: 0.45,
          })
        : [],
    [painterly, w, h, c.bottom],
  );

  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      <Brush strokes={upper} />
      <Brush strokes={lower} />

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
      {painterly && (
        // 해초에 밝은 획을 하나씩 얹어 잎맥처럼 세웁니다.
        <G opacity={0.6}>
          <Path
            d={`M ${w * 0.14} ${h * 0.98} Q ${w * 0.1} ${h * 0.8} ${w * 0.145} ${h * 0.65}`}
            stroke={shade(c.weed, 46)}
            strokeWidth={w * 0.008}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={`M ${w * 0.86} ${h * 0.98} Q ${w * 0.92} ${h * 0.82} ${w * 0.862} ${h * 0.69}`}
            stroke={shade(c.weed, 46)}
            strokeWidth={w * 0.008}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      )}
    </G>
  );
}

/** 뉴트럴 — 완전 백색이 아니라 살짝 톤 있는 세로 그라데이션 + 캐릭터 뒤 은은한 스포트라이트. */
function NeutralScene({ w, h, dark, painterly }: SceneArgs) {
  const gid = `neutral-${useId()}`;
  const c = dark
    ? { top: '#231C18', bottom: '#191410', glow: '#33291F' }
    : { top: '#FCF3EA', bottom: '#F0E0D0', glow: '#FFFFFF' };

  // 뉴트럴은 캐릭터를 보는 자리라 배경이 튀면 안 됩니다. 획을 길고 넓게,
  // 대비는 거의 없이 깔아 "칠한 종이" 정도로만 남깁니다.
  const wash = useMemo(
    () =>
      painterly
        ? fieldStrokes({
            x: 0,
            y: 0,
            w,
            h,
            base: c.bottom,
            seed: 606,
            count: 20,
            angle: Math.PI / 2.6,
            spread: 0.3,
            length: 0.9,
            width: 0.1,
            lift: 18,
            opacity: 0.3,
          })
        : [],
    [painterly, w, h, c.bottom],
  );

  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.top} />
          <Stop offset="1" stopColor={c.bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${gid})`} />
      <Brush strokes={wash} />
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

/**
 * 화분 잎.
 *
 * 초록 타원 하나는 식물이 아니라 완두콩입니다. 중심에서 뻗는 굵은 획 몇 개를
 * 얹으면 잎이 겹친 덩어리로 읽힙니다.
 */
function Leaves({ cx, cy, r, base }: { cx: number; cy: number; r: number; base: string }) {
  const blades = useMemo(() => {
    const out: { d: string; color: string; width: number }[] = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42;
      const len = r * (1.5 + (i % 3) * 0.28);
      const ex = cx + Math.cos(a) * len;
      const ey = cy + Math.sin(a) * len * 1.15;
      const mx = cx + Math.cos(a) * len * 0.55 - Math.sin(a) * r * 0.3;
      const my = cy + Math.sin(a) * len * 0.55 + Math.cos(a) * r * 0.3;
      out.push({
        d: `M ${cx.toFixed(1)} ${(cy + r * 0.7).toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
        color: shade(base, i % 2 === 0 ? 26 : -20),
        width: r * (0.3 + (i % 2) * 0.12),
      });
    }
    return out;
  }, [cx, cy, r, base]);

  return (
    <G>
      {blades.map((b, i) => (
        <Path
          key={i}
          d={b.d}
          stroke={b.color}
          strokeWidth={b.width}
          strokeLinecap="round"
          fill="none"
        />
      ))}
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

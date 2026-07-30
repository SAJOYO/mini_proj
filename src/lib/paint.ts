/**
 * 색 계산과 붓질 생성.
 *
 * 캐릭터(pet-rig)와 배경(pet-scene)이 같은 규칙으로 칠해져야 한 그림처럼
 * 보입니다. 그래서 색 파생과 붓터치 생성을 여기 한 곳에 둡니다.
 *
 * 붓터치는 이미지가 아니라 벡터 path입니다. SVG 필터로 질감을 만드는 방법
 * (feTurbulence + feDisplacementMap)은 react-native-svg에서 네이티브 미구현이라
 * 웹에서만 보이고 iOS/Android에서는 통째로 사라집니다. 반면 평범한 path는
 * 양쪽에서 똑같이 그려지고, 에셋도 필요 없습니다.
 */

/* ------------------------------------------------------------------ *
 * 색
 * ------------------------------------------------------------------ */

type RGB = [number, number, number];

/**
 * `#RGB`, `#RRGGBB`, `rgb(r, g, b)` 를 모두 받습니다.
 *
 * 세 형식을 다 받는 게 중요합니다. shade/mix가 서로의 결과를 다시 받아
 * 물리기 때문에, 한 쪽만 파싱하면 중간에 NaN이 되어 색이 통째로 검게 됩니다.
 */
export function parseColor(c: string): RGB {
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    if (hex.length === 3) {
      const n = parseInt(hex, 16);
      const r = (n >> 8) & 15;
      const g = (n >> 4) & 15;
      const b = n & 15;
      return [r * 17, g * 17, b * 17];
    }
    const n = parseInt(hex, 16);
    if (Number.isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/-?\d+(\.\d+)?/g);
  if (!m || m.length < 3) return [0, 0, 0];
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

const clamp255 = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

function toRgb([r, g, b]: RGB): string {
  return `rgb(${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)})`;
}

/** 색을 밝게/어둡게. amount가 음수면 어두워집니다. */
export function shade(color: string, amount: number): string {
  const [r, g, b] = parseColor(color);
  return toRgb([r + amount, g + amount, b + amount]);
}

/** 두 색을 t(0~1)만큼 섞습니다. t=0이면 a, t=1이면 b. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  const k = Math.max(0, Math.min(1, t));
  const lerp = (x: number, y: number) => x + (y - x) * k;
  return toRgb([lerp(ar, br), lerp(ag, bg), lerp(ab, bb)]);
}

/** 나이 들어 털이 희끗해지는 정도. amount 0~1. */
export function fade(color: string, amount: number): string {
  return mix(color, '#D8D3CA', amount * 0.5);
}

/** 눈에 보이는 밝기 0~1. 초록이 가장 밝게, 파랑이 가장 어둡게 느껴집니다. */
export function luminance(color: string): number {
  const [r, g, b] = parseColor(color);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * 털색에서 외곽선 색.
 *
 * 일정한 양만큼 어둡게 하면 흰 품종(말티즈·비숑)에서 선이 사라집니다.
 * 흰색에서 100을 빼도 여전히 밝은 회색이라 배경과 구분이 안 됩니다.
 * 그래서 밝은 털일수록 더 깊게 내립니다. 중간 톤 이하는 그대로 둡니다.
 */
export function outlineFor(fur: string): string {
  const extra = Math.max(0, luminance(fur) - 0.72) * 260;
  return shade(fur, -105 - extra);
}

/* ------------------------------------------------------------------ *
 * 난수 — 렌더마다 같은 그림이 나와야 합니다
 * ------------------------------------------------------------------ */

/**
 * 씨앗 하나로 고정되는 난수열(mulberry32).
 *
 * Math.random을 쓰면 리렌더될 때마다 붓터치가 새로 뿌려져 그림이 지글거립니다.
 * 같은 씨앗이면 항상 같은 붓질이 나오도록 여기서 직접 굴립니다.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 문자열을 씨앗 숫자로. 품종 이름 같은 걸 그대로 넘길 때 씁니다. */
export function seedFrom(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ *
 * 붓터치
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * 회화 강도
 * ------------------------------------------------------------------ */

export const PAINT_STYLES = ['flat', 'brush', 'painted', 'pastel'] as const;

/**
 * 얼마나 그림처럼 칠할지.
 *
 *   flat    단색 + 굵은 외곽선. 원래 캐릭터
 *   brush   붓결만 얹음. 실루엣과 외곽선은 그대로
 *   painted 외곽선을 걷어내고 빛 방향을 넣음. 여기서 인상이 확 바뀝니다
 *   pastel  색상까지 흔들어 알록달록하게
 *
 * 순서에 의미가 있습니다. 사람들이 "유화 같다"고 느끼는 건 붓결이 아니라
 * 대부분 '굵은 검은 외곽선이 없다'와 '빛 방향이 있다' 두 가지입니다.
 * 그래서 brush→painted 사이의 변화가 flat→brush보다 훨씬 큽니다.
 */
export type PaintStyle = (typeof PAINT_STYLES)[number];

export type PaintRecipe = {
  /** 붓결을 얹을지 */
  texture: boolean;
  /** 색상 흔들림 폭 */
  chroma: number;
  /** 파스텔 색조 */
  pastel: boolean;
  /** 바탕색을 파스텔로 끌어올리는 정도 */
  wash: number;
  /** 외곽선 두께. 0이면 안 그림 */
  outlineWidth: number;
  /** 외곽선 진하기 0~1 */
  outlineAlpha: number;
  /** 빛/그늘을 얹을지 */
  sheen: boolean;
};

export const PAINT_RECIPES: Record<PaintStyle, PaintRecipe> = {
  flat: {
    texture: false,
    chroma: 0,
    pastel: false,
    wash: 0,
    outlineWidth: 1,
    outlineAlpha: 1,
    sheen: false,
  },
  brush: {
    texture: true,
    chroma: 0.22,
    pastel: false,
    wash: 0,
    outlineWidth: 1,
    outlineAlpha: 1,
    sheen: false,
  },
  painted: {
    texture: true,
    chroma: 0.32,
    pastel: false,
    // 3단계는 '외곽선 제거 + 빛' 하나만 달라지게 둡니다. 색까지 같이 바꾸면
    // 인상이 바뀐 이유가 선 때문인지 색 때문인지 구분할 수 없습니다.
    wash: 0,
    // 완전히 없애면 머리와 몸통이 한 덩어리로 뭉칩니다.
    // 가늘고 옅게 남겨 형태만 갈라 줍니다.
    outlineWidth: 0.42,
    outlineAlpha: 0.5,
    sheen: true,
  },
  pastel: {
    texture: true,
    chroma: 0.62,
    pastel: true,
    wash: 0.34,
    outlineWidth: 0.34,
    outlineAlpha: 0.38,
    sheen: true,
  },
};

export type BrushStroke = {
  d: string;
  width: number;
  color: string;
  opacity: number;
};

/** 살짝 휜 붓자국 하나. 직선으로 그으면 붓이 아니라 빗금으로 보입니다. */
function strokePath(x: number, y: number, angle: number, len: number, bow: number): string {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const x1 = x - (dx * len) / 2;
  const y1 = y - (dy * len) / 2;
  const x2 = x + (dx * len) / 2;
  const y2 = y + (dy * len) / 2;
  // 중점을 진행방향의 수직으로 밀어 완만한 호를 만듭니다.
  const mx = x - dy * bow;
  const my = y + dx * bow;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * 자연광 색조 — 따뜻한 햇빛과 차가운 그늘. 사실적인 쪽.
 */
const NATURAL_TINTS = ['#FFEAC2', '#C9D6E8'];

/**
 * 파스텔 색조 — 분홍·노랑·하늘·민트·라벤더.
 *
 * 회화적인 그림에서 흰 털이 흰색으로 칠해지는 일은 없습니다. 빛 받은 쪽은
 * 노랑기, 그늘은 보라·파랑기가 돕니다. 이렇게 한 면 안에서 색상 자체를
 * 흔드는 걸 broken color라고 하고, 알록달록한 인상은 거의 전부 여기서
 * 나옵니다. 명도만 흔들면 아무리 세게 해도 "때 탄 단색"입니다.
 */
const PASTEL_TINTS = ['#FFD3E4', '#FFF0B8', '#C6E4FF', '#CFF3DE', '#E2D2FF', '#FFDCC2'];

/**
 * 붓자국 색 하나 고르기.
 *
 * chroma가 색상을 얼마나 흔들지, lift가 명도를 얼마나 흔들지 정합니다.
 * 둘은 역할이 다릅니다. lift만 올리면 얼룩덜룩해지기만 하고, 회화적인
 * 느낌은 chroma에서 옵니다.
 */
function strokeColor(
  base: string,
  r: () => number,
  lift: number,
  chroma: number,
  tints: string[],
): string {
  const tint = tints[Math.floor(r() * tints.length)];
  const tinted = mix(base, tint, r() * chroma);
  // 0.5를 빼야 밝기가 바탕색을 중심으로 대칭이 됩니다. 0.35처럼 치우치면
  // 획이 평균적으로 바탕보다 밝아져, 칠한 면 전체가 들뜨고 얼룩져 보입니다.
  return shade(tinted, (r() - 0.5) * lift);
}

/**
 * 채도를 k배로. k가 1보다 크면 진해지고, 0이면 흑백이 됩니다.
 *
 * 밝기(luminance)를 축으로 색을 밀고 당깁니다. 밝기가 안 변하니
 * 명도는 그대로 두고 색만 진하게 만들 수 있습니다.
 */
export function saturate(color: string, k: number): string {
  const [r, g, b] = parseColor(color);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return toRgb([l + (r - l) * k, l + (g - l) * k, l + (b - l) * k]);
}

/**
 * 색을 파스텔 쪽으로.
 *
 * 파스텔은 "채도가 낮은 색"이 아닙니다. **밝으면서 채도는 살아 있는** 색입니다.
 * 흰색으로 섞기만 하면 색이 바래서 잿빛이 되고, 알록달록해지기는커녕
 * 오히려 죽습니다. 그래서 밝기를 올린 만큼 채도를 되밀어 올립니다.
 */
export function pastelize(color: string, amount: number): string {
  if (amount <= 0) return color;
  const lifted = mix(color, '#FFF6EA', amount * 0.55);
  return saturate(lifted, 1 + amount * 1.3);
}

export type FurStrokeOptions = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** 바탕 털색 */
  base: string;
  seed: number;
  /** 붓자국 개수 */
  count?: number;
  /** 명도 흔들림 폭. 클수록 대비가 셉니다 */
  lift?: number;
  /** 붓 길이 배율 */
  scale?: number;
  /** 색상 흔들림 폭 0~1. 올릴수록 알록달록해집니다 */
  chroma?: number;
  /** 파스텔 색조를 쓸지. false면 자연광 색조 */
  pastel?: boolean;
};

/**
 * 덩어리(머리·몸통) 안을 채우는 털 붓질.
 *
 * 붓자국이 실루엣 등고선을 따라 돌게 만드는 게 핵심입니다. 중심에서 바깥으로
 * 뻗는 방사형으로 그으면 털이 아니라 폭발로 보이고, 전부 같은 방향이면
 * 빗질한 카펫이 됩니다. 접선 방향 + 중심으로 갈수록 커지는 흔들림이
 * 레퍼런스의 양털처럼 뭉게뭉게 도는 결을 만듭니다.
 */
export function furStrokes({
  cx,
  cy,
  rx,
  ry,
  base,
  seed,
  count = 26,
  lift = 62,
  scale = 1,
  chroma = 0.22,
  pastel = false,
}: FurStrokeOptions): BrushStroke[] {
  const tints = pastel ? PASTEL_TINTS : NATURAL_TINTS;
  const r = rng(seed);
  const out: BrushStroke[] = [];
  const reach = Math.min(rx, ry);

  for (let i = 0; i < count; i++) {
    // 타원 안에 고르게 뿌립니다. sqrt를 씌워야 가운데로 몰리지 않습니다.
    const t = r() * Math.PI * 2;
    const u = Math.sqrt(r()) * 0.88;
    const px = cx + Math.cos(t) * rx * u;
    const py = cy + Math.sin(t) * ry * u;

    const radial = Math.atan2(py - cy, px - cx);
    // 바깥쪽일수록 윤곽을 따라 눕고, 안쪽일수록 자유롭게 흩어집니다.
    const angle = radial + Math.PI / 2 + (1 - u) * (r() - 0.5) * 2.6 + (r() - 0.5) * 0.55;
    // 짧고 굵으면 붓자국이 아니라 얼룩이 됩니다. 가늘고 길게 그어야 결로 읽힙니다.
    const len = reach * (0.42 + r() * 0.5) * scale;
    const bow = len * (0.1 + r() * 0.16) * (r() < 0.5 ? 1 : -1);

    out.push({
      d: strokePath(px, py, angle, len, bow),
      width: reach * (0.045 + r() * 0.06),
      color: strokeColor(base, r, lift, chroma, tints),
      opacity: 0.26 + r() * 0.34,
    });
  }

  // 물감이 두껍게 얹힌 자리의 하이라이트. 임파스토를 임파스토로 보이게 하는 건
  // 색이 아니라 이 가느다란 밝은 선입니다. 몇 개만 얹어야 번들거리지 않습니다.
  const hi = Math.max(2, Math.round(count * 0.22));
  for (let i = 0; i < hi; i++) {
    const t = r() * Math.PI * 2;
    const u = Math.sqrt(r()) * 0.8;
    const px = cx + Math.cos(t) * rx * u;
    const py = cy + Math.sin(t) * ry * u;
    const radial = Math.atan2(py - cy, px - cx);
    const angle = radial + Math.PI / 2 + (r() - 0.5) * 1.1;
    const len = reach * (0.3 + r() * 0.34) * scale;

    out.push({
      d: strokePath(px, py, angle, len, len * 0.14),
      width: reach * 0.022,
      color: shade(mix(base, '#FFFFFF', 0.55), 10),
      opacity: 0.4 + r() * 0.32,
    });
  }

  return out;
}

export type FieldStrokeOptions = {
  x: number;
  y: number;
  w: number;
  h: number;
  base: string;
  seed: number;
  count?: number;
  /** 붓이 향하는 기본 각도(라디안) */
  angle?: number;
  /** 각도 흔들림 폭(라디안) */
  spread?: number;
  /** 붓 길이 = 짧은 변 × 이 값 */
  length?: number;
  /** 붓 두께 = 짧은 변 × 이 값 */
  width?: number;
  lift?: number;
  opacity?: number;
  /** 색상 흔들림 폭 0~1 */
  chroma?: number;
  /** 파스텔 색조를 쓸지 */
  pastel?: boolean;
};

/**
 * 사각 영역을 쓸어 채우는 붓질. 배경(하늘·벽·바닥·물)에 씁니다.
 *
 * 배경은 캐릭터와 달리 방향이 일정해야 화면이 차분합니다. 하늘은 옆으로,
 * 벽은 위아래로 쓸어야 각 면이 평면으로 읽힙니다.
 */
export function fieldStrokes({
  x,
  y,
  w,
  h,
  base,
  seed,
  count = 40,
  angle = 0,
  spread = 0.35,
  length = 0.5,
  width = 0.06,
  lift = 44,
  opacity = 0.5,
  chroma = 0.22,
  pastel = false,
}: FieldStrokeOptions): BrushStroke[] {
  const tints = pastel ? PASTEL_TINTS : NATURAL_TINTS;
  const r = rng(seed);
  const out: BrushStroke[] = [];
  const unit = Math.min(w, h);

  for (let i = 0; i < count; i++) {
    const px = x + r() * w;
    const py = y + r() * h;
    const a = angle + (r() - 0.5) * spread * 2;
    const len = unit * length * (0.55 + r() * 0.9);
    const bow = len * (r() - 0.5) * 0.24;

    out.push({
      d: strokePath(px, py, a, len, bow),
      width: unit * width * (0.6 + r() * 0.9),
      color: strokeColor(base, r, lift, chroma, tints),
      opacity: opacity * (0.5 + r() * 0.7),
    });
  }

  return out;
}

/// <reference types="node" />

/**
 * 20-breed-prompts/*.md → src/constants/breed-prompt.ts
 *
 *   npm run prompts:build
 *
 * ## 왜 생성하는가
 *
 * 프롬프트 원본은 사람이 읽고 고치는 마크다운입니다. 그런데 React Native는
 * 런타임에 .md를 읽을 수 없어서, 어떤 식으로든 코드 쪽에 사본이 있어야 합니다.
 * 손으로 옮기면 반드시 어긋납니다 — 실제로 krea2_identity_edit.json의 기본
 * 프롬프트가 골든 리트리버 문서를 붙여넣다 깨진 채로 남아 있었습니다.
 * 그래서 사본을 손으로 만들지 않고 여기서 찍어냅니다.
 *
 * ## 무엇을 버리는가
 *
 * 마크다운의 프롬프트는 "인물과 개를 둘 다 처음부터 그린다"는 전제로 쓰였습니다.
 * 앱은 그렇지 않습니다 — 사용자가 올린 사진에서 인물과 배경을 그대로 가져오고
 * 개만 합성합니다. 그래서 아래 세 가지는 **읽되 버립니다.**
 *
 *   - 씬 문단      "창가 나무 바닥에 앉은 사람, 커튼 너머 아침 햇살…"
 *   - 프레이밍 문단 "둘 다 프레임 안에, 얼굴이 잘리지 않게…"
 *   - COMPOSITION  세로 인물 크롭 지시 (9개 단계에만 붙어 있음)
 *
 * 배경과 구도는 원본 사진이 이미 정하고 있고, 여기서 또 정하면 서로 싸웁니다.
 * 대신 identity-edit에 맞는 구도 규칙을 lib/photo-prompt.ts가 직접 씁니다.
 *
 * 남기는 것: 그림체 한 줄, GAZE 블록, 품종 앵커, 단계별 subject/pose/look/palette.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DOC_DIR = join(process.cwd(), '20-breed-prompts');
const OUT_FILE = join(process.cwd(), 'src', 'constants', 'breed-prompt.ts');

/**
 * BreedId → 마크다운 파일 이름.
 *
 * constants/pet.ts의 BREEDS 키와 1:1로 맞아야 합니다. 품종을 새로 추가하면
 * 여기와 20-breed-prompts/ 양쪽에 같이 넣으세요. 짝이 없으면 빌드가 멈춥니다.
 *
 * 문서에는 있지만 BREEDS에 없는 견종(보더 콜리·코커 스패니얼·프렌치 불독·
 * 래브라도·슈나우저·사모예드·허스키)은 여기 없으므로 번들에 들어가지 않습니다.
 * 나중에 BREEDS에 추가하면 그때 한 줄씩 더하면 됩니다.
 */
const DOC_OF: Record<string, string> = {
  neutral: 'neutral',
  shiba: 'shiba-inu',
  retriever: 'golden-retriever',
  dachshund: 'dachshund',
  poodle: 'poodle',
  beagle: 'beagle',
  shihtzu: 'shih-tzu',
  maltese: 'maltese',
  corgi: 'welsh-corgi',
  chihuahua: 'chihuahua',
  bichon: 'bichon-frise',
  doberman: 'doberman',
  yorkshire: 'yorkshire-terrier',
  pointer: 'pointer',
  greyhound: 'greyhound',
  cavalier: 'cavalier',
  jindo: 'jindo',
  pomeranian: 'pomeranian',
};

/** 문서의 `## 1.` ~ `## 4.` 는 코드의 StageId 순서와 같습니다. */
const STAGE_IDS = ['baby', 'teen', 'young', 'elder'] as const;

/** 9개 단계에만 붙어 있는 COMPOSITION 문단은 이 문장으로 끝납니다. */
const COMPOSITION_END = 'never crop the top of their head.';

/** 포즈 문단은 항상 이 단어로 끝납니다. 뒤부터는 생김새 서술입니다. */
const POSE_END = 'unposed.';

type StagePrompt = {
  subject: string;
  pose: string;
  look: string;
  palette: string;
};

type BreedPromptSet = {
  anchors: string[];
  stages: Record<(typeof STAGE_IDS)[number], StagePrompt>;
};

/** 마크다운의 줄바꿈을 지웁니다. 프롬프트에서 줄바꿈은 의미가 없습니다. */
const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

const out = (line = '') => process.stdout.write(`${line}\n`);

function fail(msg: string): never {
  process.stderr.write(`\n  ✗ ${msg}\n\n`);
  process.exit(1);
}

/** 한 견종 문서에서 필요한 조각만 뽑는다. */
function parseDoc(doc: string, name: string): { set: BreedPromptSet; style: string; gaze: string } {
  const anchorSection = /^## Breed Anchors[^\n]*\n(.*?)(?=^## )/ms.exec(doc);
  if (!anchorSection) fail(`${name}: "## Breed Anchors" 섹션이 없습니다`);
  // 항목 하나가 여러 줄에 걸쳐 있을 수 있습니다. "- "로 시작하는 줄이 새 항목,
  // 나머지 줄은 직전 항목의 이어짐입니다.
  const anchors: string[] = [];
  for (const line of anchorSection[1].split('\n')) {
    if (line.startsWith('- ')) anchors.push(line.slice(2).trim());
    else if (line.trim() && anchors.length > 0) anchors[anchors.length - 1] += ` ${line.trim()}`;
  }
  if (anchors.length === 0) fail(`${name}: Breed Anchors 항목이 비어 있습니다`);

  const blocks = [...doc.matchAll(/^## ([1-4])\. [^\n]+\n+```text\n(.*?)```/gms)];
  if (blocks.length !== 4) fail(`${name}: 단계 블록이 4개가 아니라 ${blocks.length}개입니다`);

  const stages = {} as Record<(typeof STAGE_IDS)[number], StagePrompt>;
  const styles = new Set<string>();
  const gazes = new Set<string>();

  for (const [, num, body] of blocks) {
    const stage = STAGE_IDS[Number(num) - 1];
    const paras = body.trim().split('\n\n');

    // [씬, 프레이밍, GAZE, THE DOG] 또는 그 뒤에 COMPOSITION 문단이 하나 더.
    if (paras.length !== 4 && paras.length !== 5)
      fail(`${name} ${stage}: 문단이 4~5개여야 하는데 ${paras.length}개입니다`);

    const [scene, , gaze, dog] = paras;
    let tail = '';
    if (paras.length === 5) {
      const [, after] = paras[4].split(COMPOSITION_END);
      if (after === undefined) fail(`${name} ${stage}: 다섯 번째 문단이 COMPOSITION이 아닙니다`);
      tail = after;
    }

    // 씬 문단의 첫 줄만 그림체 지시("35mm film-look…")입니다. 나머지는 장소라 버립니다.
    styles.add(flat(scene.split('\n')[0]));
    gazes.add(flat(gaze));

    const lines = dog.split('\n');
    const subject = flat(lines[0].replace(/^THE DOG:/, ''));
    if (!subject) fail(`${name} ${stage}: "THE DOG:" 뒤에 대상이 비어 있습니다`);

    const rest = flat([...lines.slice(1), tail].join(' '));
    const cut = rest.indexOf(POSE_END);
    if (cut < 0) fail(`${name} ${stage}: 포즈 문단이 "${POSE_END}"로 끝나지 않습니다`);
    const pose = rest.slice(0, cut + POSE_END.length).trim();

    // 팔레트는 항상 마지막 한 문장이고 "outline #XXXXXX." 로 끝납니다.
    const body2 = rest.slice(cut + POSE_END.length).trim();
    const palMatch = /(?:^|(?<=\.\s))([^.]*?outline #[0-9A-Fa-f]{6}\.)\s*$/.exec(body2);
    if (!palMatch) fail(`${name} ${stage}: 마지막 팔레트 문장을 찾지 못했습니다`);
    const palette = palMatch[1].trim();
    const look = body2.slice(0, palMatch.index).trim();
    if (!look) fail(`${name} ${stage}: 생김새 서술이 비어 있습니다`);

    stages[stage] = { subject, pose, look, palette };
  }

  if (styles.size !== 1) fail(`${name}: 그림체 첫 줄이 단계마다 다릅니다 (${styles.size}종)`);
  if (gazes.size !== 1) fail(`${name}: GAZE 블록이 단계마다 다릅니다 (${gazes.size}종)`);

  return { set: { anchors, stages }, style: [...styles][0], gaze: [...gazes][0] };
}

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function main() {
  const available = new Set(
    readdirSync(DOC_DIR)
      .filter((f) => f.endsWith('-prompts.md'))
      .map((f) => f.replace('-prompts.md', '')),
  );

  const sets: [string, BreedPromptSet][] = [];
  const styles = new Set<string>();
  const gazes = new Set<string>();

  for (const [breed, slug] of Object.entries(DOC_OF)) {
    if (!available.has(slug)) fail(`${breed}: 20-breed-prompts/${slug}-prompts.md 가 없습니다`);
    const { set, style, gaze } = parseDoc(
      // 기존 문서 일부에 BOM과 CRLF가 섞여 있습니다. 파싱 전에 걷어냅니다.
      readFileSync(join(DOC_DIR, `${slug}-prompts.md`), 'utf8')
        .replace(/^﻿/, '')
        .replace(/\r\n/g, '\n'),
      slug,
    );
    sets.push([breed, set]);
    styles.add(style);
    gazes.add(gaze);
  }

  // 그림체와 시선은 견종이 달라도 같아야 합니다. 네 장이 한 앨범에 놓이기 때문입니다.
  if (styles.size !== 1) fail(`그림체 첫 줄이 견종마다 다릅니다 (${styles.size}종)`);
  if (gazes.size !== 1) fail(`GAZE 블록이 견종마다 다릅니다 (${gazes.size}종)`);

  const unused = [...available].filter((s) => !Object.values(DOC_OF).includes(s));

  const source = `// 이 파일은 생성됩니다. 직접 고치지 마세요.
//
//   원본        20-breed-prompts/*-prompts.md
//   다시 만들기 npm run prompts:build
//
// 프롬프트를 바꾸려면 마크다운을 고치고 위 명령을 다시 돌리세요.
// 여기를 고치면 다음 빌드에서 그대로 지워집니다.

import type { BreedId } from '@/constants/pet';
import type { StageId } from '@/lib/game';

/** 그림체. 25개 문서 100개 단계가 전부 같은 한 줄을 씁니다. */
export const BREED_ART_STYLE = ${q([...styles][0])};

/** 시선 규칙. 정면 응시로 굳는 것을 막습니다. 역시 100개 단계 공통입니다. */
export const BREED_GAZE = ${q([...gazes][0])};

/** 한 견종의 한 단계. */
export type BreedStagePrompt = {
  /** "a Beagle puppy" — 프롬프트의 THE DOG: 뒤에 그대로 들어갑니다. */
  subject: string;
  /** 자세와 인물과의 접촉. 단계마다 다른 포즈가 배정돼 있습니다. */
  pose: string;
  /** 그 나이대의 생김새. 머리 비율·귀·털·눈까지. */
  look: string;
  /** 색 지정 한 줄. 단계마다 조금씩 바랩니다. */
  palette: string;
};

export type BreedPromptSet = {
  /** 다른 견종과 절대 섞이면 안 되는 고정 특징. 프롬프트 끝에 다시 붙여 강조합니다. */
  anchors: string[];
  stages: Record<StageId, BreedStagePrompt>;
};

export const BREED_PROMPTS: Record<BreedId, BreedPromptSet> = {
${sets
  .map(
    ([breed, set]) => `  ${breed}: {
    anchors: [
${set.anchors.map((a) => `      ${q(a)},`).join('\n')}
    ],
    stages: {
${STAGE_IDS.map((s) => {
  const st = set.stages[s];
  return `      ${s}: {
        subject: ${q(st.subject)},
        pose: ${q(st.pose)},
        look: ${q(st.look)},
        palette: ${q(st.palette)},
      },`;
}).join('\n')}
    },
  },`,
  )
  .join('\n')}
};
`;

  writeFileSync(OUT_FILE, source, 'utf8');

  out(`  ✓ ${sets.length}종 × 4단계 → src/constants/breed-prompt.ts`);
  if (unused.length > 0) {
    out(`  · BREEDS에 없어 번들에서 빠진 문서 ${unused.length}종: ${unused.join(', ')}`);
  }
}

main();

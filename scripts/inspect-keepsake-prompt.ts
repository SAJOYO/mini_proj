/// <reference types="node" />

/**
 * 기념 사진 생성에 실제로 들어가는 프롬프트를 그대로 찍어보는 진단용 스크립트.
 *
 * ComfyUI를 부르지 않습니다. 품종과 단계만 주면 넘어갈 문장이 전부 나옵니다.
 * 프롬프트를 손보고 결과를 눈으로 확인할 때 씁니다.
 *
 *   npm run keepsake:prompt                  전 품종 × 전 단계 요약
 *   npm run keepsake:prompt -- beagle        비글 4단계 전문
 *   npm run keepsake:prompt -- beagle young  비글 청년기 한 장만
 */

import { BREEDS, type BreedId } from '@/constants/pet';
import { STAGES, type StageId } from '@/lib/game';
import { buildKeepsakePrompt } from '@/lib/photo-prompt';

const out = (line = '') => process.stdout.write(`${line}\n`);

const BREED_IDS = Object.keys(BREEDS) as BreedId[];
const STAGE_IDS = STAGES.map((s) => s.id);

const [breedArg, stageArg] = process.argv.slice(2);

if (breedArg && !BREED_IDS.includes(breedArg as BreedId)) {
  out(`모르는 품종: ${breedArg}`);
  out(`쓸 수 있는 값: ${BREED_IDS.join(' ')}`);
  process.exit(1);
}
if (stageArg && !STAGE_IDS.includes(stageArg as StageId)) {
  out(`모르는 단계: ${stageArg}`);
  out(`쓸 수 있는 값: ${STAGE_IDS.join(' ')}`);
  process.exit(1);
}

// 인자가 없으면 전체를 훑으며 길이만 봅니다. 어느 조합이 유난히 길거나 짧은지
// (= 문서에서 뭔가 빠졌는지) 한눈에 드러납니다.
if (!breedArg) {
  out('품종별 프롬프트 길이 (글자 수)');
  out('');
  out(`  ${'품종'.padEnd(12)}${STAGE_IDS.map((s) => s.padStart(8)).join('')}`);
  for (const breed of BREED_IDS) {
    const lens = STAGE_IDS.map((stage) =>
      String(buildKeepsakePrompt(breed, stage).prompt.length).padStart(8),
    );
    out(`  ${breed.padEnd(12)}${lens.join('')}`);
  }
  out('');
  out('한 장을 통째로 보려면: npm run keepsake:prompt -- <품종> [단계]');
  process.exit(0);
}

const breed = breedArg as BreedId;
for (const stage of stageArg ? [stageArg as StageId] : STAGE_IDS) {
  const { prompt, caption } = buildKeepsakePrompt(breed, stage);
  out('='.repeat(78));
  out(`${BREEDS[breed].label} · ${stage} · 캡션 "${caption}" · ${prompt.length}자`);
  out('='.repeat(78));
  out(prompt);
  out('');
}

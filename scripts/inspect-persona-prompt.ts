/// <reference types="node" />

/**
 * 대화 LLM에 실제로 들어가는 프롬프트를 그대로 찍어보는 진단용 스크립트.
 *
 * API를 부르지 않습니다. 품종 혼합만 주면 주입될 내용이 전부 나옵니다.
 *
 *   npm run persona:prompt -- doberman:55 greyhound:30 pointer:15 [이름]
 */

import { AXES, AXIS_KEYS, synthesize, traitOf, type BreedMix } from '@/lib/persona';
import { BREEDS, type BreedId } from '@/constants/pet';
import { SHARED_RULES, characterBlock } from '@/lib/persona-chat/system-prompt';

const out = (line = '') => process.stdout.write(`${line}\n`);

function parseMix(args: string[]): BreedMix {
  const mix = args
    .filter((a) => a.includes(':'))
    .map((a) => {
      const [breed, ratio] = a.split(':');
      if (!(breed in BREEDS)) throw new Error(`모르는 품종: ${breed}`);
      return { breed: breed as BreedId, ratio: Number(ratio) };
    });
  if (mix.length === 0)
    throw new Error('사용법: npm run persona:prompt -- shiba:60 beagle:40 [이름]');
  return mix;
}

const args = process.argv.slice(2);
const name = args.find((a) => !a.includes(':')) ?? '단무';
const card = synthesize(parseMix(args));

out('════════ 입력 ════════');
out(card.mix.map((m) => `${BREEDS[m.breed].label} ${Math.round(m.ratio)}`).join(' / '));
out();

out('════════ 축 → 말버릇 대응 ════════');
out('축이 mid면 말버릇에 안 들어갑니다. 튀는 축만 지시가 됩니다.');
out();
for (const key of AXIS_KEYS) {
  const value = card.axes[key];
  const band = card.bands[key];
  const used = band === 'mid' ? '  (지시 없음 — 특징 없는 축)' : '';
  out(
    `  ${AXES[key].label.padEnd(5)} ${String(value).padStart(3)}  ${band.padEnd(10)}` +
      `${traitOf(key, value)}${used}`,
  );
}
out();

out('════════ 블록 1 — 전 사용자 공통 (캐시 대상) ════════');
out(SHARED_RULES);
out();

out('════════ 블록 2 — 이 캐릭터 (캐시 대상) ════════');
out(characterBlock(card, name));
out();

out('════════ 실제 요청 구조 ════════');
out('messages: [');
out('  { role: "system",    content: <블록 1> },');
out('  { role: "system",    content: <블록 2> },');
out('  { role: "user",      content: "안녕" },');
out('  { role: "assistant", content: <직전 답변> },   ← 히스토리 누적');
out('  { role: "user",      content: "..." },');
out(']');
out('max_tokens: 200      temperature: 보내지 않음');

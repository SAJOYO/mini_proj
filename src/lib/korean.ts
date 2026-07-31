/**
 * 한국어 조사 붙이기.
 *
 * "멍멍를 닮은"처럼 조사가 어긋나면 바로 눈에 걸립니다. 닉네임·품종처럼 값이
 * 실행 중에 정해지는 단어에는 조사를 하드코딩하지 말고 여기 함수를 쓰세요.
 *
 * 판정 기준은 **마지막 글자의 받침**입니다. 한글 음절은 유니코드에서
 * `0xAC00 + (초성×588) + (중성×28) + 종성` 으로 배치되어 있어서,
 * `(코드 - 0xAC00) % 28`이 0이면 받침이 없습니다.
 */

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

/**
 * 숫자로 끝나는 이름(예: "유저1")은 읽는 소리로 판정합니다.
 * 1(일)·3(삼)·6(육)·7(칠)·8(팔)·0(영)은 받침이 있고, 나머지는 없습니다.
 */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  '0': true,
  '1': true,
  '2': false,
  '3': true,
  '4': false,
  '5': false,
  '6': true,
  '7': true,
  '8': true,
  '9': false,
};

/**
 * 마지막 글자에 받침이 있는지. 판정할 수 없으면 null.
 *
 * 한글도 숫자도 아닌 경우(영문 등)는 읽는 방식이 사람마다 달라 확정할 수
 * 없어서 null을 돌려주고, 호출한 쪽에서 기본값을 고릅니다.
 */
export function hasFinalConsonant(word: string): boolean | null {
  const last = word.trim().slice(-1);
  if (!last) return null;

  const code = last.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END) {
    return (code - HANGUL_START) % JONGSEONG_COUNT !== 0;
  }

  if (last in DIGIT_HAS_FINAL) return DIGIT_HAS_FINAL[last] ?? null;

  return null;
}

/**
 * 단어에 맞는 조사를 골라 돌려줍니다(단어는 포함하지 않습니다).
 *
 *   pickParticle('멍멍', '을', '를')  // '을'
 *   pickParticle('가영', '이', '가')  // '이'
 *
 * 받침을 판정할 수 없으면 **받침 없는 쪽**을 씁니다. "Jane를"이 "Jane을"보다
 * 자연스럽게 읽히는 경우가 많아서 이쪽을 기본으로 골랐습니다.
 */
export function pickParticle(word: string, withFinal: string, withoutFinal: string): string {
  return hasFinalConsonant(word) ? withFinal : withoutFinal;
}

/** 목적격 조사: 멍멍**을** / 루비**를** */
export function objectParticle(word: string): string {
  return pickParticle(word, '을', '를');
}

/** 주격 조사: 멍멍**이** / 루비**가** */
export function subjectParticle(word: string): string {
  return pickParticle(word, '이', '가');
}

/** 보조사: 멍멍**은** / 루비**는** */
export function topicParticle(word: string): string {
  return pickParticle(word, '은', '는');
}

/** 도구격 조사: 멍멍**으로** / 루비**로** (받침 ㄹ은 '로'를 씁니다) */
export function withParticle(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  const isRieul =
    code >= HANGUL_START && code <= HANGUL_END && (code - HANGUL_START) % JONGSEONG_COUNT === 8;

  if (isRieul) return '로';
  return pickParticle(word, '으로', '로');
}

import { type TypeCode, typeCodes } from "./classification";

const optionCount = 4;

export function letterDistance(a: TypeCode, b: TypeCode): number {
  return [...a].filter((letter, index) => letter !== b[index]).length;
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (const byte of new TextEncoder().encode(seed)) {
    state = Math.imul(state ^ byte, 16777619) >>> 0;
  }
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const held = result[index] as T;
    result[index] = result[swapIndex] as T;
    result[swapIndex] = held;
  }
  return result;
}

export function quizOptions(typeCode: TypeCode, seed: string): TypeCode[] {
  const random = seededRandom(`${seed}:${typeCode}`);
  const near = typeCodes.filter((code) => {
    const distance = letterDistance(typeCode, code);
    return distance === 1 || distance === 2;
  });
  const distractors = shuffled(near, random).slice(0, optionCount - 1);
  return shuffled([typeCode, ...distractors], random);
}

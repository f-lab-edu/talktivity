import type { Message } from "./parse-kakao";

export const axisIds = ["direction", "length", "color", "stance"] as const;
export type AxisId = (typeof axisIds)[number];
export const axisPoles = {
  direction: ["O", "R"],
  length: ["L", "B"],
  color: ["C", "M"],
  stance: ["D", "G"],
} as const;
export const typeCodes = [
  "OLCD",
  "OLCG",
  "OLMD",
  "OLMG",
  "OBCD",
  "OBCG",
  "OBMD",
  "OBMG",
  "RLCD",
  "RLCG",
  "RLMD",
  "RLMG",
  "RBCD",
  "RBCG",
  "RBMD",
  "RBMG",
] as const;
export type TypeCode = (typeof typeCodes)[number];
export const badgeIds = ["comedian", "emoji"] as const;
export type BadgeId = (typeof badgeIds)[number];
export type AxisScores = Readonly<Record<AxisId, number>>;
export type AxisEvidence = {
  readonly rawScore: number;
  readonly n: number;
};
export type EvidenceByAxis = Readonly<Record<AxisId, AxisEvidence>>;
export type Confidence = "low" | "medium" | "high";
export type SemanticScores = Readonly<Partial<Pick<AxisScores, "direction" | "stance">>>;
export type HintCounts = {
  readonly question: number;
  readonly proposal: number;
  readonly reaction: number;
  readonly assertion: number;
  readonly softener: number;
  readonly delegation: number;
  readonly cushion: number;
};
export type DeterministicFeatures = {
  readonly normalizedText: string;
  readonly hints: HintCounts;
  readonly evidence: AxisScores;
  readonly rawScores: AxisScores;
  // Unclamped measurements behind the L/B and C/M raw scores (0 when there are no turns).
  readonly medianLength: number;
  readonly expressionsPerTurn: number;
};
export type ClassificationResult = {
  readonly typeCode: TypeCode;
  readonly axes: AxisScores;
  readonly confidence: Confidence;
  readonly sampleSize: number;
  readonly badges: readonly BadgeId[];
  readonly evidence: AxisScores;
};

// Match a whole emoji sequence (including flags, keycaps, modifiers and ZWJ families).
const emojiSource =
  "(?:\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*)*)";
const emojiPattern = new RegExp(`${emojiSource}|\\[이모티콘(?::[^\\]]*)?\\]`, "gu");
const expressionPattern = new RegExp(
  `${emojiPattern.source}|[ㅋㅎㅠㅜ]{2,}|[!?~]{2,}|(?<![가-힣])(?:우와|와우|와|헐|대박|아싸|좋아|고마워요?|미안|슬퍼|행복해|사랑해|신나)(?![가-힣])`,
  "gu",
);
const hintPatterns = {
  question: /\?+|(?:어때|뭐해|왜|언제|어디|누구)(?:요)?(?=$|\s|[.!])/gu,
  proposal: /(?:하자|보자|가자|먹자|할까|볼까|갈까|어떨까)(?:요)?/gu,
  reaction: /(?<![가-힣])(?:응|네|넵|웅|알겠어|그래|맞아|오케이)(?![가-힣])/gu,
  assertion: /(?:할게|갈게|정했어|확실해|맞아|아니야|한다|이다)(?![가-힣])/gu,
  softener: /(?:같아|같아요|아마|할까|볼까|갈까|어떨까)(?![가-힣])/gu,
  delegation: /(?:네가 정해|너가 정해|맡길게|아무거나|편한 대로|좋을 대로)/gu,
  cushion: /(?:혹시|괜찮다면|미안하지만|실례지만|가능하면)/gu,
} as const;

export function normalizeAnalyzedText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\[(사진|이모티콘):[^\]]*\]/gu, "[$1]")
    .replace(/\s+/gu, " ")
    .trim();
}

export function groupTurns(messages: readonly Message[]): readonly Message[] {
  // This local accumulator merges only consecutive messages of the same speaker.
  const turns: Message[] = [];
  for (const message of messages) {
    const previous = turns.at(-1);
    if (previous && previous.speaker === message.speaker) {
      turns[turns.length - 1] = { ...previous, text: `${previous.text}\n${message.text}` };
    } else {
      turns.push({ ...message });
    }
  }
  return turns;
}

export function selectAnalyzedTurns(turns: readonly Message[]): readonly Message[] {
  const selected = turns.some((turn) => turn.speaker === "나")
    ? turns.filter((turn) => turn.speaker === "나")
    : turns;
  return selected.filter((turn) => turn.text.trim());
}

export function medianLength(turns: readonly Message[]): number {
  const lengths = turns
    .map(
      (turn) =>
        [
          ...normalizeAnalyzedText(
            normalizeAnalyzedText(turn.text)
              .replace(expressionPattern, "")
              .replace(/\[사진\]/gu, ""),
          ),
        ].length,
    )
    .sort((a, b) => a - b);
  const middle = Math.floor(lengths.length / 2);
  const upper = lengths[middle] ?? 0;
  return lengths.length % 2 ? upper : ((lengths[middle - 1] ?? 0) + upper) / 2;
}

export function lengthRawScore(turns: readonly Message[]): number {
  return turns.length ? Math.min(100, Math.round(medianLength(turns) * 2)) : 50;
}

export function expressionsPerTurn(turns: readonly Message[]): number {
  const count = turns.reduce(
    (total, turn) =>
      total + [...normalizeAnalyzedText(turn.text).matchAll(expressionPattern)].length,
    0,
  );
  return turns.length ? count / turns.length : 0;
}

export function colorRawScore(turns: readonly Message[]): number {
  return turns.length ? Math.min(100, Math.round(expressionsPerTurn(turns) * 50)) : 50;
}

export function countHints(turns: readonly Message[]): HintCounts {
  const text = turns.map((turn) => normalizeAnalyzedText(turn.text)).join("\n");
  const count = (pattern: RegExp) => [...text.matchAll(pattern)].length;
  return {
    question: count(hintPatterns.question),
    proposal: count(hintPatterns.proposal),
    reaction: count(hintPatterns.reaction),
    assertion: count(hintPatterns.assertion),
    softener: count(hintPatterns.softener),
    delegation: count(hintPatterns.delegation),
    cushion: count(hintPatterns.cushion),
  };
}

export function evidenceCounts(turns: readonly Message[], hints: HintCounts): AxisScores {
  return {
    direction: hints.question + hints.proposal + hints.reaction,
    length: turns.length,
    color: turns.length,
    stance: hints.assertion + hints.softener + hints.delegation + hints.cushion,
  };
}

export function fallbackRawScores(hints: HintCounts): Pick<AxisScores, "direction" | "stance"> {
  const initiative = hints.question + hints.proposal;
  const directionN = initiative + hints.reaction;
  const stanceN = hints.assertion + hints.softener + hints.delegation + hints.cushion;
  return {
    direction: directionN ? Math.round((initiative / directionN) * 100) : 50,
    stance: stanceN ? Math.round((hints.assertion / stanceN) * 100) : 50,
  };
}

export function deterministicFeatures(turns: readonly Message[]): DeterministicFeatures {
  const hints = countHints(turns);
  const evidence = evidenceCounts(turns, hints);
  return {
    normalizedText: normalizeAnalyzedText(turns.map((turn) => turn.text).join("\n")),
    hints,
    evidence,
    rawScores: {
      ...fallbackRawScores(hints),
      length: lengthRawScore(turns),
      color: colorRawScore(turns),
    } satisfies AxisScores,
    medianLength: medianLength(turns),
    expressionsPerTurn: expressionsPerTurn(turns),
  };
}

export function displayScore(rawScore: number, n: number): number {
  if (n === 0) return 50;
  const score = Math.round(50 + (n / (n + 4)) * (rawScore - 50));
  if (rawScore < 50) return Math.min(score, 49);
  if (rawScore > 50) return Math.max(score, 51);
  return 50;
}

export function deriveLetter<A extends AxisId>(
  axisId: A,
  evidence: AxisEvidence,
  normalizedText: string,
): (typeof axisPoles)[A][number] {
  if (evidence.n > 0) return axisPoles[axisId][evidence.rawScore >= 50 ? 0 : 1];
  // FNV-1a over UTF-8, salted by the axis; never used for observed evidence.
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(`${axisId}:${normalizedText}`)) {
    hash = Math.imul(hash ^ byte, 16777619) >>> 0;
  }
  return axisPoles[axisId][hash % 2 === 0 ? 0 : 1];
}

export function deriveTypeCode(axes: EvidenceByAxis, normalizedText: string): TypeCode {
  return `${deriveLetter("direction", axes.direction, normalizedText)}${deriveLetter("length", axes.length, normalizedText)}${deriveLetter("color", axes.color, normalizedText)}${deriveLetter("stance", axes.stance, normalizedText)}`;
}

export function isBoundary(score: number): boolean {
  return score >= 45 && score <= 55;
}

export function classifyConfidence(
  sampleSize: number,
  evidence: AxisScores,
): { readonly confidence: Confidence; readonly sampleSize: number } {
  const semanticN = Math.min(evidence.direction, evidence.stance);
  const confidence: Confidence =
    sampleSize < 3 || semanticN < 2 ? "low" : sampleSize < 5 || semanticN < 4 ? "medium" : "high";
  return { confidence, sampleSize };
}

export function hasEmojiBadge(turns: readonly Message[]): boolean {
  const counts = turns.map(
    (turn) => [...normalizeAnalyzedText(turn.text).matchAll(emojiPattern)].length,
  );
  return (
    counts.reduce((total, count) => total + count, 0) >= 2 ||
    (turns.length > 0 && counts.filter((count) => count > 0).length / turns.length >= 0.5)
  );
}

export function canonicalBadges(badges: readonly BadgeId[]): readonly BadgeId[] {
  return badgeIds.filter((badge) => badges.includes(badge));
}

export function classifyConversation(
  messages: readonly Message[],
  semanticScores: SemanticScores = {},
  comedian = false,
): ClassificationResult {
  const turns = selectAnalyzedTurns(groupTurns(messages));
  const features = deterministicFeatures(turns);
  const raw = { ...features.rawScores, ...semanticScores };
  const observed = (axis: AxisId): AxisEvidence => ({
    rawScore: features.evidence[axis] ? raw[axis] : 50,
    n: features.evidence[axis],
  });
  const evidenceAxes = {
    direction: observed("direction"),
    length: observed("length"),
    color: observed("color"),
    stance: observed("stance"),
  };
  const badges: BadgeId[] = [];
  if (comedian) badges.push("comedian");
  if (hasEmojiBadge(turns)) badges.push("emoji");
  return {
    typeCode: deriveTypeCode(evidenceAxes, features.normalizedText),
    axes: {
      direction: displayScore(evidenceAxes.direction.rawScore, features.evidence.direction),
      length: displayScore(raw.length, features.evidence.length),
      color: displayScore(raw.color, features.evidence.color),
      stance: displayScore(evidenceAxes.stance.rawScore, features.evidence.stance),
    },
    ...classifyConfidence(turns.length, features.evidence),
    badges: canonicalBadges(badges),
    evidence: features.evidence,
  };
}

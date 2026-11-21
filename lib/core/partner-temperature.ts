import { countHints, expressionsPerTurn, groupTurns, medianLength } from "./classification";
import type { Message } from "./parse-kakao";
import type { AnalysisResult } from "./schema";

export function selectPartnerTurns(turns: readonly Message[]): readonly Message[] {
  return turns.filter((turn) => turn.speaker !== null && turn.speaker !== "나");
}

export function computePartnerTemperature(
  messages: readonly Message[],
): AnalysisResult["partnerTemperature"] {
  const turns = groupTurns(messages);
  const partnerTurns = selectPartnerTurns(turns);
  if (partnerTurns.length < 2) return undefined;

  const hints = countHints(partnerTurns);
  const initiative = hints.question + hints.proposal;
  const expressions = expressionsPerTurn(partnerTurns);
  const myTurns = turns.filter((turn) => turn.speaker === "나");
  // Each signal contributes at most 2; whole-point thresholds keep engagement monotonic.
  const score =
    Math.min(2, initiative / partnerTurns.length) +
    Math.min(2, hints.reaction / partnerTurns.length + expressions) +
    Math.min(2, medianLength(partnerTurns) / Math.max(1, medianLength(myTurns)));
  return {
    level: 1 + [1, 2, 3, 4].filter((threshold) => score >= threshold).length,
    reason: `상대가 질문·제안 ${initiative}회, 리액션 ${hints.reaction}회, 감탄 표현 ${Math.round(expressions * partnerTurns.length)}회를 보였어요.`,
    source: "code",
  };
}

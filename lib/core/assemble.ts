import type { LlmOutput } from "./analyzer";
import { characters } from "./characters";
import {
  classifyConversation,
  deterministicFeatures,
  groupTurns,
  type HintCounts,
  selectAnalyzedTurns,
} from "./classification";
import type { Message } from "./parse-kakao";
import { type AnalysisResult, resultSchema } from "./schema";

export type FinalizeInput = {
  readonly messages: readonly Message[];
  readonly judgment?: LlmOutput | undefined;
};

const thinEvidence = "판단할 신호가 부족해 균형으로 봤어요.";

function directionReason(hints: HintCounts): string {
  const initiative = hints.question + hints.proposal;
  return initiative + hints.reaction
    ? `질문·제안 ${initiative}회, 맞장구 ${hints.reaction}회를 비교했어요.`
    : thinEvidence;
}

function stanceReason(hints: HintCounts): string {
  const soft = hints.softener + hints.delegation + hints.cushion;
  return hints.assertion + soft
    ? `단정 ${hints.assertion}회, 완곡·위임·쿠션어 ${soft}회를 비교했어요.`
    : thinEvidence;
}

/**
 * Shared assembly path for analyze(), mockAnalyze() and the example. A model judgment
 * may only supply O/R·D/G raw scores and reasons, the comedian badge and copy.
 */
export function finalizeAnalysisResult({ messages, judgment }: FinalizeInput): AnalysisResult {
  const turns = selectAnalyzedTurns(groupTurns(messages));
  const features = deterministicFeatures(turns);
  const { hints, evidence } = features;
  const classification = classifyConversation(
    messages,
    judgment ? { direction: judgment.direction.score, stance: judgment.stance.score } : {},
    judgment?.comedian ?? false,
  );
  const character = characters[classification.typeCode];
  return resultSchema.parse({
    typeCode: classification.typeCode,
    axes: classification.axes,
    axisReasons: {
      // A model reason is dropped when the axis had no evidence, because the score was ignored.
      direction:
        judgment && evidence.direction ? judgment.direction.reason : directionReason(hints),
      length: evidence.length
        ? `내 메시지 길이 중앙값이 약 ${Math.round(features.medianLength)}자예요.`
        : thinEvidence,
      color: evidence.color
        ? `메시지당 이모지·감탄 표현이 약 ${features.expressionsPerTurn.toFixed(1)}개예요.`
        : thinEvidence,
      stance: judgment && evidence.stance ? judgment.stance.reason : stanceReason(hints),
    },
    confidence: classification.confidence,
    sampleSize: classification.sampleSize,
    badges: classification.badges,
    roastLines: judgment?.roastLines ?? [
      `${character.name} 모드, 오늘도 정상 작동 중.`,
      "아무렇지 않은 척해도 답장 알림은 누구보다 빠르게 확인.",
      "대화의 기술은 만렙, 솔직한 한마디는 아직 연습 중!",
    ],
    reading: judgment?.reading ?? {
      loveFortune:
        "작은 관심이 큰 대화를 만드는 시기예요. 멋진 한마디보다 솔직한 안부가 잘 통해요. 상대의 속도에 맞춰 여유 있게 이어가 보세요.",
      tips: [
        "질문은 한 번에 하나씩 건네 보세요.",
        "상대가 말한 작은 취향을 기억해 주세요.",
        "답장 속도보다 대화의 온도에 집중해 보세요.",
      ],
      recommendedLines: [
        "아까 말한 그거, 어떻게 됐어? 궁금해서!",
        "오늘 이런 일이 있었는데 네 생각이 났어.",
      ],
    },
  });
}

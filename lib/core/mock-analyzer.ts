import { finalizeAnalysisResult } from "./assemble";
import { parseKakao } from "./parse-kakao";
import type { AnalysisRequest, AnalysisResult } from "./schema";

export function mockAnalyze(request: AnalysisRequest): AnalysisResult {
  return finalizeAnalysisResult({ messages: parseKakao(request.conversation) });
}

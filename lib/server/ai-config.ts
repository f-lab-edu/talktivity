import "server-only";
import type { AnalyzerConfig } from "@/lib/core/analyzer";

export function analyzerConfig(): AnalyzerConfig {
  return {
    provider: process.env.LLM_PROVIDER,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    openaiKey: process.env.OPENAI_API_KEY,
    googleKey: process.env.GEMINI_API_KEY,
    model: process.env.LLM_MODEL,
  };
}

const warned = new Set<string>();

export function systemPrompt(
  name: "ANALYZE_SYSTEM_PROMPT" | "EXTRACT_SYSTEM_PROMPT" | "REPORT_SYSTEM_PROMPT",
): string | undefined {
  const value = process.env[name];
  if (!value && !warned.has(name)) {
    warned.add(name);
    console.warn(`${name} 미설정: 키가 없을 때와 같은 모의 동작을 사용합니다.`);
  }
  return value || undefined;
}

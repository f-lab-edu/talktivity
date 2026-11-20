import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

it("프롬프트 누락 경고는 변수마다 한 번만 남기고 복구된 값을 전달한다", async () => {
  vi.resetModules();
  vi.stubEnv("ANALYZE_SYSTEM_PROMPT", "");
  vi.stubEnv("EXTRACT_SYSTEM_PROMPT", "");
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const { systemPrompt } = await import("../lib/server/ai-config");
  expect(systemPrompt("ANALYZE_SYSTEM_PROMPT")).toBeUndefined();
  expect(systemPrompt("ANALYZE_SYSTEM_PROMPT")).toBeUndefined();
  expect(systemPrompt("EXTRACT_SYSTEM_PROMPT")).toBeUndefined();
  expect(warn).toHaveBeenCalledTimes(2);
  vi.stubEnv("ANALYZE_SYSTEM_PROMPT", "fake system");
  expect(systemPrompt("ANALYZE_SYSTEM_PROMPT")).toBe("fake system");
});

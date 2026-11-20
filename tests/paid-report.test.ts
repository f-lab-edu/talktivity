import { generateText } from "ai";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  buildReportPrompt,
  generatePaidReport,
  mockPaidReport,
  paidReportSchema,
} from "../lib/core/billing/report";

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: vi.fn(),
}));
const generate = vi.mocked(generateText);
const request = {
  conversation: "나: 오늘은 어땠어?\n상대: 나 오늘 쉬어",
  relationship: "연인",
} as const;
const config = { provider: "openai", openaiKey: "test-key" };
beforeEach(() => {
  generate.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

it("사용자 메시지는 JSON 데이터로 만들고 주입한 시스템 프롬프트를 보존한다", () => {
  const built = buildReportPrompt(request, "fake system");
  expect(built.system).toBe("fake system");
  expect(JSON.parse(built.prompt)).toEqual(request);
});
it("mock은 입력 근거를 반영하고 반복 호출에 같은 유효 결과를 만든다", () => {
  const result = mockPaidReport(request);
  expect(paidReportSchema.parse(result)).toEqual(mockPaidReport({ ...request }));
  expect(
    mockPaidReport({ ...request, conversation: request.conversation.replace("?", ".") }).nextStep,
  ).not.toBe(result.nextStep);
});
it.each([
  { ...mockPaidReport(request), replies: [] },
  { ...mockPaidReport(request), headline: "a".repeat(61) },
  {
    ...mockPaidReport(request),
    partnerMind: { ...mockPaidReport(request).partnerMind, summary: "한 문장입니다." },
  },
  {
    ...mockPaidReport(request),
    partnerMind: { ...mockPaidReport(request).partnerMind, signals: ["one"] },
  },
])("잘못된 유료 리포트 형식을 거절한다", (report) => {
  expect(paidReportSchema.safeParse(report).success).toBe(false);
});
it("키 또는 프롬프트가 없으면 모델 호출 없이 mock을 반환한다", async () => {
  expect(await generatePaidReport(request, {}, "fake")).toEqual(mockPaidReport(request));
  expect(await generatePaidReport(request, config, undefined)).toEqual(mockPaidReport(request));
  expect(generate).not.toHaveBeenCalled();
});
it("모델 출력을 검증하여 유료 리포트로 반환한다", async () => {
  const output = { ...mockPaidReport(request), headline: "모델이 만든 제목" };
  generate.mockResolvedValue({ output } as Awaited<ReturnType<typeof generateText>>);
  expect(await generatePaidReport(request, config, "fake")).toEqual(output);
});
it("실패를 한 번 재시도한 후 mock으로 돌아가며 대화를 로그에 남기지 않는다", async () => {
  generate.mockRejectedValue(new Error(request.conversation));
  const report = await generatePaidReport(request, config, "fake");
  expect(report).toEqual(mockPaidReport(request));
  expect(generate).toHaveBeenCalledTimes(2);
  expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(request.conversation);
});

import { describe, expect, it, vi } from "vitest";
import { reportResponseSchema, reportsListResponseSchema } from "../lib/core/billing/contracts";
import {
  analysisInput,
  authenticatedRequest,
  billingHarness,
  databaseError,
  reportId,
  reportRow,
  userId,
} from "./helpers/billing";

vi.mock("server-only", () => ({}));
const generate = vi.hoisted(() =>
  vi.fn<
    (options: {
      readonly system?: string;
      readonly prompt?: string;
    }) => Promise<{ readonly output: unknown }>
  >(),
);
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText: generate,
}));
const wire = billingHarness();

function storedReportWire(request: Request): Response {
  if (request.url.endsWith("/credit_balance")) return Response.json(1);
  if (request.url.endsWith("/save_report")) return Response.json(reportId);
  if (new URL(request.url).pathname === "/rest/v1/reports") return Response.json([reportRow]);
  throw new Error(`Unexpected URL ${request.url}`);
}

describe("리포트 생성", () => {
  it("Paddle 없이 마스킹한 입력으로 생성하고 콘텐츠만 저장한다", async () => {
    vi.stubEnv("PADDLE_API_KEY", "");
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "fake-provider-key");
    generate.mockResolvedValue({ output: reportRow.content });
    wire.respond = async (request) => {
      if (request.url.endsWith("/save_report")) {
        const saved: unknown = await request.json();
        expect(saved).toEqual({ p_user: userId, p_content: reportRow.content });
        expect(JSON.stringify(saved)).not.toContain(analysisInput.conversation);
      }
      return storedReportWire(request);
    };
    const { POST } = await import("../app/api/reports/route");
    const response = await POST(authenticatedRequest("/api/reports", analysisInput));
    expect(response.status).toBe(200);
    const body = reportResponseSchema.parse(await response.json());
    expect(body.report.id).toBe(reportId);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const options = generate.mock.calls.at(-1)?.[0];
    expect(options?.system).toBe("fake system");
    expect(options?.prompt).toBe(
      JSON.stringify({
        relationship: "연인",
        conversation: "나: 상대야 [전화번호]로 연락해\n상대: 나야 알겠어",
      }),
    );
  });
  it("잔액이 없으면 LLM과 저장을 호출하기 전에 402를 반환한다", async () => {
    generate.mockClear();
    wire.respond = () => Response.json(0);
    const { POST } = await import("../app/api/reports/route");
    const response = await POST(authenticatedRequest("/api/reports", analysisInput));
    expect(response.status).toBe(402);
    expect(wire.requests.map((request) => new URL(request.url).pathname)).toEqual([
      "/rest/v1/rpc/credit_balance",
    ]);
    expect(generate).not.toHaveBeenCalled();
  });
  it("생성 후 DB 잔액 경합은 402로 반환한다", async () => {
    wire.respond = (request) =>
      request.url.endsWith("/save_report")
        ? databaseError("INSUFFICIENT_CREDITS")
        : Response.json(1);
    const { POST } = await import("../app/api/reports/route");
    const response = await POST(authenticatedRequest("/api/reports", analysisInput));
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ error: { code: "INSUFFICIENT_CREDITS" } });
  });
  it.each([
    { ...analysisInput, mySpeaker: undefined },
    { ...analysisInput, conversation: "short" },
  ])("잘못된 입력은 잔액 조회와 생성 전에 거절한다", async (body) => {
    const { POST } = await import("../app/api/reports/route");
    const response = await POST(authenticatedRequest("/api/reports", body));
    expect(response.status).toBe(400);
    expect(wire.requests).toHaveLength(0);
  });
  it("사용자당 10분 3회 제한은 다른 IP에서도 유지한다", async () => {
    wire.respond = storedReportWire;
    const { POST } = await import("../app/api/reports/route");
    for (let i = 0; i < 3; i++)
      expect((await POST(authenticatedRequest("/api/reports", analysisInput))).status).toBe(200);
    const request = authenticatedRequest("/api/reports", analysisInput);
    request.headers.set("x-forwarded-for", "1.2.3.4");
    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("전역 LLM 예산이 소진되면 저장 없이 503이다", async () => {
    wire.respond = () => Response.json(1);
    const { globalLlmLimit, globalLlmPerMinute } = await import("../lib/server/rate-limit");
    for (let i = 0; i < globalLlmPerMinute; i++) await globalLlmLimit();
    const { POST } = await import("../app/api/reports/route");
    const response = await POST(authenticatedRequest("/api/reports", analysisInput));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: { code: "BUSY" } });
    expect(wire.requests).toHaveLength(1);
  });
});

describe("리포트 조회", () => {
  it("본인 리포트를 최신 50개까지 제목만 조회한다", async () => {
    wire.respond = (request) => {
      const url = new URL(request.url);
      expect(url.searchParams.get("user_id")).toBe(`eq.${userId}`);
      expect(url.searchParams.get("order")).toBe("created_at.desc");
      expect(url.searchParams.get("limit")).toBe("50");
      expect(url.searchParams.get("select")).toBe("id,content->>headline,created_at");
      return Response.json([
        { id: reportId, headline: reportRow.content.headline, created_at: reportRow.created_at },
      ]);
    };
    const { GET } = await import("../app/api/reports/route");
    const response = await GET(authenticatedRequest("/api/reports"));
    expect(reportsListResponseSchema.parse(await response.json()).reports).toEqual([
      {
        id: reportId,
        headline: reportRow.content.headline,
        createdAt: reportRow.created_at,
      },
    ]);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("본인 ID 조건으로 상세 리포트를 조회한다", async () => {
    wire.respond = (request) => {
      if (request.url.endsWith("/credit_balance")) return Response.json(2);
      const url = new URL(request.url);
      expect(url.searchParams.get("user_id")).toBe(`eq.${userId}`);
      expect(url.searchParams.get("id")).toBe(`eq.${reportId}`);
      return Response.json([reportRow]);
    };
    const { GET } = await import("../app/api/reports/[id]/route");
    const response = await GET(authenticatedRequest(`/api/reports/${reportId}`), {
      params: Promise.resolve({ id: reportId }),
    });
    expect(response.status).toBe(200);
    expect(reportResponseSchema.parse(await response.json()).balance).toBe(2);
  });
  it.each([reportId, "not-a-uuid"])("없거나 남의 리포트 %s는 404이다", async (id) => {
    wire.respond = () => Response.json([]);
    const { GET } = await import("../app/api/reports/[id]/route");
    const response = await GET(authenticatedRequest(`/api/reports/${id}`), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST as examplePost } from "../app/api/example/route";
import { exampleResult } from "../lib/core/example";
import { responseSchema, resultSchema } from "../lib/core/schema";
import { sharePayloadFromResult, sharePayloadV2Schema } from "../lib/core/share-token";

describe("생성 계약과 예시", () => {
  it("예시 결과가 분석 결과 계약을 통과한다", () => {
    expect(resultSchema.safeParse(exampleResult).success).toBe(true);
  });

  it("예시 API 응답과 v2 공유 payload가 계약을 통과한다", async () => {
    const response = await examplePost(
      new Request("http://localhost/api/example", { method: "POST" }),
    );
    const body: unknown = await response.json();
    expect(responseSchema.safeParse(body).success).toBe(true);
    expect(sharePayloadV2Schema.safeParse(sharePayloadFromResult(exampleResult)).success).toBe(
      true,
    );
  });

  it("기존 v1 공유 계약 파일이 없다", () => {
    expect(existsSync("contracts/share-payload-v1.json")).toBe(false);
  });
});

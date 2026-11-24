import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { type AnalysisResult, resultSchema } from "../lib/core/schema";
import {
  sharePayloadFromResult,
  sharePayloadV2Schema,
  signToken,
  verifyToken,
} from "../lib/core/share-token";
import vectors from "./golden/share-token-v2.json";

const v1GoldenToken = {
  secret: "boundary-secret",
  token: "WzEsImNvb2wiLDEwMCwwLDEwMCwiYSIsImIiLCJjIl0.fio1Ot7dLgn96wteynS4_Q",
};
const result: AnalysisResult = resultSchema.parse({
  typeCode: "OBCG",
  axes: { direction: 72, length: 38, color: 81, stance: 44 },
  axisReasons: { direction: "질문이 많아요", length: "짧아요", color: "ㅋㅋ", stance: "완곡해요" },
  confidence: "low",
  sampleSize: 2,
  badges: ["comedian", "emoji"],
  roastLines: ["첫 줄", "둘째 줄", "셋째 줄"],
  reading: { loveFortune: "맑음", tips: ["a", "b", "c"], recommendedLines: ["x", "y"] },
});

function signRaw(json: string, secret = "secret"): string {
  const encoded = Buffer.from(json).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(encoded)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
  return `${encoded}.${signature}`;
}
const roasts = '"a","b","c"';

describe("언어 중립 공유 토큰 v2", () => {
  it.each(vectors)("독립 HMAC 골든 벡터를 인코딩한다: $secret", async (vector) => {
    expect(await signToken(sharePayloadV2Schema.parse(vector.payload), vector.secret)).toBe(
      vector.token,
    );
  });
  it.each(vectors)("한국어·이모지·배지를 포함한 골든 벡터를 검증한다: $secret", async (vector) => {
    expect(await verifyToken(vector.token, vector.secret)).toEqual(vector.payload);
  });
  it("대화·근거·해석·표본 수는 토큰에 넣지 않는다", async () => {
    const token = await signToken(sharePayloadFromResult(result), "secret");
    const decoded: unknown = JSON.parse(
      Buffer.from(token.split(".")[0] ?? "", "base64url").toString(),
    );
    expect(decoded).toEqual([
      2,
      "OBCG",
      72,
      38,
      81,
      44,
      ["comedian", "emoji"],
      ...result.roastLines,
    ]);
  });
  it("유효하게 서명된 v1 토큰도 거절한다", async () => {
    expect(await verifyToken(v1GoldenToken.token, v1GoldenToken.secret)).toBeNull();
    expect(await verifyToken(signRaw(`[1,"flirt",82,67,43,${roasts}]`), "secret")).toBeNull();
  });
  it.each(["bad", "", "a.b", `${vectors[0]?.token}x`, "a".repeat(4000)])(
    "잘못된 토큰을 거절한다",
    async (token) => {
      expect(await verifyToken(token, "secret")).toBeNull();
    },
  );
  it("3000자를 넘는 토큰은 서명이 맞아도 거절한다", async () => {
    const token = signRaw(`[2,"OLCD",50,50,50,50,[],"${"가".repeat(800)}","b","c"]`);
    expect(token.length).toBeGreaterThan(3000);
    expect(await verifyToken(token, "secret")).toBeNull();
  });
  it("서명과 페이로드 변조 및 다른 비밀키를 거절한다", async () => {
    const token = await signToken(sharePayloadFromResult(result), "secret");
    const [payload, signature] = token.split(".");
    expect(await verifyToken(`${payload}.A${signature?.slice(1)}`, "secret")).toBeNull();
    expect(await verifyToken(`A${payload?.slice(1)}.${signature}`, "secret")).toBeNull();
    expect(await verifyToken(token, "another-secret")).toBeNull();
  });
  it.each([
    `[1,"OLCD",50,50,50,50,[],${roasts}]`,
    `[3,"OLCD",50,50,50,50,[],${roasts}]`,
    `[2,"XXXX",50,50,50,50,[],${roasts}]`,
    `[2,"flirt",50,50,50,50,[],${roasts}]`,
    `[2,"OLCD",101,50,50,50,[],${roasts}]`,
    `[2,"OLCD",50,-1,50,50,[],${roasts}]`,
    `[2,"OLCD",50,50,50.5,50,[],${roasts}]`,
    `[2,"OLCD",50,50,50,"50",[],${roasts}]`,
    `[2,"OLCD",50,50,50,50,["emoji","comedian"],${roasts}]`,
    `[2,"OLCD",50,50,50,50,["emoji","emoji"],${roasts}]`,
    `[2,"OLCD",50,50,50,50,["unknown"],${roasts}]`,
    `[2,"OLCD",50,50,50,50,[],"","b","c"]`,
    `[2,"OLCD",50,50,50,50,[],"a","b"]`,
    `[2,"OLCD",50,50,50,50,[],${roasts},"conversation"]`,
    '{"typeCode":"OLCD"}',
  ])("서명이 맞아도 계약이 틀리면 거절한다: %s", async (json) => {
    expect(await verifyToken(signRaw(json), "secret")).toBeNull();
  });
  it.each([
    `[2, "OLCD",50,50,50,50,[],${roasts}]`,
    `[2,"OLCD",50,50,50,50,[ ],${roasts}]`,
    `[2,"OLCD",50,50,50,50,[],${roasts}]\n`,
    `[2,"OLCD",5e1,50,50,50,[],${roasts}]`,
  ])("서명이 맞아도 비정규 JSON을 거절한다: %j", async (json) => {
    expect(await verifyToken(signRaw(json), "secret")).toBeNull();
  });
  it("정규 JSON은 같은 방식으로 서명하면 통과한다", async () => {
    expect(await verifyToken(signRaw(`[2,"OLCD",50,50,50,50,[],${roasts}]`), "secret")).toEqual({
      typeCode: "OLCD",
      axes: { direction: 50, length: 50, color: 50, stance: 50 },
      badges: [],
      roastLines: ["a", "b", "c"],
    });
  });
});

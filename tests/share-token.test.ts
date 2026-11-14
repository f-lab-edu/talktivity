import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { exampleResult } from "../lib/core/example";
import { sharePayloadSchema, signToken, toSharePayload, verifyToken } from "../lib/core/share-token";
import vectors from "./golden/share-token.json";

describe("언어 중립 공유 토큰 v1", () => {
  it.each(vectors)("독립 HMAC 골든 벡터를 인코딩한다: $secret", async (vector) => {
    expect(await signToken(sharePayloadSchema.parse(vector.payload), vector.secret)).toBe(vector.token);
  });
  it.each(vectors)("한국어와 이모지를 포함한 골든 벡터를 검증한다: $secret", async (vector) => {
    expect(await verifyToken(vector.token, vector.secret)).toEqual(vector.payload);
  });
  it("대화와 긴 해석은 토큰에 넣지 않는다", async () => {
    const token = await signToken(toSharePayload(exampleResult), "secret");
    const decoded: unknown = JSON.parse(Buffer.from(token.split(".")[0] ?? "", "base64url").toString());
    expect(decoded).toEqual([1, "flirt", 82, 67, 43, ...exampleResult.roastLines]);
  });
  it.each(["bad", "", "a.b", `${vectors[0]?.token}x`, "a".repeat(4000)])("잘못된 토큰을 거절한다", async (token) => {
    expect(await verifyToken(token, "secret")).toBeNull();
  });
  it("서명과 페이로드 변조 및 다른 비밀키를 거절한다", async () => {
    const token = await signToken(toSharePayload(exampleResult), "secret");
    const [payload, signature] = token.split(".");
    expect(await verifyToken(`${payload}.A${signature?.slice(1)}`, "secret")).toBeNull();
    expect(await verifyToken(`A${payload?.slice(1)}.${signature}`, "secret")).toBeNull();
    expect(await verifyToken(token, "another-secret")).toBeNull();
  });
  it.each([
    [2, "flirt", 82, 67, 43, "a", "b", "c"],
    [1, "unknown", 82, 67, 43, "a", "b", "c"],
    [1, "flirt", -1, 67, 43, "a", "b", "c"],
    [1, "flirt", 82, 67, 43, "a", "b"],
    { version: 1, characterId: "flirt" },
  ])("서명이 맞아도 버전이나 계약이 틀리면 거절한다: %j", async (...value) => {
    const encoded = Buffer.from(JSON.stringify(value.length === 1 ? value[0] : value)).toString("base64url");
    const signature = createHmac("sha256", "secret").update(encoded).digest().subarray(0, 16).toString("base64url");
    expect(await verifyToken(`${encoded}.${signature}`, "secret")).toBeNull();
  });
  it("서명이 맞아도 비정규 JSON을 거절한다", async () => {
    const encoded = Buffer.from('[1, "flirt",82,67,43,"a","b","c"]').toString("base64url");
    const signed = createHmac("sha256", "secret").update(encoded).digest().subarray(0, 16).toString("base64url");
    expect(await verifyToken(`${encoded}.${signed}`, "secret")).toBeNull();
  });
});

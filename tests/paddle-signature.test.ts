import { describe, expect, it } from "vitest";
import { verifyPaddleSignature } from "../lib/core/billing/paddle-signature";
import vectors from "./golden/paddle-signature.json";

describe("Paddle 서명 골든 벡터", () => {
  it.each(vectors)("UTF-8 원문 서명을 검증한다: $ts", async (vector) => {
    expect(await verifyPaddleSignature(vector, vector.secret, { nowSeconds: vector.ts })).toBe(
      true,
    );
    expect(
      await verifyPaddleSignature({ ...vector, rawBody: `${vector.rawBody} ` }, vector.secret, {
        nowSeconds: vector.ts,
      }),
    ).toBe(false);
    expect(await verifyPaddleSignature(vector, "wrong-secret", { nowSeconds: vector.ts })).toBe(
      false,
    );
  });

  it("키 교체 중 여러 h1 가운데 유효한 서명을 허용한다", async () => {
    const vector = vectors[0];
    if (!vector) throw new Error("Missing golden vector");
    expect(
      await verifyPaddleSignature(
        { ...vector, signature: `${vector.signature};h1=${"0".repeat(64)}` },
        vector.secret,
        { nowSeconds: vector.ts },
      ),
    ).toBe(true);
  });

  it.each([-6, 6])("기본 오차 밖의 과거·미래 %s초를 거절한다", async (offset) => {
    const vector = vectors[0];
    if (!vector) throw new Error("Missing golden vector");
    expect(
      await verifyPaddleSignature(vector, vector.secret, { nowSeconds: vector.ts + offset }),
    ).toBe(false);
    expect(
      await verifyPaddleSignature(vector, vector.secret, {
        nowSeconds: vector.ts + offset,
        toleranceSeconds: 10,
      }),
    ).toBe(true);
  });

  it.each([
    null,
    "",
    "ts=x;h1=abc",
    "ts=1;ts=2;h1=abc",
    "h1=abc",
    "ts=1",
    "ts=1;h1=abc;foo=x",
    "ts=1;h1=gg",
  ])("잘못된 헤더 %s를 거절한다", async (signature) => {
    expect(
      await verifyPaddleSignature({ rawBody: "{}", signature }, "test", { nowSeconds: 1 }),
    ).toBe(false);
  });
});

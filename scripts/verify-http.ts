import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { getCharacter } from "../lib/core/characters";
import { errorSchema, responseSchema } from "../lib/core/schema";
import { sharePayloadFromResult, verifyToken } from "../lib/core/share-token";

// Run against `bun run start`; the server and this script must share SHARE_TOKEN_SECRET.
const origin = process.env.VERIFY_ORIGIN ?? "http://localhost:3110";
const secret = process.env.SHARE_TOKEN_SECRET ?? "talktivity-development-only-secret-v1";
const invalidPageText = "이 결과는 찾을 수 없어요";
const sample = {
  conversation:
    "민수: 오늘 저녁에 파스타 먹으러 갈래?\n지수: 좋아! 네가 좋아하는 곳으로 가자 ㅋㅋ\n민수: 7시 어때? 내가 예약할게!\n지수: 완전 좋아 😊",
  relationship: "썸남/썸녀",
  mySpeaker: "민수",
};

function request(path: string, init: RequestInit = {}) {
  return fetch(`${origin}${path}`, { ...init, signal: AbortSignal.timeout(60_000) });
}
function postJson(path: string, body: unknown, ip: string) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}
function signRaw(json: string): string {
  const encoded = Buffer.from(json).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(encoded)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
  return `${encoded}.${signature}`;
}
async function expectInvalidShare(label: string, token: string) {
  const page = await request(`/r/${token}`);
  assert.equal(page.status, 200);
  assert.ok((await page.text()).includes(invalidPageText));
  const og = await request(`/api/og?token=${encodeURIComponent(token)}`);
  assert.equal(og.status, 400);
  console.log(`${label}: /r 200 invalid page=true; /api/og ${og.status}`);
}

async function verifyShare(label: string, response: Response) {
  assert.equal(response.status, 200);
  const { result, shareToken } = responseSchema.parse(await response.json());
  const verified = await verifyToken(shareToken, secret);
  assert.deepEqual(verified, sharePayloadFromResult(result));
  const name = getCharacter(result.typeCode).name;
  console.log(
    `${label}: 200; typeCode=${result.typeCode}; axes=${JSON.stringify(result.axes)}; confidence=${result.confidence}; badges=[${result.badges.join(",")}]; v2 token valid=true`,
  );

  const shared = await request(`/r/${shareToken}`, {
    headers: { "User-Agent": "facebookexternalhit/1.1" },
  });
  assert.equal(shared.status, 200);
  const html = await shared.text();
  assert.ok(html.includes(name));
  assert.match(html, /property="og:title"/);
  const image = html.match(/property="og:image" content="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&");
  assert.ok(image);
  const imageUrl = new URL(image);
  assert.equal(imageUrl.searchParams.get("token"), shareToken);
  console.log(`  GET /r/<token>: 200; name=${name}; og:image=true`);

  const og = await request(`${imageUrl.pathname}${imageUrl.search}`);
  assert.equal(og.status, 200);
  assert.equal(og.headers.get("content-type"), "image/png");
  const bytes = new Uint8Array(await og.arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(16), 1200);
  assert.equal(view.getUint32(20), 630);
  console.log("  GET /api/og: 200; image/png; 1200x630");
  return shareToken;
}

await verifyShare("POST /api/example", await postJson("/api/example", {}, "198.51.100.20"));
const token = await verifyShare(
  "POST /api/analyze (pasted text)",
  await postJson("/api/analyze", sample, "198.51.100.21"),
);

await expectInvalidShare("signed v1 token", signRaw('[1,"flirt",82,67,43,"a","b","c"]'));
const [payload = "", signature] = token.split(".");
const flipped = payload.endsWith("A") ? "B" : "A";
await expectInvalidShare("tampered v2 token", `${payload.slice(0, -1)}${flipped}.${signature}`);

for (const [label, body, code] of [
  ["malformed {}", {}, "INVALID_INPUT"],
  ["missing self speaker", { ...sample, mySpeaker: undefined }, "SPEAKER_REQUIRED"],
] as const) {
  const response = await postJson("/api/analyze", body, "198.51.100.22");
  assert.equal(response.status, 400);
  assert.equal(errorSchema.parse(await response.json()).error.code, code);
  console.log(`POST /api/analyze ${label}: 400; code=${code}`);
}

const statuses: number[] = [];
for (let i = 0; i < 4; i++)
  statuses.push((await postJson("/api/analyze", sample, "198.51.100.77")).status);
assert.deepEqual(statuses, [200, 200, 200, 429]);
console.log(`4 sequential POST /api/analyze from one IP: ${statuses.join(", ")}`);

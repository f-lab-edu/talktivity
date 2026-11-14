import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { $ } from "bun";
import { responseSchema } from "../lib/core/schema";
import { verifyToken } from "../lib/core/share-token";

const origin = "http://localhost:3000";
const sample = JSON.stringify({
  conversation: "민수: 오늘 저녁에 파스타 먹으러 갈래?\n지수: 좋아! 네가 좋아하는 곳으로 가자.",
  relationship: "썸남/썸녀",
  mySpeaker: "민수",
});
async function curl(args: readonly string[]) {
  const output = await $`curl -sS --max-time 60 ${args} -w ${"\n%{http_code}"}`.text();
  const boundary = output.lastIndexOf("\n");
  return { body: output.slice(0, boundary), status: Number(output.slice(boundary + 1)) };
}
await mkdir("artifacts", { recursive: true });
const analysis = await curl([
  "-H",
  "Content-Type: application/json",
  "-H",
  "x-forwarded-for: 198.51.100.21",
  "-d",
  sample,
  `${origin}/api/analyze`,
]);
assert.equal(analysis.status, 200);
const response = responseSchema.parse(JSON.parse(analysis.body));
assert.ok(await verifyToken(response.shareToken, "talktivity-development-only-secret-v1"));
await writeFile("artifacts/analyze.json", `${JSON.stringify(response, null, 2)}\n`);
console.log(
  `POST /api/analyze: ${analysis.status}; result=${response.result.characterId}; valid shareToken=true`,
);

const shared = await curl(["-A", "facebookexternalhit/1.1", `${origin}/r/${response.shareToken}`]);
assert.equal(shared.status, 200);
assert.match(shared.body, /property="og:title"/);
const image = shared.body
  .match(/property="og:image" content="([^"]+)"/)?.[1]
  ?.replaceAll("&amp;", "&");
assert.ok(image);
assert.ok(shared.body.includes("친구의 결과"));
console.log("GET /r/<token>: 200; og:title=true; og:image=true; 친구의 결과=true");
const png = await curl(["-D", "artifacts/og-headers.txt", "-o", "artifacts/og.png", image]);
assert.equal(png.status, 200);
const bytes = new Uint8Array(await Bun.file("artifacts/og.png").arrayBuffer());
assert.deepEqual([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(new DataView(bytes.buffer).getUint32(16), 1200);
assert.equal(new DataView(bytes.buffer).getUint32(20), 630);
console.log("GET OG image: 200; image/png; PNG signature valid; 1200x630");
const badToken = `A${response.shareToken.slice(1)}`;
const tampered = await curl([`${origin}/r/${badToken}`]);
assert.equal(tampered.status, 200);
assert.ok(tampered.body.includes("이 결과는 찾을 수 없어요"));
console.log("GET /r/<tampered-token>: 200; friendly error page=true");
const malformed = await curl([
  "-H",
  "Content-Type: application/json",
  "-d",
  "{}",
  `${origin}/api/analyze`,
]);
assert.equal(malformed.status, 400);
console.log("POST /api/analyze {}: 400; structured error=true");
const statuses: number[] = [];
for (let i = 0; i < 4; i++) {
  const response = await curl([
    "-H",
    "Content-Type: application/json",
    "-H",
    "x-forwarded-for: 198.51.100.77",
    "-d",
    sample,
    `${origin}/api/analyze`,
  ]);
  statuses.push(response.status);
}
assert.deepEqual(statuses, [...Array<number>(3).fill(200), 429]);
console.log(`4 rapid POST /api/analyze: ${statuses.join(", ")}`);

import { z } from "zod";
import {
  type AnalysisResult,
  axisScoreSchema,
  axisScoresSchema,
  badgeIdsSchema,
  roastSchema,
  typeCodeSchema,
} from "./schema";

// Only shareable fields: no conversation, axis reasons, reading or sample size.
export const sharePayloadV2Schema = z
  .object({
    typeCode: typeCodeSchema,
    axes: axisScoresSchema,
    badges: badgeIdsSchema,
    roastLines: roastSchema,
  })
  .strict();
export type SharePayloadV2 = z.infer<typeof sharePayloadV2Schema>;
// Canonical wire tuple: [2, typeCode, direction, length, color, stance, badges, roast1, roast2, roast3].
const tupleSchema = z.tuple([
  z.literal(2),
  typeCodeSchema,
  axisScoreSchema,
  axisScoreSchema,
  axisScoreSchema,
  axisScoreSchema,
  badgeIdsSchema,
  z.string(),
  z.string(),
  z.string(),
]);
const encoder = new TextEncoder();
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (c) =>
    c.charCodeAt(0),
  );
}
async function signature(payload: string, secret: string): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))).slice(
    0,
    16,
  );
}
export function sharePayloadFromResult(result: AnalysisResult): SharePayloadV2 {
  return {
    typeCode: result.typeCode,
    axes: result.axes,
    badges: result.badges,
    roastLines: result.roastLines,
  };
}
export async function signToken(value: SharePayloadV2, secret: string): Promise<string> {
  const { typeCode, axes, badges, roastLines } = sharePayloadV2Schema.parse(value);
  const encoded = base64url(
    encoder.encode(
      JSON.stringify([
        2,
        typeCode,
        axes.direction,
        axes.length,
        axes.color,
        axes.stance,
        badges,
        ...roastLines,
      ]),
    ),
  );
  return `${encoded}.${base64url(await signature(encoded, secret))}`;
}
export async function verifyToken(token: string, secret: string): Promise<SharePayloadV2 | null> {
  if (token.length > 3000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{22}$/.test(token)) return null;
  const [encoded, signed] = token.split(".");
  if (!encoded || !signed) return null;
  const expected = await signature(encoded, secret);
  const actual = decode(signed);
  if (base64url(actual) !== signed) return null;
  let difference = expected.length ^ actual.length;
  for (let i = 0; i < expected.length; i++) difference |= (expected[i] ?? 0) ^ (actual[i] ?? 0);
  if (difference !== 0) return null;
  try {
    const bytes = decode(encoded);
    if (base64url(bytes) !== encoded) return null;
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const tuple = tupleSchema.safeParse(JSON.parse(text));
    if (!tuple.success || JSON.stringify(tuple.data) !== text) return null;
    const [, typeCode, direction, length, color, stance, badges, a, b, c] = tuple.data;
    const payload = sharePayloadV2Schema.safeParse({
      typeCode,
      axes: { direction, length, color, stance },
      badges,
      roastLines: [a, b, c],
    });
    return payload.success ? payload.data : null;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof DOMException)
      return null;
    throw error;
  }
}

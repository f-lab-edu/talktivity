import { z } from "zod";
import { characterIds } from "./characters";
import { type AnalysisResult, roastSchema, statsSchema } from "./schema";

export const sharePayloadSchema = z
  .object({
    version: z.literal(1),
    characterId: z.enum(characterIds),
    stats: statsSchema,
    roastLines: roastSchema,
  })
  .strict();
export type SharePayload = z.infer<typeof sharePayloadSchema>;
const tupleSchema = z.tuple([
  z.literal(1),
  z.enum(characterIds),
  z.number().int().min(0).max(100),
  z.number().int().min(0).max(100),
  z.number().int().min(0).max(100),
  z.string().min(1).max(60),
  z.string().min(1).max(60),
  z.string().min(1).max(60),
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
export function toSharePayload(result: AnalysisResult): SharePayload {
  return {
    version: 1,
    characterId: result.characterId,
    stats: result.stats,
    roastLines: result.roastLines,
  };
}
export async function signToken(value: SharePayload, secret: string): Promise<string> {
  const payload = sharePayloadSchema.parse(value);
  const { initiative, replyPsychology, pushPull } = payload.stats;
  const encoded = base64url(
    encoder.encode(
      JSON.stringify([
        1,
        payload.characterId,
        initiative,
        replyPsychology,
        pushPull,
        ...payload.roastLines,
      ]),
    ),
  );
  return `${encoded}.${base64url(await signature(encoded, secret))}`;
}
export async function verifyToken(token: string, secret: string): Promise<SharePayload | null> {
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
    const json: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    const parsed = tupleSchema.safeParse(json);
    if (!parsed.success || JSON.stringify(parsed.data) !== new TextDecoder().decode(bytes))
      return null;
    const [version, characterId, initiative, replyPsychology, pushPull, a, b, c] = parsed.data;
    return {
      version,
      characterId,
      stats: { initiative, replyPsychology, pushPull },
      roastLines: [a, b, c],
    };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError || error instanceof DOMException)
      return null;
    throw error;
  }
}

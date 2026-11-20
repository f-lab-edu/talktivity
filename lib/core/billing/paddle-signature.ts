type SignedBody = { readonly rawBody: string; readonly signature: string | null };
type VerificationClock = { readonly nowSeconds?: number; readonly toleranceSeconds?: number };
const encoder = new TextEncoder();

export async function verifyPaddleSignature(
  body: SignedBody,
  secret: string,
  clock: VerificationClock = {},
): Promise<boolean> {
  if (!body.signature || !secret) return false;
  const parts = body.signature.split(";").map((part) => part.trim());
  const timestamps = parts.filter((part) => part.startsWith("ts="));
  const timestamp = timestamps[0]?.slice(3);
  const signatures = parts.filter((part) => part.startsWith("h1=")).map((part) => part.slice(3));
  if (
    timestamps.length !== 1 ||
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    signatures.length === 0 ||
    signatures.some((value) => !/^[a-f\d]{64}$/.test(value)) ||
    parts.some((part) => !part.startsWith("ts=") && !part.startsWith("h1="))
  )
    return false;
  const seconds = Number(timestamp);
  if (
    !Number.isSafeInteger(seconds) ||
    Math.abs((clock.nowSeconds ?? Date.now() / 1000) - seconds) > (clock.toleranceSeconds ?? 5)
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const payload = encoder.encode(`${timestamp}:${body.rawBody}`);
  // Web Crypto verifies the full digest in its native constant-time implementation.
  const matches = await Promise.all(
    signatures.map((hex) =>
      crypto.subtle.verify(
        "HMAC",
        key,
        Uint8Array.from(hex.match(/../g) ?? [], (byte) => Number.parseInt(byte, 16)),
        payload,
      ),
    ),
  );
  return matches.some(Boolean);
}

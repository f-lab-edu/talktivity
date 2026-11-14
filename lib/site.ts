export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export function resultUrl(token: string): string {
  return new URL(`/r/${token}`, siteUrl).toString();
}
export function imageUrl(token: string): string {
  return new URL(`/api/og?token=${encodeURIComponent(token)}`, siteUrl).toString();
}

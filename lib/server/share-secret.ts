export class ShareConfigurationError extends Error {
  constructor() {
    super("운영 환경에는 SHARE_TOKEN_SECRET이 필요합니다.");
    this.name = "ShareConfigurationError";
  }
}
let warned = false;
export function shareSecret(): string {
  const secret = process.env.SHARE_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new ShareConfigurationError();
  if (!warned) {
    console.warn("SHARE_TOKEN_SECRET 미설정: 개발용 고정 비밀키를 사용합니다.");
    warned = true;
  }
  return "talktivity-development-only-secret-v1";
}

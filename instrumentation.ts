export async function register() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { shareSecret } = await import("./lib/server/share-secret");
    shareSecret();
  }
}

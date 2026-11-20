import { authenticate } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { upsertProfile } from "@/lib/server/profiles";

export async function GET(request: Request) {
  try {
    const user = await authenticate(request);
    if (user instanceof Response) return user;
    await upsertProfile(user);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    console.error(`/api/me failed: ${error.name}`);
    return apiError(
      "PROFILE_FAILED",
      "내 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
      500,
      {
        "Cache-Control": "no-store",
      },
    );
  }
}

import { expect, it, vi } from "vitest";
import { billingHarness, reportId } from "./helpers/billing";

vi.mock("server-only", () => ({}));
const wire = billingHarness();
const handlers = [
  ["credits", async () => (await import("../app/api/credits/route")).GET],
  ["checkout", async () => (await import("../app/api/billing/checkout/route")).POST],
  ["coupon", async () => (await import("../app/api/coupons/redeem/route")).POST],
  ["report create", async () => (await import("../app/api/reports/route")).POST],
  ["report list", async () => (await import("../app/api/reports/route")).GET],
  [
    "report detail",
    async () => {
      const { GET } = await import("../app/api/reports/[id]/route");
      return (request: Request) => GET(request, { params: Promise.resolve({ id: reportId }) });
    },
  ],
] as const;

it.each(handlers)("%s는 인증 없이 외부 저장소에 접근하지 않는다", async (_name, load) => {
  const handle = await load();
  const response = await handle(new Request("https://app.example/api/private"));
  expect(response.status).toBe(401);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(wire.requests).toHaveLength(0);
});

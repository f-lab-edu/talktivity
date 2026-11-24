import { mkdir, rm, writeFile } from "node:fs/promises";
import { z } from "zod";
import { meResponseSchema } from "../lib/core/auth";
import {
  checkoutRequestSchema,
  checkoutResponseSchema,
  creditsResponseSchema,
  reportResponseSchema,
  reportsListResponseSchema,
} from "../lib/core/billing/contracts";
import { couponRedeemRequestSchema, couponRedeemResponseSchema } from "../lib/core/billing/coupon";
import { paidReportSchema } from "../lib/core/billing/paid-report";
import { errorSchema, requestSchema, responseSchema, resultSchema } from "../lib/core/schema";
import { sharePayloadV2Schema } from "../lib/core/share-token";

await mkdir("contracts", { recursive: true });
for (const [name, schema] of Object.entries({
  "analyze-request": requestSchema,
  "analysis-result": resultSchema,
  "analyze-response": responseSchema,
  "api-error": errorSchema,
  "share-payload-v2": sharePayloadV2Schema,
  "me-response": meResponseSchema,
  "credits-response": creditsResponseSchema,
  "checkout-request": checkoutRequestSchema,
  "checkout-response": checkoutResponseSchema,
  "coupon-redeem-request": couponRedeemRequestSchema,
  "coupon-redeem-response": couponRedeemResponseSchema,
  "report-response": reportResponseSchema,
  "reports-list-response": reportsListResponseSchema,
  "paid-report": paidReportSchema,
})) {
  await writeFile(`contracts/${name}.json`, `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`);
}
await rm("contracts/share-payload-v1.json", { force: true });

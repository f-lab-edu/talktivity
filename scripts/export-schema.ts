import { mkdir, rm, writeFile } from "node:fs/promises";
import { z } from "zod";
import { meResponseSchema } from "../lib/core/auth";
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
})) {
  await writeFile(`contracts/${name}.json`, `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`);
}
await rm("contracts/share-payload-v1.json", { force: true });

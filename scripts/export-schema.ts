import { mkdir, writeFile } from "node:fs/promises";
import { z } from "zod";
import { errorSchema, requestSchema, responseSchema, resultSchema } from "../lib/core/schema";
import { sharePayloadSchema } from "../lib/core/share-token";

await mkdir("contracts", { recursive: true });
for (const [name, schema] of Object.entries({
  "analyze-request": requestSchema, "analysis-result": resultSchema,
  "analyze-response": responseSchema, "api-error": errorSchema, "share-payload-v1": sharePayloadSchema,
})) {
  await writeFile(`contracts/${name}.json`, `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`);
}

import type { SharePayloadV2 } from "@/lib/core/share-token";

export function RoastRest({ roastLines }: { readonly roastLines: SharePayloadV2["roastLines"] }) {
  const [, ...rest] = roastLines;
  return (
    <div className="roast-rest">
      {rest.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

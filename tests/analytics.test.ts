import { describe, expect, it, vi } from "vitest";
import { axisBucket, redactShareTokens, track, typeAnalyticsProps } from "../lib/analytics";
import type { AxisScores, BadgeId, TypeCode } from "../lib/core/classification";

describe("axisBucket", () => {
  it.each([
    [0, "0-9"],
    [9, "0-9"],
    [10, "10-19"],
    [49, "40-49"],
    [50, "50-59"],
    [89, "80-89"],
    [90, "90-100"],
    [100, "90-100"],
    [-1, "0-9"],
    [101, "90-100"],
  ] as const)("maps score %i into bucket %s", (score, bucket) => {
    expect(axisBucket(score)).toBe(bucket);
  });
});

describe("typeAnalyticsProps", () => {
  it("returns only the privacy-safe analytics fields", () => {
    const props = typeAnalyticsProps({
      typeCode: "OBCG" satisfies TypeCode,
      axes: {
        direction: 72,
        length: 30,
        color: 88,
        stance: 55,
      } satisfies AxisScores,
      badges: ["comedian", "emoji"] satisfies readonly BadgeId[],
    });

    expect(props).toEqual({
      typeCode: "OBCG",
      badges: ["comedian", "emoji"],
      direction: "70-79",
      length: "30-39",
      color: "80-89",
      stance: "50-59",
    });
    expect(Object.keys(props).sort()).toEqual([
      "badges",
      "color",
      "direction",
      "length",
      "stance",
      "typeCode",
    ]);
  });

  it("drops private fields from cast result analytics payloads", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();

    const captured: unknown[][] = [];
    const debugSpy = vi.spyOn(console, "debug").mockImplementation((...args) => {
      captured.push(args);
    });

    try {
      const { track: freshTrack } = await import("../lib/analytics");
      const props = typeAnalyticsProps({
        typeCode: "OBCG",
        axes: { direction: 72, length: 30, color: 88, stance: 55 },
        badges: ["comedian", "emoji"],
      });
      const unsafeProps = {
        ...props,
        conversation: "private conversation",
        axisReasons: { direction: "private reason" },
        reading: { loveFortune: "private reading" },
        sampleSize: 12,
        rawScore: 99,
      } as typeof props;

      freshTrack("result_view", unsafeProps);

      expect(captured).toEqual([
        [
          "[분석 이벤트]",
          "result_view",
          {
            typeCode: "OBCG",
            badges: ["comedian", "emoji"],
            direction: "70-79",
            length: "30-39",
            color: "80-89",
            stance: "50-59",
          },
        ],
      ]);
    } finally {
      debugSpy.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("redactShareTokens", () => {
  it("masks share tokens in every SDK-added URL property before sending", () => {
    const token = "WzIsIk9CQ0ciLDcyXQ.abcDEF_-123";
    const url = `https://talktivity.example/r/${token}?utm=kakao`;
    const event = redactShareTokens({
      event: "shared_page_view",
      properties: {
        $current_url: url,
        $pathname: `/r/${token}`,
        $session_entry_url: url,
        $referrer: "https://talktivity.example/",
        typeCode: "OBCG",
        direction: "70-79",
      },
      $set_once: { $initial_current_url: url, $initial_pathname: `/r/${token}` },
      $set: { $current_url: url },
    });

    expect(JSON.stringify(event)).not.toContain(token);
    expect(event?.properties).toEqual({
      $current_url: "https://talktivity.example/r/[redacted]?utm=kakao",
      $pathname: "/r/[redacted]",
      $session_entry_url: "https://talktivity.example/r/[redacted]?utm=kakao",
      $referrer: "https://talktivity.example/",
      typeCode: "OBCG",
      direction: "70-79",
    });
    expect(event?.$set_once?.$initial_pathname).toBe("/r/[redacted]");
  });

  it("passes a dropped event through", () => {
    expect(redactShareTokens(null)).toBeNull();
  });
});

const compileTimePrivacyContract = (props: ReturnType<typeof typeAnalyticsProps>): void => {
  const unsafeProps = {
    ...props,
    conversation: "private conversation",
    axisReasons: { direction: "private reason" },
    reading: { loveFortune: "private reading" },
    sampleSize: 12,
    rawScore: 99,
  };

  // @ts-expect-error Axis reasons are excluded from result analytics.
  track("result_view", unsafeProps);
};
void compileTimePrivacyContract;

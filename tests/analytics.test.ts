import { describe, expect, it, vi } from "vitest";
import {
  axisBucket,
  nextInternalFlag,
  redactShareTokens,
  track,
  typeAnalyticsProps,
} from "../lib/analytics";
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

describe("track", () => {
  it("로그인 이벤트에서 ID와 닉네임을 제거한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const { track: freshTrack } = await import("../lib/analytics");
      for (const event of ["login_start", "login_success"]) {
        Reflect.apply(freshTrack, undefined, [
          event,
          {
            provider: "kakao",
            id: "private-id",
            nickname: "private-name",
          },
        ]);
      }
      Reflect.apply(freshTrack, undefined, [
        "login_dialog_view",
        {
          tier: 1900,
          id: "private-id",
          nickname: "private-name",
        },
      ]);
      Reflect.apply(freshTrack, undefined, [
        "logout",
        {
          id: "private-id",
          nickname: "private-name",
        },
      ]);
      expect(debug.mock.calls).toEqual([
        ["[분석 이벤트]", "login_start", { provider: "kakao" }],
        ["[분석 이벤트]", "login_success", { provider: "kakao" }],
        ["[분석 이벤트]", "login_dialog_view", { tier: 1900 }],
        ["[분석 이벤트]", "logout", {}],
      ]);
    } finally {
      debug.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("passes tier and placement for paywall_teaser_view", async () => {
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
      const props = { tier: 1900, placement: "result", variant: "extra" } as const;

      freshTrack("paywall_teaser_view", props as { tier: 1900; placement: "result" });

      expect(captured).toEqual([
        ["[분석 이벤트]", "paywall_teaser_view", { tier: 1900, placement: "result" }],
      ]);
    } finally {
      debugSpy.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("track analyze_submit", () => {
  it.each(["text", "screenshot"] as const)("passes only source %s", async (source) => {
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
      const props = { source, conversation: "private" } as { source: typeof source };

      freshTrack("analyze_submit", props);

      expect(captured).toEqual([["[분석 이벤트]", "analyze_submit", { source }]]);
    } finally {
      debugSpy.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("nextInternalFlag", () => {
  it.each([
    ["?internal=1", false, true],
    ["?internal=1", true, true],
    ["?internal=0", true, false],
    ["?internal=0", false, false],
    ["", true, true],
    ["", false, false],
    ["?utm=kakao&ref=1", true, true],
    ["?utm=kakao&ref=1", false, false],
    ["?internal=yes", true, true],
  ] as const)("search %j with stored %s gives %s", (search, stored, expected) => {
    expect(nextInternalFlag(search, stored)).toBe(expected);
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

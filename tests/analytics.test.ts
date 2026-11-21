import { describe, expect, it, vi } from "vitest";
import {
  axisBucket,
  nextInternalFlag,
  redactShareTokens,
  track,
  typeAnalyticsProps,
} from "../lib/analytics";
import type { AxisScores, BadgeId, TypeCode } from "../lib/core/classification";
import { relationshipAnalyticsValue } from "../lib/core/schema";

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
          tier: 4900,
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
        ["[분석 이벤트]", "login_dialog_view", { tier: 4900 }],
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

describe("track 결제·리포트 이벤트", () => {
  it("허용된 속성만 전송한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const { track: freshTrack } = await import("../lib/analytics");
      const leaked = { id: "private-id", conversation: "private" };
      Reflect.apply(freshTrack, undefined, ["coupon_redeem_success", { credited: 5, ...leaked }]);
      Reflect.apply(freshTrack, undefined, [
        "coupon_redeem_error",
        { code: "COUPON_EXPIRED", ...leaked },
      ]);
      Reflect.apply(freshTrack, undefined, [
        "report_generate_error",
        { code: "INSUFFICIENT_CREDITS", ...leaked },
      ]);
      Reflect.apply(freshTrack, undefined, ["report_view", { source: "list", ...leaked }]);
      Reflect.apply(freshTrack, undefined, ["checkout_start", leaked]);
      expect(debug.mock.calls).toEqual([
        ["[분석 이벤트]", "coupon_redeem_success", { credited: 5 }],
        ["[분석 이벤트]", "coupon_redeem_error", { code: "COUPON_EXPIRED" }],
        ["[분석 이벤트]", "report_generate_error", { code: "INSUFFICIENT_CREDITS" }],
        ["[분석 이벤트]", "report_view", { source: "list" }],
        ["[분석 이벤트]", "checkout_start", {}],
      ]);
    } finally {
      debug.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("track 상대 대화 온도 이벤트", () => {
  it("result_view는 온도가 있을 때만 온도 속성을 보내고 다른 이벤트는 허용된 속성만 보낸다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const { track: freshTrack } = await import("../lib/analytics");
      const base = typeAnalyticsProps({
        typeCode: "OBCG",
        axes: { direction: 72, length: 30, color: 88, stance: 55 },
        badges: [],
      });
      freshTrack("result_view", { ...base, partner_temperature: 3, temperature_source: "code" });
      freshTrack("result_view", base);
      freshTrack("shared_page_view", base);
      freshTrack("temperature_fallback");
      Reflect.apply(freshTrack, undefined, [
        "temperature_detail_click",
        { level: 4, reason: "private reason" },
      ]);
      expect(debug.mock.calls).toEqual([
        [
          "[분석 이벤트]",
          "result_view",
          { ...base, partner_temperature: 3, temperature_source: "code" },
        ],
        ["[분석 이벤트]", "result_view", base],
        ["[분석 이벤트]", "shared_page_view", base],
        ["[분석 이벤트]", "temperature_fallback", {}],
        ["[분석 이벤트]", "temperature_detail_click", { level: 4 }],
      ]);
    } finally {
      debug.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("track 공유 퀴즈 이벤트", () => {
  it("허용된 속성만 전송한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const { track: freshTrack } = await import("../lib/analytics");
      const leaked = { typeCode: "OBCG", pick: "RBMG" };
      Reflect.apply(freshTrack, undefined, ["shared_quiz_answer", { correct: true, ...leaked }]);
      Reflect.apply(freshTrack, undefined, ["shared_quiz_skip", leaked]);
      Reflect.apply(freshTrack, undefined, [
        "shared_page_cta_click",
        { answered: false, ...leaked },
      ]);
      expect(debug.mock.calls).toEqual([
        ["[분석 이벤트]", "shared_quiz_answer", { correct: true }],
        ["[분석 이벤트]", "shared_quiz_skip", {}],
        ["[분석 이벤트]", "shared_page_cta_click", { answered: false }],
      ]);
    } finally {
      debug.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("track analyze_submit", () => {
  it.each([
    ["text", "썸", "썸"],
    ["screenshot", "직장 동료", "직장 동료"],
    ["text", "개인적인 관계", "custom"],
    ["screenshot", "개인적인 관계", "custom"],
  ] as const)("passes source %s and safe relationship for %s", async (source, input, expected) => {
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
      const props = {
        source,
        relationship: relationshipAnalyticsValue(input),
        conversation: "private",
      };
      const allowedProps: Pick<typeof props, "source" | "relationship"> = props;

      freshTrack("analyze_submit", allowedProps);

      expect(captured).toEqual([
        ["[분석 이벤트]", "analyze_submit", { source, relationship: expected }],
      ]);
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

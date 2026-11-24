import { describe, expect, it, vi } from "vitest";
import {
  axisBucket,
  nextInternalFlag,
  redactShareTokens,
  track,
  typeAnalyticsProps,
} from "../lib/analytics";
import type { AxisScores, BadgeId, TypeCode } from "../lib/core/classification";
import { exampleResult } from "../lib/core/example";
import { relationshipAnalyticsValue } from "../lib/core/schema";
import { flowReducer, restoreFlow } from "../lib/flow";

describe("entry attribution", () => {
  it.each([
    ["before", "shared", "types"],
    ["after", "shared", "types"],
    ["before", "types", "shared"],
    ["after", "types", "shared"],
  ] as const)(
    "registers %s initialization with entry %s replacing %s, including reload",
    async (timing, entry, previous) => {
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "test-key");
      vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://analytics.example");
      vi.resetModules();
      const stored = new Map<string, string>([["talktivity:entry", previous]]);
      const posthog = {
        init: vi.fn(),
        register: vi.fn(),
        capture: vi.fn(),
        get_distinct_id: () => "test-id",
      };
      vi.doMock("posthog-js", () => ({ default: posthog }));
      const history = { state: { preserved: true }, replaceState: vi.fn() };
      const location = new URL(`https://talktivity.example/?utm=kakao&from=${entry}#start`);
      vi.stubGlobal("window", {
        location,
        history,
        sessionStorage: {
          getItem: (key: string) => stored.get(key) ?? null,
          setItem: (key: string, value: string) => stored.set(key, value),
        },
        localStorage: { getItem: () => null },
      });
      try {
        const analytics = await import("../lib/analytics");
        if (timing === "after") await analytics.analyticsDistinctId();
        analytics.captureEntry();
        analytics.track("landing_view");
        await analytics.analyticsDistinctId();
        expect(stored.get("talktivity:entry")).toBe(entry);
        expect(history.replaceState).toHaveBeenCalledWith(history.state, "", "/?utm=kakao#start");
        expect(posthog.register).toHaveBeenLastCalledWith({ entry });
        expect(posthog.register.mock.invocationCallOrder.at(-1)).toBeLessThan(
          posthog.capture.mock.invocationCallOrder[0] ?? 0,
        );

        posthog.register.mockClear();
        location.search = "";
        vi.resetModules();
        const reloaded = await import("../lib/analytics");
        await reloaded.analyticsDistinctId();
        expect(posthog.register).toHaveBeenCalledWith({ entry });
        expect(posthog.init).toHaveBeenLastCalledWith(
          "test-key",
          expect.objectContaining({ persistence: "memory" }),
        );
      } finally {
        vi.doUnmock("posthog-js");
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.resetModules();
      }
    },
  );

  it.each(["", "unknown", "shared-token"])("ignores invalid from=%s", async (value) => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const setItem = vi.fn();
    const replaceState = vi.fn();
    vi.stubGlobal("window", {
      location: new URL(`https://talktivity.example/?from=${value}#keep`),
      sessionStorage: { setItem },
      history: { replaceState },
    });
    try {
      const { captureEntry } = await import("../lib/analytics");
      captureEntry();
      expect(setItem).not.toHaveBeenCalled();
      expect(replaceState).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("restored funnel state", () => {
  const data = { result: exampleResult, shareToken: "test-token" };

  it.each([
    [JSON.stringify(data), null, "result"],
    [null, "input", "input"],
    [null, null, "landing"],
    ["invalid JSON", null, "landing"],
    ["{}", null, "landing"],
  ] as const)("restores %s / %s to %s before landing tracking", (result, step, expected) => {
    const state = restoreFlow(result, step);
    expect(state.step).toBe(expected);
    if (state.step === "result") expect(state.origin).toBe("restored");
  });

  it.each(["analysis", "example"] as const)("keeps result origin %s", (origin) => {
    const state = flowReducer(
      { step: "loading", stage: "analyze" },
      { type: "result", data, origin },
    );
    expect(state).toEqual({ step: "result", data, origin });
  });
});

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
  it("keeps result origin and capture count while stripping unknown properties", async () => {
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
      for (const origin of ["analysis", "example", "restored"]) {
        Reflect.apply(freshTrack, undefined, [
          "result_view",
          { ...base, origin, conversation: "private", count: 3 },
        ]);
      }
      Reflect.apply(freshTrack, undefined, [
        "capture_select",
        { count: 2, origin: "analysis", filename: "private.png" },
      ]);
      expect(debug.mock.calls).toEqual([
        ["[분석 이벤트]", "result_view", { ...base, origin: "analysis" }],
        ["[분석 이벤트]", "result_view", { ...base, origin: "example" }],
        ["[분석 이벤트]", "result_view", { ...base, origin: "restored" }],
        ["[분석 이벤트]", "capture_select", { count: 2 }],
      ]);
    } finally {
      debug.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

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

describe("track 유형 도감 이벤트", () => {
  it("types_cta_click은 유형 코드만 전송한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const { track: freshTrack } = await import("../lib/analytics");
      Reflect.apply(freshTrack, undefined, ["types_cta_click", { code: "OBCG", name: "private" }]);
      expect(debug.mock.calls).toEqual([["[분석 이벤트]", "types_cta_click", { code: "OBCG" }]]);
    } finally {
      debug.mockRestore();
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("types_entry_click은 진입 위치만 전송한다", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "");
    vi.resetModules();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    try {
      const { track: freshTrack } = await import("../lib/analytics");
      for (const source of ["header", "result", "landing"])
        Reflect.apply(freshTrack, undefined, ["types_entry_click", { source, code: "OBCG" }]);
      expect(debug.mock.calls).toEqual([
        ["[분석 이벤트]", "types_entry_click", { source: "header" }],
        ["[분석 이벤트]", "types_entry_click", { source: "result" }],
        ["[분석 이벤트]", "types_entry_click", { source: "landing" }],
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

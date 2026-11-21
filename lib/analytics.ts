"use client";

import type { AxisScores, BadgeId, TypeCode } from "@/lib/core/classification";
import type { relationshipAnalyticsValue } from "@/lib/core/schema";

export type AxisBucket =
  | "0-9"
  | "10-19"
  | "20-29"
  | "30-39"
  | "40-49"
  | "50-59"
  | "60-69"
  | "70-79"
  | "80-89"
  | "90-100";

type TypeAnalyticsProps = {
  typeCode: TypeCode;
  badges: BadgeId[];
  direction: AxisBucket;
  length: AxisBucket;
  color: AxisBucket;
  stance: AxisBucket;
};

export function axisBucket(score: number): AxisBucket {
  const clampedScore = Math.max(0, Math.min(100, score));
  if (clampedScore < 10) return "0-9";
  if (clampedScore < 20) return "10-19";
  if (clampedScore < 30) return "20-29";
  if (clampedScore < 40) return "30-39";
  if (clampedScore < 50) return "40-49";
  if (clampedScore < 60) return "50-59";
  if (clampedScore < 70) return "60-69";
  if (clampedScore < 80) return "70-79";
  if (clampedScore < 90) return "80-89";
  return "90-100";
}

export function typeAnalyticsProps(input: {
  typeCode: TypeCode;
  axes: AxisScores;
  badges: readonly BadgeId[];
}): TypeAnalyticsProps {
  return {
    typeCode: input.typeCode,
    badges: [...input.badges],
    direction: axisBucket(input.axes.direction),
    length: axisBucket(input.axes.length),
    color: axisBucket(input.axes.color),
    stance: axisBucket(input.axes.stance),
  };
}

type ResultViewProps = TypeAnalyticsProps & {
  readonly partner_temperature?: number;
  readonly temperature_source?: "llm" | "code";
};

type EventProps = {
  readonly landing_view: undefined;
  readonly cta_click: { readonly variant: "main" | "example" };
  readonly input_mode_text: undefined;
  readonly extract_submit: { readonly count: number };
  readonly extract_success: undefined;
  readonly extract_error: { readonly code: string };
  readonly analyze_submit: {
    readonly source: "text" | "screenshot";
    readonly relationship: ReturnType<typeof relationshipAnalyticsValue>;
  };
  readonly analyze_success: undefined;
  readonly analyze_error: { readonly code: string };
  readonly result_view: ResultViewProps;
  readonly share_kakao_click: undefined;
  readonly share_link_copy: undefined;
  readonly image_save: { readonly method: string };
  // `tier` is the product price in won (4900 for the fallback card).
  readonly paywall_teaser_view: { readonly tier: number; readonly placement: "result" };
  readonly paywall_teaser_click: { readonly tier: number };
  readonly login_dialog_view: { readonly tier: number };
  readonly login_start: { readonly provider: "kakao" | "google" };
  readonly login_success: { readonly provider: "kakao" | "google" };
  readonly logout: undefined;
  readonly checkout_start: undefined;
  readonly checkout_close: undefined;
  readonly checkout_complete: undefined;
  readonly coupon_redeem_success: { readonly credited: number };
  readonly coupon_redeem_error: { readonly code: string };
  readonly report_generate_start: undefined;
  readonly report_generate_success: undefined;
  readonly report_generate_error: { readonly code: string };
  readonly report_view: { readonly source: "inline" | "list" };
  readonly shared_page_view: TypeAnalyticsProps;
  readonly shared_page_cta_click: { readonly answered: boolean };
  readonly shared_quiz_answer: { readonly correct: boolean };
  readonly shared_quiz_skip: undefined;
  readonly temperature_fallback: undefined;
  readonly temperature_detail_click: { readonly level: number };
};
type EventName = keyof EventProps;
type EventWithProps = {
  [Event in EventName]: EventProps[Event] extends undefined ? never : Event;
}[EventName];
type EventWithoutProps = Exclude<EventName, EventWithProps>;
type EventPropertyAllowlist = {
  readonly [Event in EventName]: EventProps[Event] extends undefined
    ? readonly []
    : readonly (keyof EventProps[Event])[];
};
const eventPropertyAllowlist = {
  landing_view: [],
  cta_click: ["variant"],
  input_mode_text: [],
  extract_submit: ["count"],
  extract_success: [],
  extract_error: ["code"],
  analyze_submit: ["source", "relationship"],
  analyze_success: [],
  analyze_error: ["code"],
  result_view: [
    "typeCode",
    "badges",
    "direction",
    "length",
    "color",
    "stance",
    "partner_temperature",
    "temperature_source",
  ],
  share_kakao_click: [],
  share_link_copy: [],
  image_save: ["method"],
  paywall_teaser_view: ["tier", "placement"],
  paywall_teaser_click: ["tier"],
  login_dialog_view: ["tier"],
  login_start: ["provider"],
  login_success: ["provider"],
  logout: [],
  checkout_start: [],
  checkout_close: [],
  checkout_complete: [],
  coupon_redeem_success: ["credited"],
  coupon_redeem_error: ["code"],
  report_generate_start: [],
  report_generate_success: [],
  report_generate_error: ["code"],
  report_view: ["source"],
  shared_page_view: ["typeCode", "badges", "direction", "length", "color", "stance"],
  shared_page_cta_click: ["answered"],
  shared_quiz_answer: ["correct"],
  shared_quiz_skip: [],
  temperature_fallback: [],
  temperature_detail_click: ["level"],
} as const satisfies EventPropertyAllowlist;

// Share tokens embed generated copy, so they are masked in every URL-like value the SDK adds.
const shareTokenPath = /\/r\/[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?/g;

function redactValues(values: Record<string, unknown> | undefined): void {
  if (!values) return;
  for (const [name, value] of Object.entries(values))
    if (typeof value === "string") values[name] = value.replace(shareTokenPath, "/r/[redacted]");
}

export function redactShareTokens<
  E extends {
    properties?: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  },
>(event: E | null): E | null {
  if (!event) return event;
  redactValues(event.properties);
  redactValues(event.$set);
  redactValues(event.$set_once);
  return event;
}

const internalStorageKey = "talktivity:internal";

// `?internal=1` marks this device as internal, `?internal=0` clears it, anything else keeps the stored state.
export function nextInternalFlag(search: string, stored: boolean): boolean {
  const requested = new URLSearchParams(search).get("internal");
  if (requested === "1") return true;
  if (requested === "0") return false;
  return stored;
}

function resolveInternalTraffic(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(internalStorageKey) === "1";
    const next = nextInternalFlag(window.location.search, stored);
    if (next !== stored) window.localStorage.setItem(internalStorageKey, next ? "1" : "0");
    return next;
  } catch (error) {
    // Safari private mode and blocked storage throw a DOMException; treat the device as external.
    if (error instanceof DOMException) return false;
    throw error;
  }
}

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const client =
  key && host
    ? import("posthog-js").then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: host,
          autocapture: false,
          capture_pageview: false,
          capture_pageleave: false,
          disable_session_recording: true,
          persistence: "memory",
          before_send: redactShareTokens,
        });
        if (resolveInternalTraffic()) posthog.register({ internal: true });
        return posthog;
      })
    : null;

// Checkout carries this id so the server-side payment event joins the same PostHog person.
export async function analyticsDistinctId(): Promise<string | undefined> {
  return client ? (await client).get_distinct_id() : undefined;
}

export function track<E extends EventWithoutProps>(event: E): void;
export function track<E extends EventWithProps, P extends EventProps[E]>(
  event: E,
  props: P & Record<Exclude<keyof P, keyof EventProps[E]>, never>,
): void;
export function track(event: EventName, props?: Record<string, unknown>): void {
  const payload =
    props === undefined
      ? undefined
      : eventPropertyAllowlist[event].reduce<Record<string, unknown>>((safeProps, property) => {
          if (Object.hasOwn(props, property)) safeProps[property] = props[property];
          return safeProps;
        }, {});

  if (client) void client.then((posthog) => posthog.capture(event, payload));
  else if (process.env.NODE_ENV === "development")
    console.debug("[분석 이벤트]", event, payload ?? {});
}

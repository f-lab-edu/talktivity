"use client";

import type { AxisScores, BadgeId, TypeCode } from "@/lib/core/classification";

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

type EventProps = {
  readonly landing_view: undefined;
  readonly cta_click: { readonly variant: "main" | "example" };
  readonly input_mode_text: undefined;
  readonly extract_submit: { readonly count: number };
  readonly extract_success: undefined;
  readonly extract_error: { readonly code: string };
  readonly analyze_submit: undefined;
  readonly analyze_success: undefined;
  readonly analyze_error: { readonly code: string };
  readonly result_view: TypeAnalyticsProps;
  readonly share_kakao_click: undefined;
  readonly share_link_copy: undefined;
  readonly image_save: { readonly method: string };
  readonly paywall_teaser_click: { readonly tier: 1000 | 1900 };
  readonly shared_page_view: TypeAnalyticsProps;
  readonly shared_page_cta_click: undefined;
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
  analyze_submit: [],
  analyze_success: [],
  analyze_error: ["code"],
  result_view: ["typeCode", "badges", "direction", "length", "color", "stance"],
  share_kakao_click: [],
  share_link_copy: [],
  image_save: ["method"],
  paywall_teaser_click: ["tier"],
  shared_page_view: ["typeCode", "badges", "direction", "length", "color", "stance"],
  shared_page_cta_click: [],
} as const satisfies EventPropertyAllowlist;

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
        });
        return posthog;
      })
    : null;

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

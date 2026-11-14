"use client";

type Events = {
  readonly landing_view: undefined;
  readonly cta_click: { readonly variant: "main" | "example" };
  readonly analyze_submit: undefined;
  readonly analyze_success: undefined;
  readonly analyze_error: { readonly code: string };
  readonly result_view: { readonly characterId: string };
  readonly share_kakao_click: undefined;
  readonly share_link_copy: undefined;
  readonly image_save: { readonly method: string };
  readonly paywall_teaser_click: { readonly tier: 1000 | 1900 };
  readonly shared_page_view: { readonly characterId: string };
  readonly shared_page_cta_click: undefined;
};
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
const client = key && host
  ? import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host, autocapture: false, capture_pageview: false,
        capture_pageleave: false, disable_session_recording: true, persistence: "memory",
      });
      return posthog;
    }) : null;

export function track<E extends keyof Events>(event: E, ...args: Events[E] extends undefined ? [] : [Events[E]]) {
  if (client) void client.then((posthog) => posthog.capture(event, args[0]));
  else if (process.env.NODE_ENV === "development") console.debug("[분석 이벤트]", event, args[0] ?? {});
}

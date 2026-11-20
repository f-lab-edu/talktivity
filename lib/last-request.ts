"use client";

import { type AnalysisRequest, requestSchema } from "@/lib/core/schema";

// The masked request exactly as it was sent to /api/analyze. It lives in this tab's sessionStorage
// only, so the paid report can be requested later without ever storing the conversation on the server.
const lastRequestKey = "talktivity:last-request";

export function saveLastRequest(request: AnalysisRequest) {
  try {
    sessionStorage.setItem(lastRequestKey, JSON.stringify(request));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

export function loadLastRequest(): AnalysisRequest | null {
  try {
    const saved = sessionStorage.getItem(lastRequestKey);
    if (!saved) return null;
    const parsed = requestSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return null;
  }
}

export function clearLastRequest() {
  try {
    sessionStorage.removeItem(lastRequestKey);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

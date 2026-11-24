"use client";

import { useEffect, useReducer, useRef } from "react";
import { InputStep, type ScreenshotSubmission } from "@/components/input-step";
import { LandingStep } from "@/components/landing-step";
import { LoadingStep } from "@/components/loading-step";
import { ResultStep } from "@/components/result-step";
import { type AnalysisStart, consumeLandingQuery, markStart, track } from "@/lib/analytics";
import { maskPII } from "@/lib/core/mask";
import {
  type AnalysisRequest,
  errorSchema,
  relationshipAnalyticsValue,
  requestSchema,
  responseSchema,
} from "@/lib/core/schema";
import { clearDraft } from "@/lib/draft";
import {
  type FlowState,
  flowReducer,
  homeEvent,
  restoreFlow,
  resultStorageKey,
  stepStorageKey,
} from "@/lib/flow";
import { clearLastRequest, saveLastRequest } from "@/lib/last-request";
import { compressScreenshot } from "@/lib/screenshot";

// Starting a new analysis drops the previous result so a reload reopens the input step.
function clearResult() {
  try {
    sessionStorage.removeItem(resultStorageKey);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
  clearLastRequest();
}

// The common first step of the analysis funnel, whichever button opened the input step.
function startAnalysis(start: AnalysisStart) {
  markStart(start);
  track("input_view");
}

export default function Home() {
  const [state, dispatch] = useReducer(flowReducer, { step: "landing" });
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    // The type guide's CTA links here with `step=input` to skip the landing step.
    if (consumeLandingQuery().openInput) {
      clearResult();
      startAnalysis("types");
      dispatch({ type: "input" });
      return () => activeRequest.current?.abort();
    }
    // Count a landing visit only when no input or result step is reopened after a reload.
    let restored: FlowState = { step: "landing" };
    try {
      restored = restoreFlow(
        sessionStorage.getItem(resultStorageKey),
        sessionStorage.getItem(stepStorageKey),
      );
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      // Unavailable storage leaves the landing page usable.
    }
    if (restored.step === "landing") track("landing_view");
    else dispatch({ type: "restore", state: restored });
    return () => activeRequest.current?.abort();
  }, []);
  useEffect(() => {
    const goHome = () => {
      activeRequest.current?.abort();
      dispatch({ type: "landing" });
    };
    window.addEventListener(homeEvent, goHome);
    return () => window.removeEventListener(homeEvent, goHome);
  }, []);
  useEffect(() => {
    if (state.step !== "landing") window.scrollTo(0, 0);
    // Returning from the KakaoTalk app may reload the tab; reopen the input step then.
    try {
      if (state.step === "input") sessionStorage.setItem(stepStorageKey, "input");
      else if (state.step !== "loading") sessionStorage.removeItem(stepStorageKey);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
  }, [state.step]);
  async function run(request?: AnalysisRequest, screenshots?: ScreenshotSubmission) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    let stage: "extract" | "analyze" = screenshots ? "extract" : "analyze";
    dispatch({ type: "loading", stage });
    try {
      let analysisRequest = request;
      if (screenshots) {
        track("extract_submit", { count: screenshots.files.length });
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(50_000)]);
        const form = new FormData();
        for (const [index, file] of screenshots.files.entries()) {
          const image = await compressScreenshot(file);
          signal.throwIfAborted();
          form.append("images", image, `capture-${index + 1}.jpg`);
        }
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/extract`, {
          method: "POST",
          body: form,
          signal,
        });
        const json: unknown = await response.json();
        controller.signal.throwIfAborted();
        if (!response.ok) {
          const parsed = errorSchema.safeParse(json);
          track("extract_error", { code: parsed.success ? parsed.data.error.code : "HTTP_ERROR" });
          dispatch({
            type: "error",
            message: parsed.success ? parsed.data.error.message : "캡처를 읽지 못했어요.",
          });
          return;
        }
        const conversation =
          typeof json === "object" && json !== null && "conversation" in json
            ? json.conversation
            : null;
        if (typeof conversation !== "string") throw new Error("Unexpected extract response");
        track("extract_success");
        const parsed = requestSchema.safeParse({
          conversation,
          relationship: screenshots.relationship,
          mySpeaker: "나",
        });
        if (!parsed.success) {
          dispatch({
            type: "error",
            message: parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.",
          });
          return;
        }
        analysisRequest = parsed.data;
        stage = "analyze";
        dispatch({ type: "loading", stage });
      }
      if (analysisRequest)
        track("analyze_submit", {
          source: screenshots ? "screenshot" : "text",
          relationship: relationshipAnalyticsValue(analysisRequest.relationship),
        });
      const body = analysisRequest
        ? {
            // Redaction preserves the length that passed input validation.
            conversation: maskPII(analysisRequest.conversation).padEnd(
              analysisRequest.conversation.length,
              " ",
            ),
            relationship: analysisRequest.relationship,
            ...(analysisRequest.mySpeaker ? { mySpeaker: analysisRequest.mySpeaker } : {}),
          }
        : undefined;
      const [response] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/${analysisRequest ? "analyze" : "example"}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(50_000)]),
          },
        ),
        new Promise<void>((resolve) => setTimeout(resolve, 2400)),
      ]);
      const json: unknown = await response.json();
      controller.signal.throwIfAborted();
      if (!response.ok) {
        const parsed = errorSchema.safeParse(json);
        track("analyze_error", { code: parsed.success ? parsed.data.error.code : "HTTP_ERROR" });
        dispatch({
          type: "error",
          message: parsed.success
            ? parsed.data.error.message
            : "분석에 실패했어요. 다시 시도해 주세요.",
        });
        return;
      }
      const data = responseSchema.parse(json);
      if (analysisRequest) {
        track("analyze_success");
        if (data.result.partnerTemperature?.source === "code") track("temperature_fallback");
        clearDraft();
      }
      dispatch({ type: "result", data, origin: analysisRequest ? "analysis" : "example" });
      // The paid report needs the masked request that produced this result; the example has none.
      if (body) saveLastRequest(body);
      else clearLastRequest();
      try {
        sessionStorage.setItem(resultStorageKey, JSON.stringify(data));
      } catch (error) {
        if (!(error instanceof Error)) throw error;
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (controller.signal.aborted) return;
      if (stage === "extract") {
        track("extract_error", { code: "CLIENT_ERROR" });
        dispatch({ type: "error", message: "캡처를 읽지 못했어요. 다시 올려 주세요." });
        return;
      }
      track("analyze_error", { code: "NETWORK_ERROR" });
      dispatch({ type: "error", message: "연결이 잠시 끊겼어요. 다시 시도해 주세요." });
    } finally {
      activeRequest.current = null;
    }
  }
  switch (state.step) {
    case "landing":
      return (
        <LandingStep
          onStart={() => {
            track("cta_click", { variant: "main" });
            startAnalysis("landing");
            dispatch({ type: "input" });
          }}
          onExample={() => {
            markStart("example");
            track("cta_click", { variant: "example" });
            void run();
          }}
        />
      );
    case "input":
    case "loading":
      return (
        <>
          {/* Keep files and form state in memory while extraction/analysis is running. */}
          <div hidden={state.step === "loading"}>
            <InputStep
              onSubmit={(request) => void run(request)}
              onScreenshotsSubmit={(screenshots) => void run(undefined, screenshots)}
              onBack={() => dispatch({ type: "landing" })}
              apiError={state.step === "input" ? state.error : null}
            />
          </div>
          {state.step === "loading" && <LoadingStep key={state.stage} stage={state.stage} />}
        </>
      );
    case "result":
      return (
        <ResultStep
          data={state.data}
          origin={state.origin}
          onRestart={() => {
            clearResult();
            startAnalysis("restart");
            dispatch({ type: "input" });
          }}
        />
      );
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

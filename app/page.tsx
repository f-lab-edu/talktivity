"use client";

import { useEffect, useReducer, useRef } from "react";
import { InputStep } from "@/components/input-step";
import { LandingStep } from "@/components/landing-step";
import { LoadingStep } from "@/components/loading-step";
import { ResultStep } from "@/components/result-step";
import { track } from "@/lib/analytics";
import { prepareConversation } from "@/lib/core/mask";
import { speakersIn } from "@/lib/core/parse-kakao";
import { type AnalysisRequest, errorSchema, responseSchema } from "@/lib/core/schema";
import { flowReducer } from "@/lib/flow";

export default function Home() {
  const [state, dispatch] = useReducer(flowReducer, { step: "landing" });
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    track("landing_view");
    try {
      const saved = sessionStorage.getItem("talktivity:last-result");
      if (saved) {
        const parsed = responseSchema.safeParse(JSON.parse(saved));
        if (parsed.success) dispatch({ type: "result", data: parsed.data });
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      // Unavailable storage or outdated JSON leaves the landing page usable.
    }
    return () => activeRequest.current?.abort();
  }, []);
    useEffect(() => {
    if (state.step !== "landing") window.scrollTo(0, 0); }, [state.step]);
  async function run(request?: AnalysisRequest) {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    dispatch({ type: "loading" });
    if (request) track("analyze_submit");
    try {
      const body = request ? {
        conversation: prepareConversation(request.conversation, request.mySpeaker ?? speakersIn(request.conversation)[0]),
        relationship: request.relationship,
        ...(speakersIn(request.conversation).length >= 2 ? { mySpeaker: "나" } : {}),
      } : undefined;
      const [response] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/${request ? "analyze" : "example"}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          ...(body ? { body: JSON.stringify(body) } : {}),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(50_000)]),
        }),
        new Promise<void>((resolve) => setTimeout(resolve, 2400)),
      ]);
      const json: unknown = await response.json();
      if (!response.ok) {
        const parsed = errorSchema.safeParse(json);
        track("analyze_error", { code: parsed.success ? parsed.data.error.code : "HTTP_ERROR" });
        dispatch({ type: "error", message: parsed.success ? parsed.data.error.message : "분석에 실패했어요. 다시 시도해 주세요." });
        return;
      }
      const data = responseSchema.parse(json);
      if (request) track("analyze_success");
      dispatch({ type: "result", data });
      try { sessionStorage.setItem("talktivity:last-result", JSON.stringify(data)); }
      catch (error) { if (!(error instanceof Error)) throw error; }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (controller.signal.aborted) return;
      track("analyze_error", { code: "NETWORK_ERROR" });
      dispatch({ type: "error", message: "연결이 잠시 끊겼어요. 다시 시도해 주세요." });
    } finally { activeRequest.current = null; }
  }
  switch (state.step) {
    case "landing": return <LandingStep onStart={() => { track("cta_click", { variant: "main" }); dispatch({ type: "input" }); }} onExample={() => { track("cta_click", { variant: "example" }); void run(); }} />;
    case "input": return <InputStep onSubmit={(request) => void run(request)} onBack={() => dispatch({ type: "landing" })} apiError={state.error} />;
    case "loading": return <LoadingStep />;
    case "result": return <ResultStep data={state.data} onRestart={() => {
      try { sessionStorage.removeItem("talktivity:last-result"); } catch (error) { if (!(error instanceof Error)) throw error; }
      dispatch({ type: "input" });
    }} />;
    default: { const exhaustive: never = state; return exhaustive; }
  }
}

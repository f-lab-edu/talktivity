import { type AnalysisResponse, responseSchema } from "./core/schema";

export const resultStorageKey = "talktivity:last-result";
export const stepStorageKey = "talktivity:step";
export const homeEvent = "talktivity:home";

export type LoadingStage = "extract" | "analyze";
export type ResultOrigin = "analysis" | "example" | "restored";

export type FlowState =
  | { readonly step: "landing" }
  | { readonly step: "input"; readonly error: string | null }
  | { readonly step: "loading"; readonly stage: LoadingStage }
  | {
      readonly step: "result";
      readonly data: AnalysisResponse;
      readonly origin: ResultOrigin;
    };
type Action =
  | { readonly type: "restore"; readonly state: FlowState }
  | { readonly type: "input" }
  | { readonly type: "landing" }
  | { readonly type: "loading"; readonly stage: LoadingStage }
  | { readonly type: "result"; readonly data: AnalysisResponse; readonly origin: ResultOrigin }
  | { readonly type: "error"; readonly message: string };
// State to reopen after a reload, from the stored result and step. Older results without an
// origin count as restored too.
export function restoreFlow(result: string | null, step: string | null): FlowState {
  if (result) {
    try {
      const parsed = responseSchema.safeParse(JSON.parse(result));
      if (parsed.success) return { step: "result", data: parsed.data, origin: "restored" };
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
  } else if (step === "input") {
    return { step: "input", error: null };
  }
  return { step: "landing" };
}

export function flowReducer(_state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "restore":
      return action.state;
    case "input":
      return { step: "input", error: null };
    case "landing":
      return { step: "landing" };
    case "loading":
      return { step: "loading", stage: action.stage };
    case "result":
      return { step: "result", data: action.data, origin: action.origin };
    case "error":
      return { step: "input", error: action.message };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

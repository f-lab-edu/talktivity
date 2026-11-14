import type { AnalysisResponse } from "./core/schema";

export type FlowState =
  | { readonly step: "landing" }
  | { readonly step: "input"; readonly error: string | null }
  | { readonly step: "loading" }
  | { readonly step: "result"; readonly data: AnalysisResponse };
type Action =
  | { readonly type: "input" }
  | { readonly type: "landing" }
  | { readonly type: "loading" }
  | { readonly type: "result"; readonly data: AnalysisResponse }
  | { readonly type: "error"; readonly message: string };
export function flowReducer(_state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "input":
      return { step: "input", error: null };
    case "landing":
      return { step: "landing" };
    case "loading":
      return { step: "loading" };
    case "result":
      return { step: "result", data: action.data };
    case "error":
      return { step: "input", error: action.message };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Draft, loadDraft, saveDraft } from "../lib/draft";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
});

afterEach(() => vi.unstubAllGlobals());

describe("입력 초안 복원", () => {
  it("직접 입력한 대화와 관계, 화자를 보존한다", () => {
    const draft: Draft = {
      conversation: "나: 오늘 시간 있어?\n상대: 응 저녁에 보자",
      relationship: "친구",
      mySpeaker: "나",
      source: "text",
    };

    saveDraft(draft);

    expect(loadDraft()).toEqual(draft);
  });

  it("이전 캡처 초안은 관계만 복원하고 재업로드를 기다린다", () => {
    store.set(
      "talktivity:draft",
      JSON.stringify({
        conversation: "나: 이전에 읽은 대화\n상대: 다시 복원되면 안 돼",
        relationship: "연인",
        mySpeaker: "나",
        source: "screenshot",
      }),
    );

    expect(loadDraft()).toEqual({
      conversation: "",
      relationship: "연인",
      mySpeaker: "",
      source: null,
    });
  });

  it("캡처 모드 저장 시 대화와 화자를 저장하지 않는다", () => {
    saveDraft({
      conversation: "나: 숨겨진 직접 입력\n상대: 캡처 모드로 전환했어",
      relationship: "썸",
      mySpeaker: "나",
      source: "screenshot",
    });

    expect(JSON.parse(store.get("talktivity:draft") ?? "null")).toEqual({
      conversation: "",
      relationship: "썸",
      mySpeaker: "",
      source: null,
    });
  });
});

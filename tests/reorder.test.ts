import { describe, expect, it } from "vitest";
import { moveItem } from "../lib/reorder";

describe("moveItem", () => {
  it.each([
    [0, 2, ["b", "c", "a"]],
    [2, 0, ["c", "a", "b"]],
    [1, 1, ["a", "b", "c"]],
  ])("%i번째 항목을 %i번째 자리로 옮긴다", (from, to, expected) => {
    expect(moveItem(["a", "b", "c"], from, to)).toEqual(expected);
  });

  it("원본 배열은 바꾸지 않는다", () => {
    const items = ["a", "b", "c"] as const;
    moveItem(items, 0, 2);
    expect(items).toEqual(["a", "b", "c"]);
  });
});

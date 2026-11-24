import { describe, expect, it } from "vitest";
import { activePole } from "../lib/core/axis-display";
import { axisIds, typeCodes } from "../lib/core/classification";

describe("축 표시 도우미", () => {
  it.each(typeCodes)("유형 코드 %s의 각 글자를 그 축의 활성 극으로 돌려준다", (typeCode) => {
    expect(axisIds.map((axisId) => activePole(typeCode, axisId)).join("")).toBe(typeCode);
  });
});

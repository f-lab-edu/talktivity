import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { badges, characters, getBadge, getCharacter } from "../lib/core/characters";
import { badgeIds, typeCodes } from "../lib/core/classification";

describe("유형 캐릭터 카탈로그", () => {
  it("16개 유형 코드와 카탈로그 키가 정확히 일치한다", () => {
    expect(Object.keys(characters).sort()).toEqual([...typeCodes].sort());
    expect(typeCodes.map((code) => getCharacter(code))).toHaveLength(16);
  });

  it.each(typeCodes)("유형 %s에 필요한 메타데이터와 SVG가 있다", (code) => {
    const character = getCharacter(code);
    expect(character.name).toBeTruthy();
    expect(character.assetId).toBeTruthy();
    expect(character.tagline).toBeTruthy();
    expect(character.color).toHaveLength(2);
    expect(character.color.every((color) => /^#[0-9a-f]{6}$/iu.test(color))).toBe(true);
    expect(character.description).toBeTruthy();
    expect(existsSync(`public/characters/${character.assetId}.svg`)).toBe(true);
  });

  it("기본 캐릭터의 자산은 모두 고유하며 배지 자산을 포함하지 않는다", () => {
    const assetIds = Object.values(characters).map(({ assetId }) => assetId);
    expect(new Set(assetIds).size).toBe(assetIds.length);
    expect(assetIds).not.toContain("comedian");
    expect(assetIds).not.toContain("emoji");
  });
});

describe("배지 카탈로그", () => {
  it("배지 ID와 카탈로그 키가 정확히 일치한다", () => {
    expect(Object.keys(badges).sort()).toEqual([...badgeIds].sort());
    for (const id of badgeIds) {
      const badge = getBadge(id);
      expect(badge.name).toBeTruthy();
      expect(badge.assetId).toBeTruthy();
      expect(badge.description).toBeTruthy();
    }
  });
});

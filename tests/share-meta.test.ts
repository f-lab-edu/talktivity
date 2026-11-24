import { describe, expect, it } from "vitest";
import { getCharacter } from "../lib/core/characters";
import { typeCodes } from "../lib/core/classification";
import { shareMeta } from "../lib/share-meta";

describe("공유 메타데이터", () => {
  it.each(typeCodes)("유형 %s의 이름과 코드가 미리보기 문구에 드러나지 않는다", (code) => {
    const { title, description, alt } = shareMeta(
      "답장이 한 시간 뒤에 오는 사람이 할 말은 아니지.",
    );
    for (const text of [title, description, alt]) {
      expect(text).not.toContain(getCharacter(code).name);
      expect(text).not.toContain(code);
    }
  });
});

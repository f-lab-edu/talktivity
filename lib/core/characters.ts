import type { BadgeId, TypeCode } from "./classification";

export type CharacterMeta = {
  readonly name: string;
  readonly assetId: string;
  readonly tagline: string;
  readonly color: readonly [string, string];
  readonly description: string;
};

export const characters: Record<TypeCode, CharacterMeta> = {
  OLCD: {
    name: "약속 설계자",
    assetId: "planner",
    tagline: "먼저 길을 열고, 분명하게 약속해요",
    color: ["#d9f2ee", "#a6dfd6"],
    description: "먼저 대화를 이끌고 충분히 설명하며, 생생한 표현으로 뜻을 분명히 전해요.",
  },
  OLCG: {
    name: "읽씹 방지 파수꾼",
    assetId: "guardian",
    tagline: "먼저 말을 건네고 편한 여지를 남겨요",
    color: ["#fff4ce", "#ffe191"],
    description: "먼저 대화를 열고 자세히 이야기하되, 부드러운 표현으로 상대가 답할 틈을 줘요.",
  },
  OLMD: {
    name: "본론 브리핑 장인",
    assetId: "briefing",
    tagline: "먼저 핵심을 살피고 차분히 정리해요",
    color: ["#dcefff", "#b1d9ff"],
    description: "대화를 주도하며 충분한 맥락을 설명하고, 담담하고 분명한 말투를 유지해요.",
  },
  OLMG: {
    name: "신중한 안부 장인",
    assetId: "checkin",
    tagline: "먼저 살피되, 천천히 마음을 열어요",
    color: ["#e8e1fa", "#cbbbea"],
    description: "먼저 말을 꺼내고 마음을 담아 길게 이야기하며, 완곡한 표현으로 안부를 건네요.",
  },
  OBCD: {
    name: "한 줄 스파크",
    assetId: "spark",
    tagline: "먼저 던지는 한마디로 분위기를 밝혀요",
    color: ["#fff5b8", "#ffdd85"],
    description: "짧고 경쾌하게 대화를 이끌며, 꾸밈없는 표현으로 대화에 활기를 더해요.",
  },
  OBCG: {
    name: "플러팅 장인",
    assetId: "flirt",
    tagline: "짧은 한마디에도 다정한 여지를 담아요",
    color: ["#ffe8d5", "#ffc5ad"],
    description: "짧은 말을 먼저 건네고 생생하게 표현하면서도, 상대가 편히 이어가도록 조율해요.",
  },
  OBMD: {
    name: "용건만 통보관",
    assetId: "dispatch",
    tagline: "먼저 핵심만 간결하고 분명하게 전해요",
    color: ["#e1e5ff", "#b6c4ff"],
    description: "대화를 주도해 필요한 말만 짧게 전하고, 담백하고 단정한 태도를 보여요.",
  },
  OBMG: {
    name: "담백한 에스코트",
    assetId: "escort",
    tagline: "말은 짧게, 다음 선택은 편하게 맡겨요",
    color: ["#dceee7", "#b7d9ca"],
    description: "간결한 말로 먼저 길을 열고, 부드러운 표현으로 상대의 선택을 존중해요.",
  },
  RLCD: {
    name: "은근히 답정너",
    assetId: "answer",
    tagline: "차분히 듣고, 생각은 분명하게 나눠요",
    color: ["#f0e4ff", "#dbc5ff"],
    description: "상대의 대화에 반응하며 맥락을 충분히 살피고, 생생하고 단정한 의견을 전해요.",
  },
  RLCG: {
    name: "장문 편지 작가",
    assetId: "novelist",
    tagline: "상대의 말에 긴 마음과 부드러운 답을 건네요",
    color: ["#dcefff", "#b1d9ff"],
    description: "상대의 이야기에 반응하며 생각을 차근차근 풀어내고, 다정하게 대화를 조율해요.",
  },
  RLMD: {
    name: "말투 탐정",
    assetId: "detective",
    tagline: "꼼꼼히 듣고 말의 결을 정확히 짚어요",
    color: ["#dceee7", "#b7d9ca"],
    description: "충분히 듣고 관찰한 뒤, 담담하고 분명한 말로 작은 차이까지 짚어내요.",
  },
  RLMG: {
    name: "잔잔한 공감 DJ",
    assetId: "nightowl",
    tagline: "상대의 마음을 듣고 차분히 공감해요",
    color: ["#e8e1fa", "#cbbbea"],
    description: "상대의 말에 반응해 맥락을 충분히 나누고, 부드러운 표현으로 공감해요.",
  },
  RBCD: {
    name: "단호박 치어리더",
    assetId: "cheerleader",
    tagline: "짧고 힘찬 반응으로 등을 밀어줘요",
    color: ["#fff5b8", "#ffdd85"],
    description: "상대의 말에 짧게 반응하고 생기 있게 응원하며, 뜻을 시원하게 전해요.",
  },
  RBCG: {
    name: "리액션 햇살 요정",
    assetId: "sunshine",
    tagline: "짧고 환한 반응으로 대화를 따뜻하게 해요",
    color: ["#fff5b8", "#ffdd85"],
    description: "상대의 말에 간결하게 반응하고 밝게 표현하며, 편안한 대화 흐름을 만들어요.",
  },
  RBMD: {
    name: "프레임 유지하는 차도남",
    assetId: "cool",
    tagline: "짧게 듣고 핵심만 흔들림 없이 전해요",
    color: ["#e1e5ff", "#b6c4ff"],
    description: "상대의 말에 필요한 만큼 반응하고, 담백하고 분명한 태도를 유지해요.",
  },
  RBMG: {
    name: "단답 미니멀리스트",
    assetId: "minimalist",
    tagline: "상대의 말에 짧고 편안하게 답해요",
    color: ["#e8eddf", "#cad7b2"],
    description: "간결하게 반응하며 군더더기를 덜고, 부담 없는 말투로 대화를 이어가요.",
  },
};

export type BadgeMeta = {
  readonly name: string;
  readonly assetId: string;
  readonly description: string;
};

export const badges: Record<BadgeId, BadgeMeta> = {
  comedian: {
    name: "드립",
    assetId: "comedian",
    description: "대화에서 유머를 만들어 분위기를 살리는 표현이에요.",
  },
  emoji: {
    name: "이모티콘",
    assetId: "emoji",
    description: "이모지나 이모티콘으로 감정과 반응을 풍성하게 표현해요.",
  },
};

export function getCharacter(code: TypeCode): CharacterMeta {
  return characters[code];
}

export function getBadge(id: BadgeId): BadgeMeta {
  return badges[id];
}

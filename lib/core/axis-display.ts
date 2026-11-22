import { type AxisId, axisIds, axisPoles, type TypeCode } from "./classification";

export type Pole = (typeof axisPoles)[AxisId][number];

export const poleLabels: Readonly<Record<Pole, string>> = {
  O: "주도",
  R: "반응",
  L: "장문",
  B: "단문",
  C: "컬러",
  M: "모노",
  D: "직진",
  G: "조율",
};

export const axisTitles: Readonly<Record<AxisId, string>> = {
  direction: "대화의 시작",
  length: "말의 길이",
  color: "표현의 결",
  stance: "말의 태도",
};

export const poleHints: Readonly<Record<Pole, string>> = {
  O: "먼저 말을 걸고 대화를 이끌어요",
  R: "상대의 말에 반응하며 따라가요",
  L: "맥락까지 충분히 풀어서 말해요",
  B: "필요한 말만 간결하게 해요",
  C: "감탄과 이모지로 표정을 살려요",
  M: "꾸밈 없이 담백하게 말해요",
  D: "뜻을 분명하게 못 박아요",
  G: "상대가 답할 여지를 남겨요",
};

// The type letter picks the active pole, so a score of exactly 50 follows the code.
export function activePole(typeCode: TypeCode, axisId: AxisId): Pole {
  const [first, second] = axisPoles[axisId];
  return typeCode[axisIds.indexOf(axisId)] === second ? second : first;
}

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

// The type letter picks the active pole, so a score of exactly 50 follows the code.
export function activePole(typeCode: TypeCode, axisId: AxisId): Pole {
  const [first, second] = axisPoles[axisId];
  return typeCode[axisIds.indexOf(axisId)] === second ? second : first;
}

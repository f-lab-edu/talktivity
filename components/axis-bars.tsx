"use client";

import { motion } from "motion/react";
import { activePole, poleLabels } from "@/lib/core/axis-display";
import {
  type AxisScores,
  axisIds,
  axisPoles,
  isBoundary,
  type TypeCode,
} from "@/lib/core/classification";

export function AxisBars({
  typeCode,
  axes,
}: {
  readonly typeCode: TypeCode;
  readonly axes: AxisScores;
}) {
  return (
    <ul className="axes" aria-label="네 가지 대화 축">
      {axisIds.map((axisId) => {
        const [first, second] = axisPoles[axisId];
        const score = axes[axisId];
        const active = activePole(typeCode, axisId);
        const boundary = isBoundary(score);
        return (
          <li key={axisId}>
            <meter
              className="sr-only"
              min={0}
              max={100}
              value={score}
              aria-label={`${poleLabels[first]}(${first})·${poleLabels[second]}(${second}) 축`}
              aria-valuetext={`${poleLabels[first]} ${score} 대 ${poleLabels[second]} ${100 - score}${boundary ? ", 경계형" : ""}, 유형 글자 ${active}`}
            />
            <div className="axis-head" aria-hidden="true">
              <span className="axis-pole" data-active={active === first}>
                <span className="axis-letter">{first}</span> {poleLabels[first]} {score}
              </span>
              {boundary && <span className="axis-boundary">경계형</span>}
              <span className="axis-pole" data-active={active === second}>
                {100 - score} {poleLabels[second]} <span className="axis-letter">{second}</span>
              </span>
            </div>
            <div className="axis-bar" aria-hidden="true">
              <motion.span
                className="axis-fill"
                style={{ originX: active === first ? 0 : 1 }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: (active === first ? score : 100 - score) / 100 }}
                transition={{ duration: 0.7 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

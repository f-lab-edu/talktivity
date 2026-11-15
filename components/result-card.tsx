"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { getBadge, getCharacter } from "@/lib/core/characters";
import {
  type AxisId,
  axisIds,
  axisPoles,
  isBoundary,
  type TypeCode,
} from "@/lib/core/classification";
import type { SharePayloadV2 } from "@/lib/core/share-token";

type Pole = (typeof axisPoles)[AxisId][number];

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

export function ResultCard({
  payload,
  shared = false,
}: {
  readonly payload: SharePayloadV2;
  readonly shared?: boolean;
}) {
  const character = getCharacter(payload.typeCode);
  const [firstLine, secondLine, thirdLine] = payload.roastLines;
  return (
    <article
      className="result-card"
      style={{
        background: `linear-gradient(145deg, ${character.color[0]}, ${character.color[1]})`,
      }}
    >
      <div className="card-top">
        <span>TALKTIVITY</span>
        <span>{shared ? "친구의 결과" : "나의 톡 캐릭터"}</span>
      </div>
      <div className="character-emoji" aria-hidden="true">
        <Image
          src={`/characters/${character.assetId}.svg`}
          alt=""
          width={96}
          height={96}
          loading="eager"
          unoptimized
        />
      </div>
      <h2>{character.name}</h2>
      <p className="type-code">
        <span className="sr-only">유형 코드 </span>
        {payload.typeCode}
      </p>
      <p className="character-tagline">{character.tagline}</p>
      {payload.badges.length > 0 && (
        <ul className="card-badges" aria-label="배지">
          {payload.badges.map((id) => {
            const badge = getBadge(id);
            return (
              <li key={id}>
                <Image
                  src={`/characters/${badge.assetId}.svg`}
                  alt=""
                  width={18}
                  height={18}
                  unoptimized
                />
                {badge.name}
              </li>
            );
          })}
        </ul>
      )}
      <div className="roast-lines">
        <p>{firstLine}</p>
        <p>{secondLine}</p>
        <p>{thirdLine}</p>
      </div>
      <ul className="axes" aria-label="네 가지 대화 축">
        {axisIds.map((axisId) => {
          const [first, second] = axisPoles[axisId];
          const score = payload.axes[axisId];
          const active = activePole(payload.typeCode, axisId);
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
      <div className="card-brand">말투는 못 숨기지. 톡티비티</div>
    </article>
  );
}

"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { characters } from "@/lib/core/characters";
import type { SharePayload } from "@/lib/core/share-token";

const labels = {
  initiative: "대화 주도권",
  replyPsychology: "답장 속도 심리",
  pushPull: "밀당 지수",
} as const;
export function ResultCard({
  payload,
  shared = false,
}: {
  readonly payload: SharePayload;
  readonly shared?: boolean;
}) {
  const character = characters[payload.characterId];
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
          src={`/characters/${character.id}.svg`}
          alt=""
          width={100}
          height={100}
          unoptimized
        />
      </div>
      <p className="character-tagline">{character.tagline}</p>
      <h2>{character.name}</h2>
      <div className="roast-lines">
        {payload.roastLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <div className="stats">
        {Object.entries(labels).map(([key, label]) => {
          const value =
            key === "initiative"
              ? payload.stats.initiative
              : key === "replyPsychology"
                ? payload.stats.replyPsychology
                : payload.stats.pushPull;
          return (
            <div className="stat" key={key}>
              <div>
                <span>{label}</span>
                <strong>
                  {value}
                  {key === "replyPsychology" ? "점" : "%"}
                </strong>
              </div>
              <meter className="sr-only" aria-label={label} min={0} max={100} value={value} />
              <div className="stat-track" aria-hidden="true">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="card-brand">말투는 못 숨기지. 톡티비티</div>
    </article>
  );
}

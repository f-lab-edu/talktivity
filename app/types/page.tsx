import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getCharacter } from "@/lib/core/characters";
import { getTypeGuide, typeGroups } from "@/lib/core/type-guide";

export const metadata: Metadata = {
  title: "16가지 대화 유형 도감 | 톡티비티",
  description:
    "먼저 여는지, 길게 말하는지, 생생한지, 단정하는지. 네 가지 말투 축으로 나뉜 16가지 톡 캐릭터를 구경해 보세요.",
};

export default function TypesPage() {
  return (
    <section className="types-page">
      <p className="eyebrow">유형 도감</p>
      <h1 className="step-title">16가지 대화 유형 도감</h1>
      <p className="types-intro">톡 말투를 네 가지 축으로 나누면 이런 캐릭터들이 나와요.</p>
      {typeGroups.map((group) => (
        <section key={group.name} className="types-group" aria-label={group.name}>
          <h2>{group.name}</h2>
          <p className="types-group-description">{group.description}</p>
          <ul className="types-grid">
            {group.codes.map((code) => {
              const character = getCharacter(code);
              return (
                <li key={code}>
                  <Link
                    href={`/types/${code}`}
                    className="types-card"
                    style={{
                      background: `linear-gradient(145deg, ${character.color[0]}, ${character.color[1]})`,
                    }}
                  >
                    <Image
                      src={`/characters/${character.assetId}.svg`}
                      alt=""
                      width={72}
                      height={72}
                      unoptimized
                    />
                    <strong>{character.name}</strong>
                    <span className="types-code">{code}</span>
                    <span className="types-summary">{getTypeGuide(code).summary}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}

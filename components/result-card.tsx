import Image from "next/image";
import { getBadge, getCharacter } from "@/lib/core/characters";
import type { SharePayloadV2 } from "@/lib/core/share-token";

export function ResultCard({
  payload,
  shared = false,
}: {
  readonly payload: SharePayloadV2;
  readonly shared?: boolean;
}) {
  const character = getCharacter(payload.typeCode);
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
          width={136}
          height={136}
          loading="eager"
          unoptimized
        />
      </div>
      <h2>{character.name}</h2>
      <p className="meme-roast">{payload.roastLines[0]}</p>
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
      <p className="type-code">
        <span className="sr-only">유형 코드 </span>
        {payload.typeCode}
      </p>
      <div className="card-brand">말투는 못 숨기지. 톡티비티</div>
    </article>
  );
}

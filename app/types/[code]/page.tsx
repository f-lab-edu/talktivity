import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TypesCta } from "@/components/types-cta";
import { activePole, axisTitles, poleHints, poleLabels } from "@/lib/core/axis-display";
import { getCharacter } from "@/lib/core/characters";
import { axisIds, type TypeCode, typeCodes } from "@/lib/core/classification";
import { getTypeGuide } from "@/lib/core/type-guide";

type Props = { readonly params: Promise<{ code: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return typeCodes.map((code) => ({ code }));
}

async function resolveCode({ params }: Props): Promise<TypeCode> {
  const { code } = await params;
  const typeCode = typeCodes.find((candidate) => candidate === code);
  if (!typeCode) notFound();
  return typeCode;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const code = await resolveCode(props);
  const character = getCharacter(code);
  return {
    title: `${character.name} (${code}) | 톡티비티 유형 도감`,
    description: getTypeGuide(code).summary,
  };
}

function RelationCard({
  title,
  code,
  reason,
}: {
  readonly title: string;
  readonly code: TypeCode;
  readonly reason: string;
}) {
  const character = getCharacter(code);
  return (
    <Link
      href={`/types/${code}`}
      className="types-relation"
      style={{
        background: `linear-gradient(145deg, ${character.color[0]}, ${character.color[1]})`,
      }}
    >
      <Image
        src={`/characters/${character.assetId}.svg`}
        alt=""
        width={64}
        height={64}
        unoptimized
      />
      <div>
        <p className="types-relation-title">{title}</p>
        <strong>
          {character.name} <span className="types-code">{code}</span>
        </strong>
        <p>{reason}</p>
      </div>
    </Link>
  );
}

export default async function TypeDetailPage(props: Props) {
  const code = await resolveCode(props);
  const character = getCharacter(code);
  const guide = getTypeGuide(code);
  return (
    <section className="types-page">
      <Link href="/types" className="types-back">
        ← 유형 도감
      </Link>
      <article
        className="types-hero"
        style={{
          background: `linear-gradient(145deg, ${character.color[0]}, ${character.color[1]})`,
        }}
      >
        <Image
          src={`/characters/${character.assetId}.svg`}
          alt=""
          width={136}
          height={136}
          loading="eager"
          unoptimized
        />
        <h1>{character.name}</h1>
        <p className="types-code">
          <span className="sr-only">유형 코드 </span>
          {code}
        </p>
        <p className="types-hero-summary">{guide.summary}</p>
      </article>
      <section className="types-section">
        <h2>네 가지 축으로 보면</h2>
        <ul className="types-axes">
          {axisIds.map((axisId) => {
            const pole = activePole(code, axisId);
            return (
              <li key={axisId}>
                <span>{axisTitles[axisId]}</span>
                <strong>{poleLabels[pole]}</strong>
                <p>{poleHints[pole]}</p>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="types-section">
        <h2>톡에서 보이는 모습</h2>
        <dl className="types-traits">
          <div>
            <dt>톡 강점</dt>
            <dd>{guide.strength}</dd>
          </div>
          <div>
            <dt>오해받기 쉬운 점</dt>
            <dd>{guide.misread}</dd>
          </div>
        </dl>
      </section>
      <section className="types-section">
        <h2>이런 유형과는</h2>
        <RelationCard
          title="대화가 잘 통하는 유형"
          code={guide.goodWith}
          reason={guide.goodReason}
        />
        <RelationCard
          title="부딪히기 쉬운 유형"
          code={guide.clashWith}
          reason={guide.clashReason}
        />
      </section>
      <section className="types-section">
        <h2>이 유형과 톡하는 법</h2>
        <p className="types-tip">{guide.tip}</p>
      </section>
      <TypesCta code={code} />
    </section>
  );
}

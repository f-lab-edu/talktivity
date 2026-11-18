import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { activePole, poleLabels } from "@/lib/core/axis-display";
import { getBadge, getCharacter } from "@/lib/core/characters";
import { axisIds, axisPoles, isBoundary } from "@/lib/core/classification";
import { verifyToken } from "@/lib/core/share-token";
import { shareSecret } from "@/lib/server/share-secret";

export const runtime = "nodejs";

// Satori has no CSS variables, so these mirror the result card tokens in base.css and card.css.
const ink = "#242822";
const inkSoft = "rgba(36, 40, 34, 0.8)";
const veil = "rgba(255, 255, 255, 0.55)";
const notch = "rgba(255, 255, 255, 0.75)";
const axisRows = [axisIds.slice(0, 2), axisIds.slice(2)];

async function svgDataUri(assetId: string): Promise<string> {
  const svg = await readFile(join(process.cwd(), `public/characters/${assetId}.svg`));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? await verifyToken(token, shareSecret()) : null;
  if (token && !payload) return new Response("유효하지 않은 공유 링크입니다.", { status: 400 });
  const character = payload ? getCharacter(payload.typeCode) : null;
  const font = await readFile(join(process.cwd(), "assets/Pretendard-Bold.otf"));
  const characterSrc = await svgDataUri(character?.assetId ?? "chat");
  const badges = await Promise.all(
    (payload?.badges ?? []).map(async (id) => {
      const badge = getBadge(id);
      return { id, name: badge.name, src: await svgDataUri(badge.assetId) };
    }),
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: character
          ? `linear-gradient(130deg, ${character.color[0]}, ${character.color[1]})`
          : "#eff5da",
        padding: 48,
        flexDirection: "column",
        fontFamily: "Pretendard",
        color: ink,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24 }}>
        <span>TALKTIVITY</span>
        <span>{payload ? "친구의 톡 캐릭터" : "말투는 못 숨기지"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 32, gap: 32 }}>
        <svg
          width={144}
          height={144}
          viewBox="0 0 144 144"
          role="img"
          aria-label={character?.name ?? "대화"}
        >
          <image href={characterSrc} width={144} height={144} />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 24, color: inkSoft }}>
            {character?.tagline ?? "3초 만에 보는 내 톡 성향"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
            <span style={{ fontSize: 60 }}>{character?.name ?? "카톡 대화 팩폭 분석기"}</span>
            {payload && (
              <span style={{ fontSize: 40, letterSpacing: "0.28em" }}>{payload.typeCode}</span>
            )}
          </div>
          {badges.length > 0 && (
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 16px 4px 12px",
                    borderRadius: 100,
                    background: veil,
                    fontSize: 24,
                  }}
                >
                  <svg
                    width={28}
                    height={28}
                    viewBox="0 0 28 28"
                    role="img"
                    aria-label={badge.name}
                  >
                    <image href={badge.src} width={28} height={28} />
                  </svg>
                  <span>{badge.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {payload ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 48 }}>
          {axisRows.map((row) => (
            <div key={row.join()} style={{ display: "flex", gap: 48 }}>
              {row.map((axisId) => {
                const [first, second] = axisPoles[axisId];
                const score = payload.axes[axisId];
                const active = activePole(payload.typeCode, axisId);
                return (
                  <div key={axisId} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 30 }}>
                      <span style={{ flex: 1, color: active === first ? ink : inkSoft }}>
                        {`${first} ${poleLabels[first]} ${score}`}
                      </span>
                      {isBoundary(score) && (
                        <span
                          style={{
                            padding: "0 12px",
                            borderRadius: 100,
                            background: veil,
                            fontSize: 24,
                          }}
                        >
                          경계형
                        </span>
                      )}
                      <span
                        style={{
                          flex: 1,
                          textAlign: "right",
                          color: active === second ? ink : inkSoft,
                        }}
                      >
                        {`${100 - score} ${poleLabels[second]} ${second}`}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        position: "relative",
                        justifyContent: active === first ? "flex-start" : "flex-end",
                        height: 12,
                        marginTop: 12,
                        borderRadius: 100,
                        background: veil,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${active === first ? score : 100 - score}%`,
                          background: ink,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: "50%",
                          width: 2,
                          marginLeft: -1,
                          background: notch,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", marginTop: 48, fontSize: 30 }}>
          나는 어떤 유형일까? 가입 없이 무료로 확인하기 →
        </div>
      )}
      <div style={{ display: "flex", fontSize: 24, marginTop: "auto" }}>
        톡티비티 · 나도 무료로 팩폭 분석하기
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Pretendard", data: font, style: "normal", weight: 700 }],
    },
  );
}

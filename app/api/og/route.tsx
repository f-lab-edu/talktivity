import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { characters } from "@/lib/core/characters";
import { verifyToken } from "@/lib/core/share-token";
import { shareSecret } from "@/lib/server/share-secret";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? await verifyToken(token, shareSecret()) : null;
  if (token && !payload) return new Response("유효하지 않은 공유 링크입니다.", { status: 400 });
  const character = payload ? characters[payload.characterId] : null;
  const font = await readFile(join(process.cwd(), "assets/Pretendard-Bold.otf"));
  const emoji = await readFile(
    join(process.cwd(), `public/characters/${character?.id ?? "chat"}.svg`),
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
        padding: "58px 72px",
        flexDirection: "column",
        fontFamily: "Pretendard",
        color: "#242822",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 25 }}>
        <span>TALKTIVITY</span>
        <span>{payload ? "친구의 톡 캐릭터" : "말투는 못 숨기지"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 42, gap: 28 }}>
        <svg
          width={110}
          height={110}
          viewBox="0 0 110 110"
          role="img"
          aria-label={character?.name ?? "대화"}
        >
          <image
            href={`data:image/svg+xml;base64,${emoji.toString("base64")}`}
            width={110}
            height={110}
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 25 }}>{character?.tagline ?? "3초 만에 보는 내 톡 성향"}</span>
          <span style={{ fontSize: 59, marginTop: 10 }}>
            {character?.name ?? "카톡 대화 팩폭 분석기"}
          </span>
        </div>
      </div>
      {payload ? (
        <div style={{ display: "flex", gap: 28, marginTop: 46 }}>
          {[
            ["대화 주도권", payload.stats.initiative, "%"],
            ["답장 속도 심리", payload.stats.replyPsychology, "점"],
            ["밀당 지수", payload.stats.pushPull, "%"],
          ].map(([label, value, unit]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px 28px",
                background: "#ffffff99",
                borderRadius: 20,
                width: 330,
              }}
            >
              <span style={{ fontSize: 23 }}>{label}</span>
              <span style={{ fontSize: 42, marginTop: 10 }}>
                {value}
                {unit}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", marginTop: 45, fontSize: 32 }}>
          나는 어떤 유형일까? 가입 없이 무료로 확인하기 →
        </div>
      )}
      <div style={{ display: "flex", fontSize: 23, marginTop: "auto" }}>
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

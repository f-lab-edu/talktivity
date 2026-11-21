import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getCharacter } from "@/lib/core/characters";
import { verifyToken } from "@/lib/core/share-token";
import { shareSecret } from "@/lib/server/share-secret";

export const runtime = "nodejs";

// Satori has no CSS variables, so these mirror the result card tokens in base.css and card.css.
const ink = "#242822";
const inkSoft = "rgba(36, 40, 34, 0.8)";
const inkGhost = "rgba(36, 40, 34, 0.14)";
const defaultBackground = "#eff5da";
// Kakao may center-crop the 1200x630 image to a square, so every key element stays inside it.
const safeWidth = 570;

function Silhouette() {
  return (
    <div style={{ display: "flex", position: "relative", width: 130, height: 130 }}>
      <svg
        width={130}
        height={130}
        viewBox="0 0 200 200"
        role="img"
        aria-label="유형을 가린 실루엣"
      >
        <circle cx={100} cy={72} r={46} fill={inkGhost} />
        <path d="M22 196 C22 136 58 112 100 112 C142 112 178 136 178 196 Z" fill={inkGhost} />
      </svg>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 6,
          left: 0,
          width: 130,
          justifyContent: "center",
          fontSize: 64,
          color: ink,
        }}
      >
        ?
      </div>
    </div>
  );
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const payload = token ? await verifyToken(token, shareSecret()) : null;
  if (token && !payload) return new Response("유효하지 않은 공유 링크입니다.", { status: 400 });
  const character = payload ? getCharacter(payload.typeCode) : null;
  const font = await readFile(join(process.cwd(), "assets/Pretendard-Bold.otf"));
  const headline = payload?.roastLines[0] ?? "카톡 대화 팩폭 분석기";
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: character
          ? `linear-gradient(130deg, ${character.color[0]}, ${character.color[1]})`
          : defaultBackground,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Pretendard",
        color: ink,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: safeWidth,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 22, letterSpacing: 2 }}>TALKTIVITY</span>
        <div style={{ display: "flex", marginTop: 14 }}>
          <Silhouette />
        </div>
        <span
          style={{
            marginTop: 18,
            fontSize: headline.length > 30 ? 34 : 40,
            lineHeight: 1.4,
            wordBreak: "keep-all",
          }}
        >
          {headline}
        </span>
        <span style={{ marginTop: 22, fontSize: 28, color: inkSoft }}>
          {payload ? "이 말투, 무슨 유형일까? 맞혀 봐" : "나는 어떤 유형일까? 3초 만에 확인"}
        </span>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Pretendard", data: font, style: "normal", weight: 700 }],
    },
  );
}

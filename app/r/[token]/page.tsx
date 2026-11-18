import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SharedResult } from "@/components/shared-result";
import { Button } from "@/components/ui/button";
import { activePole, poleLabels } from "@/lib/core/axis-display";
import { getBadge, getCharacter } from "@/lib/core/characters";
import { axisIds, axisPoles } from "@/lib/core/classification";
import { verifyToken } from "@/lib/core/share-token";
import { shareSecret } from "@/lib/server/share-secret";
import { imageUrl, resultUrl } from "@/lib/site";

type Props = { readonly params: Promise<{ token: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const payload = await verifyToken(token, shareSecret());
  if (!payload)
    return {
      title: "공유 결과를 찾을 수 없어요 | 톡티비티",
      robots: { index: false, follow: false },
    };
  const character = getCharacter(payload.typeCode);
  const title = `[톡티비티] 나 '${character.name}' 나왔어 ㅋㅋㅋ`;
  const description = `${character.name}(${payload.typeCode}) · ${character.tagline}. 너는 나랑 카톡할 때 무슨 유형 나올 것 같아? 3초 만에 확인해봐!`;
  const axes = axisIds
    .map((axisId) => {
      const pole = activePole(payload.typeCode, axisId);
      const score = payload.axes[axisId];
      return `${poleLabels[pole]} ${pole === axisPoles[axisId][0] ? score : 100 - score}`;
    })
    .join(" · ");
  const badges = payload.badges.map((id) => getBadge(id).name).join("·");
  const alt = `톡티비티 결과 이미지: ${character.name}(${payload.typeCode}), ${axes}${badges ? `, 배지 ${badges}` : ""}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: resultUrl(token),
      type: "website",
      images: [{ url: imageUrl(token), width: 1200, height: 630, alt }],
    },
  };
}
export default async function SharedPage({ params }: Props) {
  const { token } = await params;
  const payload = await verifyToken(token, shareSecret());
  if (!payload)
    return (
      <section className="invalid-step">
        <MessageCircle size={68} strokeWidth={1.5} className="mx-auto" aria-hidden="true" />
        <h1>이 결과는 찾을 수 없어요</h1>
        <p>
          링크가 바뀌었거나 올바르지 않아요.
          <br />내 톡 캐릭터를 직접 만나 볼까요?
        </p>
        <Button asChild>
          <Link href="/">나도 무료로 팩폭 분석하기</Link>
        </Button>
      </section>
    );
  return <SharedResult payload={payload} />;
}

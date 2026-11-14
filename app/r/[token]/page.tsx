import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { SharedResult } from "@/components/shared-result";
import { Button } from "@/components/ui/button";
import { characters } from "@/lib/core/characters";
import { verifyToken } from "@/lib/core/share-token";
import { shareSecret } from "@/lib/server/share-secret";
import { imageUrl, resultUrl } from "@/lib/site";

type Props = { readonly params: Promise<{ token: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const payload = await verifyToken(token, shareSecret());
  if (!payload) return { title: "공유 결과를 찾을 수 없어요 | 톡티비티", robots: { index: false, follow: false } };
  const title = `[톡티비티] 나 '${characters[payload.characterId].name}' 나왔어 ㅋㅋㅋ`;
  const description = "너는 나랑 카톡할 때 무슨 유형 나올 것 같아? 3초 만에 확인해봐!";
  return { title, description, openGraph: { title, description, url: resultUrl(token), type: "website", images: [{ url: imageUrl(token), width: 1200, height: 630, alt: title }] } };
}
export default async function SharedPage({ params }: Props) {
  const { token } = await params;
  const payload = await verifyToken(token, shareSecret());
  if (!payload) return <section className="invalid-step">        <MessageCircle size={68} strokeWidth={1.5} className="mx-auto" aria-hidden="true" /><h1>이 결과는 찾을 수 없어요</h1><p>링크가 바뀌었거나 올바르지 않아요.<br />내 톡 캐릭터를 직접 만나 볼까요?</p><Button asChild><Link href="/">나도 무료로 팩폭 분석하기</Link></Button></section>;
  return <SharedResult payload={payload} />;
}

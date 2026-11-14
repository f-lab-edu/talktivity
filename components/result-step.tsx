"use client";

import { Copy, Download, LockKeyhole, MessageCircle, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ResultCard } from "@/components/result-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { track } from "@/lib/analytics";
import { characters } from "@/lib/core/characters";
import type { AnalysisResponse } from "@/lib/core/schema";
import { toSharePayload } from "@/lib/core/share-token";
import { shareKakao } from "@/lib/kakao";
import { imageUrl, resultUrl } from "@/lib/site";

export function ResultStep({ data, onRestart }: { readonly data: AnalysisResponse; readonly onRestart: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const character = characters[data.result.characterId];
  const url = resultUrl(data.shareToken);
  useEffect(() => { track("result_view", { characterId: data.result.characterId }); }, [data.result.characterId]);
  async function copy() {
    try { await navigator.clipboard.writeText(url); track("share_link_copy"); setNotice("링크를 복사했어요. 친구에게 보내 보세요!"); }
    catch (error) { if (error instanceof Error) setNotice("링크를 복사하지 못했어요. 브라우저 권한을 확인해 주세요."); else throw error; }
  }
  async function share() {
    track("share_kakao_click");
    try {
      const method = await shareKakao({ name: character.name, url, imageUrl: imageUrl(data.shareToken) });
      if (method === "copy") { track("share_link_copy"); setNotice("공유 링크를 복사했어요!"); }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.name !== "AbortError") setNotice("공유 창을 열지 못했어요. 링크 복사를 이용해 주세요.");
    }
  }
  async function save() {
    if (!card.current || busy) return;
    setBusy(true);
    try {
      await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const png = await toPng(card.current, { pixelRatio: 2, cacheBust: false, backgroundColor: "#f8f7f2" });
      if (/KAKAOTALK|Instagram/i.test(navigator.userAgent)) {
        setPreview(png); track("image_save", { method: "long-press" }); return;
      }
      const blob = await (await fetch(png)).blob();
      const file = new File([blob], "톡티비티-내-톡-캐릭터.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: `나의 톡 캐릭터: ${character.name}` });
        track("image_save", { method: "web-share" });
      } else {
        const anchor = document.createElement("a");
        anchor.href = png; anchor.download = file.name; anchor.click();
        track("image_save", { method: "download" });
        setNotice("캐릭터 이미지를 저장했어요!");
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.name !== "AbortError") setNotice("이미지 저장에 실패했어요. 링크 공유도 이용할 수 있어요.");
    } finally { setBusy(false); }
  }
  return <section className="result-step">
    <div className="result-heading"><Badge>분석 완료</Badge><p>숨길 수 없는 나의 톡 본캐</p></div>
    <div ref={card}><ResultCard payload={toSharePayload(data.result)} /></div>
    <section className="reading-section">
      <p className="eyebrow">한 겹 더 들여다보면</p><h2>우리 대화의 다음 장</h2>
      <h3>연애운 · 대화 운</h3><p>{data.result.reading.loveFortune}</p>
      <h3>나를 위한 대화 팁</h3><ol>{data.result.reading.tips.map((tip) => <li key={tip}>{tip}</li>)}</ol>
      <h3>이렇게 말해 보면 어때요?</h3><div className="recommended-lines">{data.result.reading.recommendedLines.map((line) => <blockquote key={line}>{line}</blockquote>)}</div>
    </section>
    <div className="share-actions">
      <Button variant="kakao" onClick={() => void share()}><MessageCircle size={19} /> 카카오톡으로 공유하기</Button>
      <div className="two-buttons"><Button variant="outline" onClick={() => void copy()}><Copy size={17} /> 링크 복사</Button>
        <Button variant="outline" disabled={busy} onClick={() => void save()}><Download size={17} /> {busy ? "이미지 만드는 중..." : "이미지 저장"}</Button></div>
    </div>
    <p role="status" className="action-notice">{notice}</p>
    <section className="paywall"><div className="section-label"><h2>조금 더 궁금하다면</h2><Badge>곧 만나요</Badge></div>
      {([{ tier: 1000, title: "상대방 속마음 정밀 리포트" }, { tier: 1900, title: "대화가 절대로 안 끊기는 맞춤 답장 3개 추천" }] as const).map((item) =>
        <button className="teaser-card" type="button" key={item.tier} onClick={() => { track("paywall_teaser_click", { tier: item.tier }); setTeaser(true); }}>
          <LockKeyhole size={20} /><span>{item.title}</span><strong>{item.tier.toLocaleString("ko-KR")}원</strong>
        </button>)}
    </section>
    <Button variant="ghost" className="full-width restart" onClick={onRestart}><RotateCcw size={16} /> 다른 대화도 분석하기</Button>
    <Dialog open={teaser} onOpenChange={setTeaser}><DialogContent><DialogTitle>곧 오픈될 서비스입니다!</DialogTitle>          <DialogDescription>(1차 MVP 테스트 중) 조금만 기다려 주세요.</DialogDescription></DialogContent></Dialog>
    <Dialog open={preview !== null} onOpenChange={(open) => { if (!open) setPreview(null); }}>
      <DialogContent><DialogTitle>이미지를 길게 눌러 저장하세요</DialogTitle><DialogDescription>아래 캐릭터 카드를 길게 누르면 사진첩에 저장할 수 있어요.</DialogDescription>
        {preview &&             <Image src={preview} alt="저장할 나의 톡 캐릭터 카드" className="save-preview" width={800} height={1300} unoptimized />}
      </DialogContent>
    </Dialog>
  </section>;
}

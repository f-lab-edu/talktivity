"use client";

import { LockKeyhole } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { track } from "@/lib/analytics";
import { authEnabled, signIn, signOut, useAuth } from "@/lib/auth-client";
import { type AuthUser, nicknameFromMetadata } from "@/lib/core/auth";

const teaserItems = [
  { tier: 1000, title: "상대방 속마음 정밀 리포트" },
  { tier: 1900, title: "대화가 절대로 안 끊기는 맞춤 답장 3개 추천" },
] as const;
const pendingTierKey = "talktivity:pending-tier";

export function ResultPaywall() {
  const paywall = useRef<HTMLElement>(null);
  const { session, ready } = useAuth();
  const [teaser, setTeaser] = useState(false);
  const [loginTier, setLoginTier] = useState<1000 | 1900 | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [instagram, setInstagram] = useState(false);
  useEffect(() => setInstagram(/Instagram/i.test(navigator.userAgent)), []);
  useEffect(() => {
    if (!session) return;
    try {
      const pending = sessionStorage.getItem(pendingTierKey);
      if (pending !== "1000" && pending !== "1900") return;
      sessionStorage.removeItem(pendingTierKey);
      setLoginTier(null);
      setTeaser(true);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setNotice("로그인했어요. 궁금한 유료 카드를 다시 눌러 주세요.");
    }
  }, [session]);
  useEffect(() => {
    const section = paywall.current;
    if (!section || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const item = teaserItems.find(
            ({ tier }) => String(tier) === entry.target.getAttribute("data-tier"),
          );
          if (item) track("paywall_teaser_view", { tier: item.tier, placement: "result" });
        }
      },
      { threshold: 0.5 },
    );
    for (const card of section.querySelectorAll(".teaser-card")) observer.observe(card);
    return () => observer.disconnect();
  }, []);
  async function login(provider: AuthUser["provider"]) {
    setBusy(true);
    setNotice("");
    try {
      await signIn(provider);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setNotice("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await signOut();
      setNotice("로그아웃했어요.");
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setNotice("로그아웃하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="paywall" ref={paywall}>
        <div className="section-label">
          <h2>조금 더 궁금하다면</h2>
          <Badge>곧 만나요</Badge>
        </div>
        {session && (
          <div className="paywall-account">
            <span>{nicknameFromMetadata(session.user.user_metadata) ?? "회원"}님</span>
            <Button variant="ghost" disabled={busy} onClick={() => void logout()}>
              로그아웃
            </Button>
          </div>
        )}
        {teaserItems.map((item) => (
          <button
            className="teaser-card"
            type="button"
            key={item.tier}
            data-tier={item.tier}
            disabled={authEnabled && !ready}
            onClick={() => {
              track("paywall_teaser_click", { tier: item.tier });
              if (!authEnabled || session) {
                setTeaser(true);
                return;
              }
              setNotice("");
              try {
                sessionStorage.setItem(pendingTierKey, String(item.tier));
              } catch (error) {
                if (!(error instanceof Error)) throw error;
                setNotice("로그인 후 궁금한 유료 카드를 다시 눌러 주세요.");
              }
              setLoginTier(item.tier);
              track("login_dialog_view", { tier: item.tier });
            }}
          >
            <LockKeyhole size={20} />
            <span>{item.title}</span>
            <strong>{item.tier.toLocaleString("ko-KR")}원</strong>
          </button>
        ))}
        {notice && loginTier === null && (
          <p role="status" className="action-notice">
            {notice}
          </p>
        )}
      </section>
      <Dialog open={teaser} onOpenChange={setTeaser}>
        <DialogContent>
          <DialogTitle>곧 오픈될 서비스입니다!</DialogTitle>
          <DialogDescription>(1차 MVP 테스트 중) 조금만 기다려 주세요.</DialogDescription>
        </DialogContent>
      </Dialog>
      <Dialog
        open={loginTier !== null}
        onOpenChange={(open) => {
          if (open) return;
          setLoginTier(null);
          try {
            sessionStorage.removeItem(pendingTierKey);
          } catch (error) {
            if (!(error instanceof Error)) throw error;
          }
        }}
      >
        <DialogContent>
          <DialogTitle>로그인하고 더 알아보기</DialogTitle>
          <DialogDescription>
            유료 기능은 준비 중이에요. 카카오나 구글로 로그인해 주세요. 분석과 공유는 로그인 없이
            이용할 수 있어요.
          </DialogDescription>
          <div className="login-actions">
            <Button variant="kakao" disabled={busy} onClick={() => void login("kakao")}>
              카카오로 로그인
            </Button>
            <Button
              variant="outline"
              disabled={busy || instagram}
              aria-describedby={instagram ? "google-webview-note" : undefined}
              onClick={() => void login("google")}
            >
              구글로 로그인
            </Button>
          </div>
          {instagram && (
            <p id="google-webview-note">구글 로그인은 외부 브라우저에서 이 페이지를 열어 주세요.</p>
          )}
          <p role="status">{notice}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CouponDialog } from "@/components/coupon-dialog";
import { LoginDialog } from "@/components/login-dialog";
import { PaidReport } from "@/components/paid-report";
import { PaywallAccount } from "@/components/paywall-account";
import { buildCards, type PaywallCard, PaywallCardView } from "@/components/paywall-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { analyticsDistinctId, track } from "@/lib/analytics";
import { authEnabled, useAuth } from "@/lib/auth-client";
import {
  checkoutMessage,
  type Product,
  postCheckout,
  postReport,
  reportMessage,
} from "@/lib/billing-client";
import { nicknameFromMetadata } from "@/lib/core/auth";
import type { PaidReport as PaidReportContent } from "@/lib/core/billing/paid-report";
import { loadLastRequest } from "@/lib/last-request";
import { checkoutAvailable, openCheckout } from "@/lib/paddle";
import { clearPendingPurchase, savePendingPurchase } from "@/lib/purchase";
import { useCredits } from "@/lib/use-credits";

const pendingTierKey = "talktivity:pending-tier";

export function ResultPaywall() {
  const viewedTiers = useRef(new Set<number>());
  const checkoutCompleted = useRef(false);
  const { session, ready } = useAuth();
  const { credits, settled, purchase, confirmPurchase, setBalance } = useCredits(Boolean(session));
  const [teaser, setTeaser] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<PaidReportContent | null>(null);
  const balance = credits?.balance ?? null;
  const cards = useMemo(
    () => buildCards(Boolean(session), balance, credits?.products ?? []),
    [session, balance, credits],
  );
  const awaitingCredits = Boolean(session) && !settled;
  useEffect(() => {
    if (!session) return;
    try {
      if (sessionStorage.getItem(pendingTierKey) === null) return;
      sessionStorage.removeItem(pendingTierKey);
      setLoginOpen(false);
      setRestored(true);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setNotice("로그인했어요. 궁금한 유료 카드를 다시 눌러 주세요.");
    }
  }, [session]);
  useEffect(() => {
    if (!restored || !settled) return;
    setRestored(false);
    if (cards[0]?.action.kind === "soon") setTeaser(true);
    else setNotice("로그인했어요. 아래 버튼으로 이어서 진행해 주세요.");
  }, [restored, settled, cards]);
  useEffect(() => {
    if (purchase === "credited") setNotice("크레딧이 충전됐어요.");
  }, [purchase]);
  const viewCard = useCallback((tier: number) => {
    if (viewedTiers.current.has(tier)) return;
    viewedTiers.current.add(tier);
    track("paywall_teaser_view", { tier, placement: "result" });
  }, []);
  async function generateReport() {
    const request = loadLastRequest();
    if (!request) {
      setNotice("분석한 대화 정보가 남아 있지 않아요. 대화를 다시 분석한 뒤 리포트를 받아 주세요.");
      return;
    }
    setBusy(true);
    setNotice("");
    track("report_generate_start");
    const result = await postReport(request);
    setBusy(false);
    if (!result.ok) {
      track("report_generate_error", { code: result.code });
      if (result.code === "INSUFFICIENT_CREDITS") setBalance(0);
      setNotice(reportMessage(result.code));
      return;
    }
    track("report_generate_success");
    track("report_view", { source: "inline" });
    setBalance(result.data.balance);
    setReport(result.data.report.content);
  }
  async function startCheckout(product: Product) {
    setBusy(true);
    setNotice("");
    track("checkout_start");
    const created = await postCheckout(product.priceId, await analyticsDistinctId());
    if (!created.ok) {
      setBusy(false);
      setNotice(checkoutMessage(created.code));
      return;
    }
    // A checkout that leaves this page (app-to-app payment) is confirmed on re-entry from this value.
    savePendingPurchase(balance ?? 0);
    checkoutCompleted.current = false;
    try {
      await openCheckout(created.data.transactionId, (event) => {
        if (event === "completed") {
          checkoutCompleted.current = true;
          track("checkout_complete");
          void confirmPurchase();
          return;
        }
        track("checkout_close");
        if (!checkoutCompleted.current) clearPendingPurchase();
      });
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      clearPendingPurchase();
      setNotice("결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  function onCardClick(card: PaywallCard) {
    track("paywall_teaser_click", { tier: card.tier });
    const { action } = card;
    switch (action.kind) {
      case "report":
        void generateReport();
        return;
      case "checkout":
        void startCheckout(action.product);
        return;
      case "login":
        setNotice("");
        try {
          sessionStorage.setItem(pendingTierKey, String(card.tier));
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          setNotice("로그인 후 궁금한 유료 카드를 다시 눌러 주세요.");
        }
        setLoginOpen(true);
        track("login_dialog_view", { tier: card.tier });
        return;
      case "soon":
        setTeaser(true);
        return;
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  }
  return (
    <>
      <section className="paywall">
        <div className="section-label">
          <h2>조금 더 궁금하다면</h2>
          <Badge>{checkoutAvailable ? "리포트" : "곧 만나요"}</Badge>
        </div>
        {session && (
          <PaywallAccount
            nickname={nicknameFromMetadata(session.user.user_metadata) ?? "회원"}
            balance={balance}
            onCoupon={() => setCouponOpen(true)}
            onNotice={setNotice}
          />
        )}
        {cards.map((card) => (
          <PaywallCardView
            key={card.key}
            card={card}
            busy={busy}
            disabled={(authEnabled && !ready) || awaitingCredits}
            onClick={onCardClick}
            onView={viewCard}
          />
        ))}
        {purchase === "checking" && (
          <p role="status" className="action-notice">
            결제를 확인하고 있어요...
          </p>
        )}
        {purchase === "timeout" && (
          <div role="status" className="purchase-timeout">
            <p>결제 확인 중이에요. 잠시 후 다시 확인해 주세요.</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              새로고침
            </Button>
          </div>
        )}
        {notice && (
          <p role="status" className="action-notice">
            {notice}
          </p>
        )}
      </section>
      {report && <PaidReport report={report} />}
      <Dialog open={teaser} onOpenChange={setTeaser}>
        <DialogContent>
          <DialogTitle>곧 오픈될 서비스입니다!</DialogTitle>
          <DialogDescription>(1차 MVP 테스트 중) 조금만 기다려 주세요.</DialogDescription>
        </DialogContent>
      </Dialog>
      <LoginDialog
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open);
          if (open) return;
          try {
            sessionStorage.removeItem(pendingTierKey);
          } catch (error) {
            if (!(error instanceof Error)) throw error;
          }
        }}
      />
      <CouponDialog open={couponOpen} onOpenChange={setCouponOpen} onRedeemed={setBalance} />
    </>
  );
}

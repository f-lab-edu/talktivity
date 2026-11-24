"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export function PaywallAccount({
  nickname,
  balance,
  onCoupon,
  onNotice,
}: {
  readonly nickname: string;
  readonly balance: number | null;
  readonly onCoupon: () => void;
  readonly onNotice: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await signOut();
      onNotice("로그아웃했어요.");
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      onNotice("로그아웃하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="paywall-account">
      <span>
        {nickname}님 · 크레딧 {balance ?? "-"}개
      </span>
      <div className="account-actions">
        <Button asChild variant="ghost">
          <Link href="/reports">내 리포트</Link>
        </Button>
        <Button variant="ghost" onClick={onCoupon}>
          쿠폰 등록
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void logout()}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}

"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { track } from "@/lib/analytics";
import { couponMessage, postCoupon } from "@/lib/billing-client";

export function CouponDialog({
  open,
  onOpenChange,
  onRedeemed,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRedeemed: (balance: number) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function redeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setMessage("");
    const result = await postCoupon(code.trim());
    setBusy(false);
    if (!result.ok) {
      track("coupon_redeem_error", { code: result.code });
      setMessage(couponMessage(result.code));
      return;
    }
    track("coupon_redeem_success", { credited: result.data.credited });
    onRedeemed(result.data.balance);
    setCode("");
    setMessage(`${result.data.credited}크레딧이 충전됐어요.`);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setMessage("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogTitle>쿠폰 등록</DialogTitle>
        <DialogDescription>받은 쿠폰 코드를 입력하면 크레딧이 충전돼요.</DialogDescription>
        <form className="coupon-form" onSubmit={(event) => void redeem(event)}>
          <label htmlFor="coupon-code">쿠폰 코드</label>
          <input
            id="coupon-code"
            className="text-field"
            value={code}
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={40}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button type="submit" disabled={busy || !code.trim()}>
            {busy ? "확인하는 중..." : "쿠폰 등록"}
          </Button>
        </form>
        <p role="status">{message}</p>
      </DialogContent>
    </Dialog>
  );
}

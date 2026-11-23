"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { authEnabled } from "@/lib/auth-client";
import type { Product } from "@/lib/billing-client";
import { checkoutAvailable } from "@/lib/paddle";
import { fallbackTier, formatPrice, reportTitle } from "@/lib/purchase";

export type CardAction =
  | { readonly kind: "report" }
  | { readonly kind: "checkout"; readonly product: Product }
  | { readonly kind: "login" }
  | { readonly kind: "soon" };
export type PaywallCard = {
  readonly key: string;
  readonly title: string;
  readonly price: string;
  readonly tier: number;
  readonly label: string;
  readonly action: CardAction;
};

// `tier` is the price in won, the key paywall events have always used.
export function buildCards(
  signedIn: boolean,
  balance: number | null,
  products: readonly Product[],
): PaywallCard[] {
  const fallback = {
    key: "fallback",
    title: reportTitle,
    price: formatPrice(fallbackTier, "KRW"),
    tier: fallbackTier,
    label: "리포트 받아보기",
  };
  if (!signedIn)
    return [{ ...fallback, action: authEnabled ? { kind: "login" } : { kind: "soon" } }];
  if (balance !== null && balance >= 1)
    return [
      {
        ...fallback,
        price: "크레딧 1개",
        tier: products[0]?.amount ?? fallbackTier,
        label: "크레딧 1개로 리포트 받기",
        action: { kind: "report" },
      },
    ];
  if (!checkoutAvailable || products.length === 0)
    return [{ ...fallback, action: { kind: "soon" } }];
  return products.map((product) => {
    const price = formatPrice(product.amount, product.currency);
    return {
      key: product.priceId,
      title: product.name,
      price,
      tier: product.amount,
      label: `${price} 결제하고 받기`,
      action: { kind: "checkout", product },
    };
  });
}

export function PaywallCardView({
  card,
  disabled,
  busy,
  onClick,
  onView,
}: {
  readonly card: PaywallCard;
  readonly disabled: boolean;
  readonly busy: boolean;
  readonly onClick: (card: PaywallCard) => void;
  readonly onView: (tier: number) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const { tier } = card;
  useEffect(() => {
    const target = element.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        onView(tier);
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [tier, onView]);
  return (
    <div className="teaser-card" ref={element}>
      <div className="teaser-head">
        <LockKeyhole size={20} />
        <span>{card.title}</span>
        <strong>{card.price}</strong>
      </div>
      <Button className="full-width" disabled={disabled || busy} onClick={() => onClick(card)}>
        {busy ? "잠시만요..." : card.label}
      </Button>
      {card.action.kind === "checkout" && (
        <p className="checkout-notice">
          구매한 크레딧은 7일 이내 사용하지 않으면 전액 환불돼요. 리포트 생성에 사용한 크레딧은
          청약철회가 제한돼요. <Link href="/pricing">요금 안내</Link> ·{" "}
          <Link href="/refund">환불정책</Link>
        </p>
      )}
    </div>
  );
}

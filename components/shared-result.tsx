"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ResultCard } from "@/components/result-card";
import { Button } from "@/components/ui/button";
import { track, typeAnalyticsProps } from "@/lib/analytics";
import { getCharacter } from "@/lib/core/characters";
import type { SharePayloadV2 } from "@/lib/core/share-token";

export function SharedResult({ payload }: { readonly payload: SharePayloadV2 }) {
  useEffect(() => {
    track(
      "shared_page_view",
      typeAnalyticsProps({
        typeCode: payload.typeCode,
        axes: payload.axes,
        badges: payload.badges,
      }),
    );
  }, [payload.typeCode, payload.axes, payload.badges]);
  return (
    <section className="shared-step">
      <p className="eyebrow">친구의 결과</p>
      <h1 className="step-title">이런 톡 본캐였구나!</h1>
      <ResultCard payload={payload} shared />
      <p className="shared-description">{getCharacter(payload.typeCode).description}</p>
      <Button asChild className="full-width">
        <Link href="/" onClick={() => track("shared_page_cta_click")}>
          나도 무료로 팩폭 분석하기 <ArrowRight size={18} />
        </Link>
      </Button>
      <p className="privacy center">가입 없이, 내 대화는 저장 없이.</p>
    </section>
  );
}

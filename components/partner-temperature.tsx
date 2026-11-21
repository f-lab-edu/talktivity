"use client";

import { useId } from "react";
import { paywallSectionId } from "@/components/result-paywall";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import type { AnalysisResult } from "@/lib/core/schema";

const steps = [1, 2, 3, 4, 5] as const;

function scrollToPaywall() {
  const section = document.getElementById(paywallSectionId);
  if (!section) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  section.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  section.focus({ preventScroll: true });
}

export function PartnerTemperature({
  temperature,
}: {
  readonly temperature: NonNullable<AnalysisResult["partnerTemperature"]>;
}) {
  const headingId = useId();
  return (
    <section className="temperature" aria-labelledby={headingId}>
      <h2 id={headingId}>상대 대화 온도</h2>
      <div
        className="temperature-gauge"
        role="img"
        aria-label={`상대 대화 온도 5단계 중 ${temperature.level}단계`}
      >
        {steps.map((step) =>
          step <= temperature.level ? (
            <span key={step} className="temperature-step" aria-hidden="true">
              🔥
            </span>
          ) : (
            <span key={step} className="temperature-step" aria-hidden="true">
              <span className="temperature-empty" />
            </span>
          ),
        )}
      </div>
      <p className="temperature-reason">{temperature.reason}</p>
      <p className="temperature-note">
        상대 메시지의 반응만 보고 매긴 온도예요. 속마음을 단정하지 않아요.
      </p>
      <Button
        variant="ghost"
        className="temperature-detail"
        onClick={() => {
          track("temperature_detail_click", { level: temperature.level });
          scrollToPaywall();
        }}
      >
        왜 이 온도인지 자세히 보기
      </Button>
    </section>
  );
}

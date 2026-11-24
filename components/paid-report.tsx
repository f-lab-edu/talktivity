"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PaidReport as PaidReportContent } from "@/lib/core/billing/paid-report";

function CopyButton({ text }: { readonly text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [state]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setState("failed");
    }
  }
  return (
    <Button variant="outline" className="copy-button" onClick={() => void copy()}>
      {state === "copied" ? (
        <>
          <Check size={15} /> 복사됨
        </>
      ) : state === "failed" ? (
        "복사하지 못했어요"
      ) : (
        <>
          <Copy size={15} /> 복사
        </>
      )}
    </Button>
  );
}

export function PaidReport({ report }: { readonly report: PaidReportContent }) {
  const { headline, partnerMind, replies, nextStep } = report;
  return (
    <article className="paid-report">
      <h2>{headline}</h2>
      <section>
        <h3>상대 말투에 남은 힌트</h3>
        <p>{partnerMind.summary}</p>
        <h4>그렇게 본 근거</h4>
        <ol>
          {partnerMind.signals.map((signal) => (
            <li key={signal}>{signal}</li>
          ))}
        </ol>
        <h4>조심할 점</h4>
        <ul>
          {partnerMind.cautions.map((caution) => (
            <li key={caution}>{caution}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>이렇게 답장해 보세요</h3>
        <ul className="report-replies">
          {replies.map((reply) => (
            <li key={reply.line}>
              <blockquote>{reply.line}</blockquote>
              <p>{reply.intent}</p>
              <CopyButton text={reply.line} />
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3>다음 행동</h3>
        <p>{nextStep}</p>
      </section>
    </article>
  );
}

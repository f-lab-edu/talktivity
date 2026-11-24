"use client";

import { MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { LoadingStage } from "@/lib/flow";

const messages = [
  "카톡 말투 감정 분석 중...",
  "네 가지 말투 축 계산 중...",
  "팩폭 캐릭터 생성 중...",
] as const;
export function LoadingStep({ stage }: { readonly stage: LoadingStage }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (stage === "extract") return;
    const timer = setInterval(() => setIndex((current) => Math.min(current + 1, 2)), 800);
    return () => clearInterval(timer);
  }, [stage]);
  return (
    <section className="loading-step" role="status" aria-live="polite">
      <motion.div
        className="loading-orb"
        animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 2.4, repeat: Infinity }}
      >
        <MessageCircle size={58} strokeWidth={1.5} aria-hidden="true" />
      </motion.div>
      <p className="eyebrow">말투 속 숨은 나를 찾는 중</p>
      <h1 className="loading-title">
        {stage === "extract" ? "캡처에서 대화를 읽는 중" : messages[index]}
      </h1>
      <div className="loading-dots">
        {messages.map((message, i) => (
          <span key={message} className={i <= index ? "active" : ""} />
        ))}
      </div>
      <p className="muted">조금만 기다려요. 팩폭은 따뜻하게 준비할게요.</p>
    </section>
  );
}

"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ResultCard } from "@/components/result-card";
import { RoastRest } from "@/components/roast-rest";
import { Button } from "@/components/ui/button";
import { track, typeAnalyticsProps } from "@/lib/analytics";
import { getCharacter } from "@/lib/core/characters";
import type { TypeCode } from "@/lib/core/classification";
import { quizOptions } from "@/lib/core/quiz";
import type { SharePayloadV2 } from "@/lib/core/share-token";

type QuizState =
  | { readonly kind: "question" }
  | { readonly kind: "revealed"; readonly pick: TypeCode | null };

export function SharedResult({
  payload,
  token,
}: {
  readonly payload: SharePayloadV2;
  readonly token: string;
}) {
  const [state, setState] = useState<QuizState>({ kind: "question" });
  const revealedHeading = useRef<HTMLHeadingElement>(null);
  const character = getCharacter(payload.typeCode);
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
  useEffect(() => {
    if (state.kind === "revealed") revealedHeading.current?.focus();
  }, [state.kind]);
  function answer(pick: TypeCode) {
    track("shared_quiz_answer", { correct: pick === payload.typeCode });
    setState({ kind: "revealed", pick });
  }
  function skip() {
    track("shared_quiz_skip");
    setState({ kind: "revealed", pick: null });
  }
  const pick = state.kind === "revealed" ? state.pick : null;
  const verdict =
    pick === null
      ? ""
      : pick === payload.typeCode
        ? "정답! 역시 찐친"
        : `아쉽! 정답은 ${character.name}`;
  return (
    <section className="shared-step">
      <p className="eyebrow">친구의 결과</p>
      <p className="quiz-verdict" aria-live="polite" data-correct={pick === payload.typeCode}>
        {verdict}
      </p>
      {state.kind === "question" ? (
        <>
          <h1 className="step-title">친구는 카톡할 때 어떤 유형일까?</h1>
          <figure className="quiz-hint">
            <figcaption>팩폭 한 줄 힌트</figcaption>
            <blockquote>{payload.roastLines[0]}</blockquote>
          </figure>
          <ul className="quiz-options" aria-label="유형 보기">
            {quizOptions(payload.typeCode, token).map((code) => {
              const option = getCharacter(code);
              return (
                <li key={code}>
                  <button type="button" className="quiz-option" onClick={() => answer(code)}>
                    <Image
                      src={`/characters/${option.assetId}.svg`}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                    />
                    <span>{option.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <Button variant="ghost" className="full-width" onClick={skip}>
            그냥 결과 볼래
          </Button>
        </>
      ) : (
        <>
          <h1 className="step-title" ref={revealedHeading} tabIndex={-1}>
            이런 톡 본캐였구나!
          </h1>
          <ResultCard payload={payload} shared />
          <RoastRest roastLines={payload.roastLines} />
          <p className="shared-description">{character.description}</p>
          <Button asChild className="full-width">
            <Link
              href="/?from=shared"
              onClick={() => track("shared_page_cta_click", { answered: pick !== null })}
            >
              너는 뭐 나올 것 같아? 3초 만에 확인 <ArrowRight size={18} />
            </Link>
          </Button>
          <Link href="/types" className="text-link">
            다른 유형도 구경하기
          </Link>
          <p className="privacy center">가입 없이, 내 대화는 저장 없이.</p>
        </>
      )}
    </section>
  );
}

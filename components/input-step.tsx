"use client";

import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { exampleConversation } from "@/lib/core/example";
import { speakersIn } from "@/lib/core/parse-kakao";
import { type AnalysisRequest, relationships, requestSchema } from "@/lib/core/schema";

export function InputStep({
  onSubmit,
  onBack,
  apiError,
}: {
  readonly onSubmit: (request: AnalysisRequest) => void;
  readonly onBack: () => void;
  readonly apiError: string | null;
}) {
  const [conversation, setConversation] = useState("");
  const [relationship, setRelationship] = useState("");
  const [mySpeaker, setMySpeaker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const speakers = speakersIn(conversation);
  function submit() {
    const parsed = requestSchema.safeParse({
      conversation,
      relationship,
      ...(mySpeaker ? { mySpeaker } : {}),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.");
      return;
    }
    if (speakers.length >= 2 && !speakers.includes(mySpeaker)) {
      setError("나는 누구인지 선택해 주세요.");
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }
  return (
    <section className="input-step">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> 처음으로
      </button>
      <p className="eyebrow">대화 두 줄이면 준비 끝</p>
      <h1 className="step-title">
        우리 사이,
        <br />
        말투에 다 나와요.
      </h1>
      <p className="muted">최근 카톡 대화 3~5줄을 붙여 넣어 주세요.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="conversation">분석할 대화</label>
        <textarea
          id="conversation"
          value={conversation}
          onChange={(event) => setConversation(event.target.value)}
          placeholder={exampleConversation}
          maxLength={1500}
          rows={8}
          aria-describedby="privacy input-error"
        />
        <div className="field-footer">
          <span>이름과 연락처는 자동으로 가려져요</span>
          <span>{conversation.length}/1,500</span>
        </div>
        {speakers.length >= 2 && (
          <fieldset>
            <legend>
              나는 누구? <span className="required">필수</span>
            </legend>
            <div className="chips">
              {speakers.map((speaker) => (
                <button
                  key={speaker}
                  type="button"
                  className="chip"
                  aria-pressed={speaker === mySpeaker}
                  onClick={() => setMySpeaker(speaker)}
                >
                  {speaker}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset>
          <legend>
            어떤 사이인가요? <span className="required">필수</span>
          </legend>
          <div className="chips">
            {relationships.map((item) => (
              <button
                key={item}
                type="button"
                className="chip"
                aria-pressed={item === relationship}
                onClick={() => setRelationship(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>
        <p id="privacy" className="privacy">
          <ShieldCheck size={16} /> 대화 내용은 저장되지 않고 분석에만 사용돼요.
        </p>
        <p id="input-error" className="error-message" role="alert">
          {error ?? apiError}
        </p>
        <Button type="submit" className="full-width">
          팩폭 분석 시작하기 <ArrowRight size={18} />
        </Button>
      </form>
    </section>
  );
}

"use client";

import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { exampleConversation } from "@/lib/core/example";
import { speakersIn } from "@/lib/core/parse-kakao";
import { type AnalysisRequest, errorSchema, relationships, requestSchema } from "@/lib/core/schema";
import { type Draft, loadDraft, saveDraft } from "@/lib/draft";
import { compressScreenshot } from "@/lib/screenshot";

const maxScreenshots = 3;

export function InputStep({
  onSubmit,
  onBack,
  apiError,
}: {
  readonly onSubmit: (request: AnalysisRequest) => void;
  readonly onBack: () => void;
  readonly apiError: string | null;
}) {
  const [initial] = useState(loadDraft);
  const [conversation, setConversation] = useState(initial?.conversation ?? "");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "");
  const [mySpeaker, setMySpeaker] = useState(initial?.mySpeaker ?? "");
  const [source, setSource] = useState<Draft["source"]>(initial?.source ?? null);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const speakers = speakersIn(conversation);
  useEffect(() => {
    saveDraft({ conversation, relationship, mySpeaker, source });
  }, [conversation, relationship, mySpeaker, source]);

  async function readScreenshots(files: readonly File[]) {
    if (files.length === 0) return;
    if (files.length > maxScreenshots) {
      setError(`캡처는 ${maxScreenshots}장까지 올릴 수 있어요.`);
      return;
    }
    setError(null);
    setExtracting(true);
    track("extract_submit", { count: files.length });
    try {
      const form = new FormData();
      for (const [index, file] of files.entries())
        form.append("images", await compressScreenshot(file), `capture-${index + 1}.jpg`);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/api/extract`, {
        method: "POST",
        body: form,
        signal: AbortSignal.timeout(50_000),
      });
      const json: unknown = await response.json();
      if (!response.ok) {
        const parsed = errorSchema.safeParse(json);
        track("extract_error", { code: parsed.success ? parsed.data.error.code : "HTTP_ERROR" });
        setError(parsed.success ? parsed.data.error.message : "캡처를 읽지 못했어요.");
        return;
      }
      const text =
        typeof json === "object" && json !== null && "conversation" in json
          ? json.conversation
          : null;
      if (typeof text !== "string") throw new Error("Unexpected extract response");
      track("extract_success");
      setConversation(text);
      setMySpeaker("나");
      setSource("screenshot");
    } catch (caught) {
      if (!(caught instanceof Error)) throw caught;
      track("extract_error", { code: "CLIENT_ERROR" });
      setError("캡처를 읽지 못했어요. 다시 올려 주세요.");
    } finally {
      setExtracting(false);
    }
  }

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
      <p className="eyebrow">캡처 한 장이면 준비 끝</p>
      <h1 className="step-title">
        우리 사이,
        <br />
        말투에 다 나와요.
      </h1>
      <ol className="capture-guide">
        <li>카톡으로 돌아가 대화방을 캡처해요</li>
        <li>다시 이 화면으로 와서 캡처를 올려요</li>
      </ol>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void readScreenshots(files);
          }}
        />
        <button
          type="button"
          className="upload-card"
          disabled={extracting}
          onClick={() => fileInput.current?.click()}
        >
          {extracting ? (
            <>
              <LoaderCircle size={28} className="spin" />
              <strong>대화 읽는 중…</strong>
              <span>10초 정도 걸려요</span>
            </>
          ) : (
            <>
              <ImagePlus size={28} />
              <strong>{source === "screenshot" ? "캡처 다시 올리기" : "카톡 캡처 올리기"}</strong>
              <span>최대 {maxScreenshots}장 · 올린 순서대로 읽어요</span>
            </>
          )}
        </button>
        {source === null ? (
          <button
            type="button"
            className="text-mode-link"
            onClick={() => {
              track("input_mode_text");
              setSource("text");
            }}
          >
            캡처 대신 직접 붙여넣을게요
          </button>
        ) : (
          <>
            <label htmlFor="conversation">
              {source === "screenshot" ? "읽어 온 대화" : "분석할 대화"}
            </label>
            <textarea
              id="conversation"
              value={conversation}
              onChange={(event) => setConversation(event.target.value)}
              placeholder={exampleConversation}
              maxLength={1500}
              rows={source === "screenshot" ? 6 : 8}
              aria-describedby="privacy input-error"
            />
            <div className="field-footer">
              <span>
                {source === "screenshot"
                  ? "틀리게 읽은 부분은 고쳐도 돼요"
                  : "이름과 연락처는 자동으로 가려져요"}
              </span>
              <span>{conversation.length}/1,500</span>
            </div>
          </>
        )}
        {source === "text" && speakers.length >= 2 && (
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
          <ShieldCheck size={16} /> 캡처와 대화는 저장하지 않고, 이름은 '상대'로 바꿔 분석해요.
        </p>
        <p id="input-error" className="error-message" role="alert">
          {error ?? apiError}
        </p>
        <Button type="submit" className="full-width" disabled={extracting}>
          팩폭 분석 시작하기 <ArrowRight size={18} />
        </Button>
      </form>
    </section>
  );
}

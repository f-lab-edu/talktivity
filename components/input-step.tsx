"use client";

import { ArrowLeft, ArrowRight, ImagePlus, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { RelationshipField } from "@/components/relationship-field";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { exampleConversation } from "@/lib/core/example";
import { speakersIn } from "@/lib/core/parse-kakao";
import { type AnalysisRequest, requestSchema } from "@/lib/core/schema";
import { type Draft, loadDraft, saveDraft } from "@/lib/draft";
import { moveItem } from "@/lib/reorder";

const maxScreenshots = 3;

type Drag = {
  readonly from: number;
  readonly over: number;
  readonly dx: number;
  readonly dy: number;
  readonly slot: number;
};

type DragOrigin = {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly centers: readonly number[];
};

function thumbTransform(drag: Drag | null, index: number): string | undefined {
  if (!drag) return undefined;
  if (index === drag.from) return `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`;
  if (drag.from < drag.over && index > drag.from && index <= drag.over) {
    return `translateX(${-drag.slot}px)`;
  }
  if (drag.from > drag.over && index >= drag.over && index < drag.from) {
    return `translateX(${drag.slot}px)`;
  }
  return undefined;
}

export type ScreenshotSubmission = {
  readonly files: readonly File[];
  readonly relationship: string;
};

export function InputStep({
  onSubmit,
  onScreenshotsSubmit,
  onBack,
  apiError,
}: {
  readonly onSubmit: (request: AnalysisRequest) => void;
  readonly onScreenshotsSubmit: (submission: ScreenshotSubmission) => void;
  readonly onBack: () => void;
  readonly apiError: string | null;
}) {
  const [initial] = useState(loadDraft);
  const [conversation, setConversation] = useState(initial?.conversation ?? "");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "");
  const [mySpeaker, setMySpeaker] = useState(initial?.mySpeaker ?? "");
  const [source, setSource] = useState<Draft["source"]>(initial?.source ?? null);
  const [files, setFiles] = useState<readonly File[]>([]);
  const [previews, setPreviews] = useState<ReadonlyMap<File, string>>(new Map());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef(new Map<File, string>());
  const thumbs = useRef<(HTMLLIElement | null)[]>([]);
  const dragOrigin = useRef<DragOrigin | null>(null);
  const speakers = speakersIn(conversation);
  useEffect(() => {
    saveDraft({ conversation, relationship, mySpeaker, source });
  }, [conversation, relationship, mySpeaker, source]);
  useEffect(() => {
    const next = new Map<File, string>();
    for (const file of files) {
      next.set(file, objectUrls.current.get(file) ?? URL.createObjectURL(file));
    }
    for (const [file, url] of objectUrls.current) {
      if (!next.has(file)) URL.revokeObjectURL(url);
    }
    objectUrls.current = next;
    setPreviews(next);
  }, [files]);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of objectUrls.current.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function startDrag(event: PointerEvent<HTMLLIElement>, index: number) {
    if (dragOrigin.current) return;
    const centers = thumbs.current.slice(0, files.length).map((thumb) => {
      const rect = thumb?.getBoundingClientRect();
      return rect ? rect.left + rect.width / 2 : 0;
    });
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      centers,
    };
    const slot = centers.length > 1 ? Math.abs((centers[1] ?? 0) - (centers[0] ?? 0)) : 0;
    setDrag({ from: index, over: index, dx: 0, dy: 0, slot });
  }

  function moveDrag(event: PointerEvent<HTMLLIElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    setDrag((current) => {
      if (!current) return current;
      const dx = event.clientX - origin.startX;
      const position = (origin.centers[current.from] ?? 0) + dx;
      let over = current.from;
      let nearest = Number.POSITIVE_INFINITY;
      for (const [index, center] of origin.centers.entries()) {
        const distance = Math.abs(center - position);
        if (distance < nearest) {
          nearest = distance;
          over = index;
        }
      }
      return { ...current, over, dx, dy: event.clientY - origin.startY };
    });
  }

  function endDrag(event: PointerEvent<HTMLLIElement>) {
    const origin = dragOrigin.current;
    if (!origin || origin.pointerId !== event.pointerId) return;
    dragOrigin.current = null;
    if (drag && drag.over !== drag.from) {
      setFiles((current) => moveItem(current, drag.from, drag.over));
    }
    setDrag(null);
  }

  function cancelDrag(event: PointerEvent<HTMLLIElement>) {
    if (dragOrigin.current?.pointerId !== event.pointerId) return;
    dragOrigin.current = null;
    setDrag(null);
  }

  function selectScreenshots(selected: readonly File[]) {
    if (selected.length === 0) return;
    if (selected.length > maxScreenshots) {
      setError(`캡처는 ${maxScreenshots}장까지 올릴 수 있어요.`);
      return;
    }
    setError(null);
    setFiles(selected);
    setSource("screenshot");
  }

  function submit() {
    if (source === "screenshot") {
      const parsed = requestSchema.shape.relationship.safeParse(relationship);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "입력을 확인해 주세요.");
        return;
      }
      if (files.length === 0) {
        setError("캡처 이미지를 1~3장 올려 주세요.");
        return;
      }
      setError(null);
      onScreenshotsSubmit({ files, relationship: parsed.data });
      return;
    }
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
            selectScreenshots(files);
          }}
        />
        <button type="button" className="upload-card" onClick={() => fileInput.current?.click()}>
          <ImagePlus size={28} />
          <strong>{files.length ? `캡처 ${files.length}장 선택됨` : "카톡 캡처 올리기"}</strong>
          <span>
            {files.length
              ? "다시 누르면 캡처를 새로 선택할 수 있어요"
              : `최대 ${maxScreenshots}장 · 올린 순서대로 읽어요`}
          </span>
        </button>
        {files.length > 0 && (
          <>
            <ol
              className={drag ? "capture-previews is-sorting" : "capture-previews"}
              aria-label="선택한 캡처, 읽는 순서"
            >
              {files.map((file, index) => {
                const url = previews.get(file);
                if (!url) return null;
                return (
                  <li
                    key={url}
                    ref={(node) => {
                      thumbs.current[index] = node;
                    }}
                    className={drag?.from === index ? "capture-thumb is-dragging" : "capture-thumb"}
                    style={{ transform: thumbTransform(drag, index) }}
                    onPointerDown={(event) => startDrag(event, index)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={cancelDrag}
                  >
                    <Image
                      src={url}
                      alt={`캡처 ${index + 1}`}
                      width={80}
                      height={80}
                      draggable={false}
                      unoptimized
                    />
                    <span className="capture-order" aria-hidden="true">
                      {index + 1}
                    </span>
                  </li>
                );
              })}
            </ol>
            {files.length > 1 && <p className="capture-hint">끌어서 읽을 순서를 바꿀 수 있어요</p>}
          </>
        )}
        {source !== "text" ? (
          <button
            type="button"
            className="text-mode-link"
            onClick={() => {
              track("input_mode_text");
              setFiles([]);
              setSource("text");
            }}
          >
            캡처 대신 직접 붙여넣을게요
          </button>
        ) : (
          <>
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
        <RelationshipField value={relationship} onChange={setRelationship} />
        <p id="privacy" className="privacy">
          <ShieldCheck size={16} /> 캡처와 대화는 저장하지 않고, 이름은 '상대'로 바꿔 분석해요.
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

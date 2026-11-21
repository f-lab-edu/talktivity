"use client";

import { useState } from "react";
import { moreRelationships, primaryRelationships, relationshipPresets } from "@/lib/core/schema";

export function RelationshipField({
  value,
  onChange,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [expanded, setExpanded] = useState(() =>
    moreRelationships.some((preset) => preset === value),
  );
  const [customMode, setCustomMode] = useState(
    () => value.length > 0 && !relationshipPresets.some((preset) => preset === value),
  );
  const [customText, setCustomText] = useState(() =>
    relationshipPresets.some((preset) => preset === value) ? "" : value,
  );

  function selectPreset(preset: string) {
    setCustomMode(false);
    onChange(preset);
  }

  return (
    <fieldset>
      <legend>
        어떤 사이인가요? <span className="required">필수</span>
      </legend>
      <div className="chips">
        {primaryRelationships.map((preset) => (
          <button
            key={preset}
            type="button"
            className="chip"
            aria-pressed={!customMode && value === preset}
            onClick={() => selectPreset(preset)}
          >
            {preset}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          aria-expanded={expanded}
          aria-controls="more-relationships"
          onClick={() => setExpanded(!expanded)}
        >
          더보기
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={customMode}
          aria-expanded={customMode}
          aria-controls="custom-relationship"
          onClick={() => {
            setCustomMode(true);
            onChange(customText);
          }}
        >
          직접 입력
        </button>
      </div>
      <div id="more-relationships" className="relationship-more" hidden={!expanded}>
        <div className="chips">
          {moreRelationships.map((preset) => (
            <button
              key={preset}
              type="button"
              className="chip"
              aria-pressed={!customMode && value === preset}
              onClick={() => selectPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
      <div id="custom-relationship" className="relationship-custom" hidden={!customMode}>
        <label htmlFor="relationship">관계 직접 입력</label>
        <input
          id="relationship"
          type="text"
          value={customText}
          maxLength={20}
          aria-describedby="relationship-count input-error"
          onChange={(event) => {
            setCustomText(event.target.value);
            onChange(event.target.value);
          }}
        />
        <div className="field-footer">
          <span id="relationship-count">{customText.length}/20</span>
        </div>
      </div>
    </fieldset>
  );
}

"use client";

import { z } from "zod";

const draftKey = "talktivity:draft";
const draftSchema = z.object({
  conversation: z.string(),
  relationship: z.string(),
  mySpeaker: z.string(),
  source: z.enum(["screenshot", "text"]).nullable(),
});
export type Draft = z.infer<typeof draftSchema>;

export function loadDraft(): Draft | null {
  try {
    const saved = localStorage.getItem(draftKey);
    if (!saved) return null;
    const parsed = draftSchema.safeParse(JSON.parse(saved));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return null;
  }
}

export function saveDraft(draft: Draft) {
  try {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(draftKey);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }
}

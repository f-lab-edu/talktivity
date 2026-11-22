"use client";

import Link from "next/link";
import { homeEvent, resultStorageKey, stepStorageKey } from "@/lib/flow";

export function HomeLink() {
  function goHome() {
    try {
      sessionStorage.removeItem(resultStorageKey);
      sessionStorage.removeItem(stepStorageKey);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
    window.dispatchEvent(new Event(homeEvent));
  }
  return (
    <Link href="/" className="wordmark" onClick={goHome}>
      talktivity<span>●</span>
    </Link>
  );
}

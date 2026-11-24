"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Credits, getCredits } from "@/lib/billing-client";
import {
  checkPurchase,
  clearPendingPurchase,
  loadPendingPurchase,
  purchasePollIntervalMs,
} from "@/lib/purchase";

export type PurchaseStatus = "idle" | "checking" | "credited" | "timeout";

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export function useCredits(signedIn: boolean) {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [purchase, setPurchase] = useState<PurchaseStatus>("idle");
  const [settled, setSettled] = useState(false);
  const polling = useRef<AbortController | null>(null);

  // Polls /api/credits until the pre-checkout balance (kept as pending-purchase) grows or time runs out.
  const confirmPurchase = useCallback(async () => {
    const previous = loadPendingPurchase();
    if (previous === null) return;
    polling.current?.abort();
    const controller = new AbortController();
    polling.current = controller;
    setPurchase("checking");
    const startedAt = Date.now();
    for (;;) {
      const result = await getCredits();
      if (controller.signal.aborted) return;
      if (result.ok) setCredits(result.data);
      setSettled(true);
      const step = checkPurchase(
        previous,
        result.ok ? result.data.balance : previous,
        Date.now() - startedAt,
      );
      if (step !== "waiting") {
        if (step === "credited") clearPendingPurchase();
        setPurchase(step);
        return;
      }
      await pause(purchasePollIntervalMs, controller.signal);
      if (controller.signal.aborted) return;
    }
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setCredits(null);
      setSettled(false);
      return;
    }
    let active = true;
    if (loadPendingPurchase() !== null) void confirmPurchase();
    else
      void getCredits().then((result) => {
        if (!active) return;
        if (result.ok) setCredits(result.data);
        setSettled(true);
      });
    return () => {
      active = false;
      polling.current?.abort();
    };
  }, [signedIn, confirmPurchase]);

  const setBalance = useCallback((balance: number) => {
    setCredits((current) => (current ? { ...current, balance } : current));
  }, []);

  // `settled` turns true after the first credits request finishes, even when it failed.
  return { credits, settled, purchase, confirmPurchase, setBalance };
}

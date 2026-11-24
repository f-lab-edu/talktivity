"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { z } from "zod";
import { ReportsGate } from "@/components/reports-gate";
import { Button } from "@/components/ui/button";
import { getReports } from "@/lib/billing-client";
import type { reportsListResponseSchema } from "@/lib/core/billing/contracts";

type ReportSummary = z.infer<typeof reportsListResponseSchema>["reports"][number];
type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly reports: readonly ReportSummary[] };

export const reportDate = (createdAt: string) =>
  new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function Reports() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    void getReports().then((result) => {
      if (!active) return;
      setState(result.ok ? { status: "ready", reports: result.data.reports } : { status: "error" });
    });
    return () => {
      active = false;
    };
  }, []);
  switch (state.status) {
    case "loading":
      return <p className="muted">불러오는 중...</p>;
    case "error":
      return (
        <p className="error-message">리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      );
    case "ready":
      return state.reports.length === 0 ? (
        <div className="reports-empty">
          <p>아직 받은 리포트가 없어요.</p>
          <Button asChild>
            <Link href="/">대화 분석하러 가기</Link>
          </Button>
        </div>
      ) : (
        <ul className="report-list">
          {state.reports.map((report) => (
            <li key={report.id}>
              <Link href={`/reports/${report.id}`}>
                <strong>{report.headline}</strong>
                <time dateTime={report.createdAt}>{reportDate(report.createdAt)}</time>
              </Link>
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function ReportList() {
  return (
    <section className="reports-page">
      <h1>내 리포트</h1>
      <ReportsGate returnPath="/reports">
        <Reports />
      </ReportsGate>
    </section>
  );
}

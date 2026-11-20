"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaidReport } from "@/components/paid-report";
import { reportDate } from "@/components/report-list";
import { ReportsGate } from "@/components/reports-gate";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { getReport } from "@/lib/billing-client";
import type { PaidReport as PaidReportContent } from "@/lib/core/billing/paid-report";

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly content: PaidReportContent; readonly createdAt: string };

function Detail({ id }: { readonly id: string }) {
  const [state, setState] = useState<DetailState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    void getReport(id).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setState({ status: result.code === "REPORT_NOT_FOUND" ? "missing" : "error" });
        return;
      }
      track("report_view", { source: "list" });
      setState({
        status: "ready",
        content: result.data.report.content,
        createdAt: result.data.report.createdAt,
      });
    });
    return () => {
      active = false;
    };
  }, [id]);
  switch (state.status) {
    case "loading":
      return <p className="muted">불러오는 중...</p>;
    case "missing":
      return (
        <div className="reports-empty">
          <p>리포트를 찾을 수 없어요.</p>
          <Button asChild variant="outline">
            <Link href="/reports">내 리포트로 돌아가기</Link>
          </Button>
        </div>
      );
    case "error":
      return (
        <p className="error-message">리포트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>
      );
    case "ready":
      return (
        <>
          <p className="muted">{reportDate(state.createdAt)}</p>
          <PaidReport report={state.content} />
        </>
      );
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function ReportDetail({ id }: { readonly id: string }) {
  return (
    <section className="reports-page">
      <Button asChild variant="ghost">
        <Link href="/reports">← 내 리포트</Link>
      </Button>
      <ReportsGate returnPath={`/reports/${id}`}>
        <Detail id={id} />
      </ReportsGate>
    </section>
  );
}

import type { Metadata } from "next";
import { ReportList } from "@/components/report-list";

export const metadata: Metadata = {
  title: "내 리포트 | 톡티비티",
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return <ReportList />;
}

import type { Metadata } from "next";
import { ReportDetail } from "@/components/report-detail";

export const metadata: Metadata = {
  title: "리포트 | 톡티비티",
  robots: { index: false, follow: false },
};

export default async function ReportPage({ params }: { readonly params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetail id={id} />;
}

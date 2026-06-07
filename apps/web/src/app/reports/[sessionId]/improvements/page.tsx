"use client";

import Link from "next/link";
import { use } from "react";

import { ReportFailedState } from "@/components/report/ReportFailedState";
import { ReportImprovementsPanel } from "@/components/report/ReportImprovementsPanel";
import { ReportLoadingState } from "@/components/report/ReportLoadingState";
import { ReportPendingState } from "@/components/report/ReportPendingState";
import {
  readReportPreviewFromSearchParams,
  usePracticeReport,
} from "@/hooks/usePracticeReport";

type ReportImprovementsPageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function ReportImprovementsPage({
  params,
  searchParams,
}: ReportImprovementsPageProps) {
  const { sessionId } = use(params);
  const resolvedSearchParams = use(searchParams);
  const previewStatus = readReportPreviewFromSearchParams(resolvedSearchParams);
  const { status, report, errorMessage, isMockFallback, reload } = usePracticeReport({
    sessionId,
    previewStatus,
  });

  return (
    <section className="report-shell" aria-labelledby="report-improvements-title">
      <Link className="back-link" href={`/reports/${sessionId}`}>
        返回报告总览
      </Link>

      {status === "loading" ? <ReportLoadingState /> : null}

      {status === "error" ? (
        <div className="report-card report-state-card" role="alert">
          <h1 className="report-state-title" id="report-improvements-title">
            改进详情暂不可用
          </h1>
          <p className="report-state-message">{errorMessage}</p>
          <div className="report-actions">
            <button className="primary-action" type="button" onClick={reload}>
              重试
            </button>
            <Link className="secondary-action secondary-action-inline" href={`/reports/${sessionId}`}>
              返回报告总览
            </Link>
          </div>
        </div>
      ) : null}

      {status === "ready" && report?.status === "pending" ? (
        <ReportPendingState onRetry={reload} />
      ) : null}

      {status === "ready" && report?.status === "failed" ? (
        <ReportFailedState message={report.error.message} onRetry={reload} />
      ) : null}

      {status === "ready" && report?.status === "completed" ? (
        <ReportImprovementsPanel
          sessionId={sessionId}
          report={report}
          isMockFallback={isMockFallback}
        />
      ) : null}
    </section>
  );
}

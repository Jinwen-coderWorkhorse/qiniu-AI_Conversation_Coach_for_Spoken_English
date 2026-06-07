"use client";

import Link from "next/link";
import { use } from "react";

import { TranscriptTimeline } from "@/components/history/TranscriptTimeline";
import { usePracticeSessionDetail } from "@/hooks/usePracticeSessionDetail";

type HistoryReviewPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default function HistoryReviewPage({ params }: HistoryReviewPageProps) {
  const { sessionId } = use(params);
  const { status, session, errorMessage, reload } = usePracticeSessionDetail(sessionId);

  return (
    <section className="history-review-shell" aria-labelledby="history-review-title">
      <Link className="back-link" href="/">
        返回首页
      </Link>

      {status === "loading" ? <HistoryReviewLoadingState /> : null}

      {status === "error" ? (
        <div className="history-review-card history-review-state" role="alert">
          <h1 className="history-review-title" id="history-review-title">
            练习回看暂不可用
          </h1>
          <p className="history-review-message">{errorMessage}</p>
          <div className="history-review-actions">
            <button className="primary-action" type="button" onClick={reload}>
              重试
            </button>
            <Link className="secondary-action secondary-action-inline" href="/">
              返回首页
            </Link>
          </div>
        </div>
      ) : null}

      {status === "ready" && session ? (
        <div className="history-review-card">
          <header className="history-review-header">
            <p className="eyebrow">历史回看</p>
            <h1 className="history-review-title" id="history-review-title">
              {session.scenario.name}
            </h1>
            <p className="history-review-meta">
              {formatSessionRange(session.started_at, session.ended_at)}
              <span aria-hidden="true"> · </span>
              {formatSessionStatus(session.status)}
            </p>
          </header>

          <TranscriptTimeline turns={session.turns} />

          <div className="history-review-actions">
            <Link
              className="primary-action primary-action-inline"
              href={`/reports/${sessionId}`}
            >
              查看练习报告
            </Link>
            <Link
              className="secondary-action secondary-action-inline"
              href={`/practice/${session.scenario.slug}/start`}
            >
              再练这个场景
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HistoryReviewLoadingState() {
  return (
    <div
      className="history-review-card history-review-card-loading"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="loading-line loading-line-title" />
      <span className="loading-line" />
      <span className="loading-line loading-line-short" />
      <span className="loading-line" />
      <span className="loading-line loading-line-button" />
    </div>
  );
}

function formatSessionRange(startedAt: string, endedAt?: string | null) {
  const started = formatDateTime(startedAt);
  const ended = endedAt ? formatDateTime(endedAt) : "进行中";

  return `${started} — ${ended}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSessionStatus(status: string) {
  switch (status) {
    case "completed":
      return "已完成";
    case "in_progress":
      return "进行中";
    case "reporting":
      return "报告生成中";
    default:
      return status;
  }
}

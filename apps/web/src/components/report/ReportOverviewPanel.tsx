import Link from "next/link";

import type { ReportCompletedResponse } from "@/lib/api/contracts";
import { SCORE_LABELS } from "@/lib/report/reportItems";

import { ScoreRing } from "./ScoreRing";

type ReportOverviewPanelProps = {
  sessionId: string;
  report: ReportCompletedResponse;
  isMockFallback: boolean;
};

const SCORE_TONES = ["primary", "accent", "gold", "neutral"] as const;

export function ReportOverviewPanel({
  sessionId,
  report,
  isMockFallback,
}: ReportOverviewPanelProps) {
  const { overview } = report;
  const scoreEntries = Object.entries(overview.scores) as Array<
    [keyof typeof SCORE_LABELS, number]
  >;

  return (
    <div className="report-card">
      {isMockFallback ? (
        <p className="report-preview-note" role="status">
          当前展示契约级 mock 数据（开发预览），联调后将读取真实报告接口。
        </p>
      ) : null}

      <div className="report-overview-header">
        <p className="eyebrow">本次得分</p>
        <ScoreRing score={overview.overall_score} size="large" tone="primary" />
        <h1 className="report-level" id="report-overview-title">
          {overview.level_description}
        </h1>
        <p className="report-summary">{overview.one_sentence_summary}</p>
      </div>

      <div className="report-score-grid" aria-label="细分评分">
        {scoreEntries.map(([key, value], index) => (
          <ScoreRing
            key={key}
            score={value}
            label={SCORE_LABELS[key]}
            size="small"
            tone={SCORE_TONES[index % SCORE_TONES.length]}
          />
        ))}
      </div>

      <div className="report-actions">
        <Link
          className="primary-action primary-action-inline"
          href={`/reports/${sessionId}/improvements`}
        >
          查看改进建议
        </Link>
        <Link className="secondary-action secondary-action-inline" href="/">
          再练一次
        </Link>
      </div>
    </div>
  );
}

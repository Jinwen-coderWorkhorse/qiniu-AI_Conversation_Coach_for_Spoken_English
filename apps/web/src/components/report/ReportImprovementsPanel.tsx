import Link from "next/link";

import type { ReportCompletedResponse } from "@/lib/api/contracts";
import {
  getReportItemTypeLabel,
  pickGrammarOrExpressionItem,
  pickPronunciationItem,
} from "@/lib/report/reportItems";

type ReportImprovementsPanelProps = {
  sessionId: string;
  report: ReportCompletedResponse;
  isMockFallback: boolean;
};

export function ReportImprovementsPanel({
  sessionId,
  report,
  isMockFallback,
}: ReportImprovementsPanelProps) {
  const pronunciationItem = pickPronunciationItem(report.items);
  const grammarOrExpressionItem = pickGrammarOrExpressionItem(report.items);

  return (
    <>
      {isMockFallback ? (
        <p className="report-preview-note" role="status">
          当前展示契约级 mock 数据（开发预览），联调后将读取真实报告接口。
        </p>
      ) : null}

      <div className="report-card">
        <div className="report-detail-header">
          <p className="eyebrow">改进详情</p>
          <h1 id="report-improvements-title">具体怎么改</h1>
          <p className="report-detail-summary">
            每次只展示 1 条发音建议和 1 条语法 / 表达建议，方便你马上开口练习。
          </p>
        </div>

        <div className="improvement-list">
          {pronunciationItem ? (
            <ImprovementCard item={pronunciationItem} />
          ) : (
            <EmptyImprovementCard title="发音建议" message="本次练习暂无发音改进建议。" />
          )}

          {grammarOrExpressionItem ? (
            <ImprovementCard item={grammarOrExpressionItem} />
          ) : (
            <EmptyImprovementCard
              title="语法 / 表达建议"
              message="本次练习暂无语法或表达改进建议。"
            />
          )}
        </div>

        <div className="report-actions">
          <Link className="secondary-action secondary-action-inline" href={`/reports/${sessionId}`}>
            返回报告总览
          </Link>
          <Link className="primary-action primary-action-inline" href="/">
            用推荐说法再练一次
          </Link>
        </div>
      </div>
    </>
  );
}

type ImprovementCardProps = {
  item: NonNullable<ReturnType<typeof pickPronunciationItem>>;
};

function ImprovementCard({ item }: ImprovementCardProps) {
  const title = getReportItemTypeLabel(item.type);
  const hasRewrite = Boolean(item.original_text && item.suggestion_text);

  return (
    <article className="improvement-card">
      <h2 className="improvement-card-title">{title}</h2>
      <p className="improvement-card-explanation">{item.explanation}</p>

      {hasRewrite ? (
        <div className="improvement-rewrite">
          <div className="improvement-quote">
            <span className="improvement-quote-label">你刚才说</span>
            <p>{item.original_text}</p>
          </div>
          <div className="improvement-quote improvement-quote-suggested">
            <span className="improvement-quote-label">可以改成</span>
            <p>{item.suggestion_text}</p>
          </div>
        </div>
      ) : null}

      <div className="improvement-practice">
        <span className="improvement-quote-label">推荐复练句</span>
        <p>{item.practice_text}</p>
      </div>
    </article>
  );
}

function EmptyImprovementCard({ title, message }: { title: string; message: string }) {
  return (
    <article className="improvement-card improvement-card-empty">
      <h2 className="improvement-card-title">{title}</h2>
      <p className="improvement-card-explanation">{message}</p>
    </article>
  );
}

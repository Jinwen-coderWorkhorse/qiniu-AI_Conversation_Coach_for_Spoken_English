import Link from "next/link";

type ReportPendingStateProps = {
  onRetry?: () => void;
};

export function ReportPendingState({ onRetry }: ReportPendingStateProps) {
  return (
    <div className="report-card report-state-card" aria-live="polite">
      <div className="report-state-icon report-state-icon-pending" aria-hidden="true">
        ...
      </div>
      <h1 className="report-state-title">正在生成报告</h1>
      <p className="report-state-message">
        系统正在整理本次练习表现，通常需要几秒到十几秒，请稍候。
      </p>
      <div className="report-actions">
        {onRetry ? (
          <button className="secondary-action" type="button" onClick={onRetry}>
            刷新状态
          </button>
        ) : null}
        <Link className="secondary-action secondary-action-inline" href="/">
          返回首页
        </Link>
      </div>
    </div>
  );
}

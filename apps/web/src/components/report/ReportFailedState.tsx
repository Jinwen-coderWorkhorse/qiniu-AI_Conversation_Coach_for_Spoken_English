import Link from "next/link";

type ReportFailedStateProps = {
  message: string;
  onRetry: () => void;
};

export function ReportFailedState({ message, onRetry }: ReportFailedStateProps) {
  return (
    <div className="report-card report-state-card" role="alert">
      <div className="report-state-icon report-state-icon-failed" aria-hidden="true">
        !
      </div>
      <h1 className="report-state-title">报告生成失败</h1>
      <p className="report-state-message">{message}</p>
      <div className="report-actions">
        <button className="primary-action" type="button" onClick={onRetry}>
          稍后重试
        </button>
        <Link className="secondary-action secondary-action-inline" href="/">
          返回首页
        </Link>
      </div>
    </div>
  );
}

type ReportingOverlayProps = {
  message?: string | null;
};

export function ReportingOverlay({ message }: ReportingOverlayProps) {
  return (
    <div className="practice-reporting-overlay" aria-live="polite" aria-busy="true">
      <div className="practice-reporting-card">
        <p className="practice-reporting-eyebrow">报告生成中</p>
        <h2 className="practice-reporting-title">正在整理本次练习</h2>
        <p className="practice-reporting-message">{message ?? "正在生成报告..."}</p>
      </div>
    </div>
  );
}

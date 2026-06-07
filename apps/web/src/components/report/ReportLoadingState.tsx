export function ReportLoadingState() {
  return (
    <div className="report-card report-card-loading" aria-live="polite" aria-busy="true">
      <span className="loading-line loading-line-title" />
      <span className="loading-line" />
      <span className="loading-line loading-line-short" />
      <div className="report-score-grid-loading">
        {Array.from({ length: 4 }, (_, index) => (
          <span className="loading-line score-dial-loading" key={index} />
        ))}
      </div>
      <span className="loading-line loading-line-button" />
    </div>
  );
}

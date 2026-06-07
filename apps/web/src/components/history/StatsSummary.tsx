import type { StatsResponse } from "@/lib/api/contracts";

type StatsSummaryProps = {
  stats: StatsResponse;
};

export function StatsSummary({ stats }: StatsSummaryProps) {
  const trendPoints = stats.score_trend.slice(-5);
  const maxTrendScore = Math.max(...trendPoints.map((point) => point.score), 1);

  return (
    <section className="stats-summary" aria-label="长期练习数据">
      <div className="stats-summary-heading">
        <h2 className="stats-summary-title">长期数据</h2>
        <span className="stats-summary-caption">累计表现</span>
      </div>

      <div className="stats-metric-grid">
        <StatMetric label="练习次数" value={String(stats.practice_count)} />
        <StatMetric label="开口时长" value={`${stats.spoken_minutes} 分钟`} />
        <StatMetric label="开口词数" value={formatWordCount(stats.user_word_count)} />
        <StatMetric
          label="平均得分"
          value={stats.average_score === null ? "暂无" : String(stats.average_score)}
        />
      </div>

      {trendPoints.length > 0 ? (
        <div className="stats-trend" aria-label="近期得分趋势">
          <p className="stats-trend-label">近期得分</p>
          <ul className="stats-trend-list">
            {trendPoints.map((point) => (
              <li className="stats-trend-item" key={point.date}>
                <span className="stats-trend-date">{formatTrendDate(point.date)}</span>
                <span className="stats-trend-bar-track" aria-hidden="true">
                  <span
                    className="stats-trend-bar-fill"
                    style={{ width: `${Math.round((point.score / maxTrendScore) * 100)}%` }}
                  />
                </span>
                <span className="stats-trend-score">{point.score}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="stats-trend-empty">完成更多练习后，这里会展示得分趋势。</p>
      )}
    </section>
  );
}

function StatMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="stats-metric">
      <span className="stats-metric-value">{value}</span>
      <span className="stats-metric-label">{label}</span>
    </div>
  );
}

function formatWordCount(value: number) {
  if (value >= 10000) {
    return `${(value / 10000).toFixed(1)} 万`;
  }

  return String(value);
}

function formatTrendDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

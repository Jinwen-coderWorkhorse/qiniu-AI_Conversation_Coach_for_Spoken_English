type ScoreRingProps = {
  score: number;
  label?: string;
  size?: "large" | "small";
  tone?: "primary" | "accent" | "gold" | "neutral";
};

const RING_CONFIG = {
  large: { diameter: 168, stroke: 12, fontSize: 44 },
  small: { diameter: 96, stroke: 8, fontSize: 22 },
} as const;

export function ScoreRing({
  score,
  label,
  size = "small",
  tone = "primary",
}: ScoreRingProps) {
  const config = RING_CONFIG[size];
  const radius = (config.diameter - config.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.max(0, Math.min(score, 100));
  const dashOffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div
      className={`score-ring score-ring-${size} score-ring-tone-${tone}`}
      aria-label={label ? `${label} ${normalizedScore} 分` : `得分 ${normalizedScore}`}
    >
      <svg
        className="score-ring-svg"
        width={config.diameter}
        height={config.diameter}
        viewBox={`0 0 ${config.diameter} ${config.diameter}`}
        role="img"
        aria-hidden={Boolean(label)}
      >
        <circle
          className="score-ring-track"
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          strokeWidth={config.stroke}
        />
        <circle
          className="score-ring-progress"
          cx={config.diameter / 2}
          cy={config.diameter / 2}
          r={radius}
          strokeWidth={config.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${config.diameter / 2} ${config.diameter / 2})`}
        />
      </svg>
      <div className="score-ring-center">
        <span className="score-ring-value" style={{ fontSize: config.fontSize }}>
          {normalizedScore}
        </span>
        {size === "large" ? <span className="score-ring-max">/100</span> : null}
      </div>
      {label ? <span className="score-ring-label">{label}</span> : null}
    </div>
  );
}

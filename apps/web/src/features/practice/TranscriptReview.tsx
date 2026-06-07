import type { PendingReviewTurn } from "@/store/practiceSlice";

type TranscriptReviewProps = {
  turn: PendingReviewTurn;
  isConfirming?: boolean;
  isDiscarding?: boolean;
  onConfirm: () => void;
  onRetry: () => void;
};

const LOW_CONFIDENCE_HINT = "识别不太确定，建议重说一次。";

export function TranscriptReview({
  turn,
  isConfirming = false,
  isDiscarding = false,
  onConfirm,
  onRetry,
}: TranscriptReviewProps) {
  const confidenceLabel = `${Math.round(turn.asr_confidence * 100)}%`;

  return (
    <section className="practice-transcript-review" aria-labelledby="practice-transcript-review-title">
      <div className="practice-section-heading">
        <h2 id="practice-transcript-review-title">识别结果</h2>
        <span>第 {turn.turn_index} 轮</span>
      </div>

      <p className="practice-transcript-review-text">{turn.transcript}</p>

      <div className="practice-transcript-review-meta">
        <span className="practice-transcript-confidence">
          识别置信度
          <strong>{confidenceLabel}</strong>
        </span>
      </div>

      {turn.needs_retry ? (
        <p className="practice-transcript-review-hint" role="status">
          {turn.hint ?? LOW_CONFIDENCE_HINT}
        </p>
      ) : null}

      <div className="practice-transcript-review-actions">
        <button
          className="primary-action"
          type="button"
          disabled={isConfirming || isDiscarding || turn.needs_retry}
          onClick={onConfirm}
        >
          {isConfirming ? "正在确认..." : "确认"}
        </button>
        <button
          className="secondary-action"
          type="button"
          disabled={isConfirming || isDiscarding}
          onClick={onRetry}
        >
          {isDiscarding ? "正在重说..." : "重说"}
        </button>
      </div>
    </section>
  );
}

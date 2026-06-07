type TurnActionErrorProps = {
  message: string;
  onRetryUpload?: () => void;
  onRetryConfirm?: () => void;
  onRetry?: () => void;
  retryLabel?: string;
};

export function TurnActionError({
  message,
  onRetryUpload,
  onRetryConfirm,
  onRetry,
  retryLabel = "重试",
}: TurnActionErrorProps) {
  return (
    <div className="practice-turn-action-error" role="alert">
      <p className="practice-turn-action-error-message">{message}</p>
      {onRetryUpload ? (
        <button className="secondary-action" type="button" onClick={onRetryUpload}>
          重试上传
        </button>
      ) : null}
      {onRetryConfirm ? (
        <button className="secondary-action" type="button" onClick={onRetryConfirm}>
          重试确认
        </button>
      ) : null}
      {onRetry ? (
        <button className="secondary-action" type="button" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

type TurnActionErrorProps = {
  message: string;
  onRetryUpload?: () => void;
  onRetryConfirm?: () => void;
};

export function TurnActionError({ message, onRetryUpload, onRetryConfirm }: TurnActionErrorProps) {
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
    </div>
  );
}

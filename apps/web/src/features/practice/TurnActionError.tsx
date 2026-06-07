type TurnActionErrorProps = {
  message: string;
  onRetryUpload?: () => void;
};

export function TurnActionError({ message, onRetryUpload }: TurnActionErrorProps) {
  return (
    <div className="practice-turn-action-error" role="alert">
      <p className="practice-turn-action-error-message">{message}</p>
      {onRetryUpload ? (
        <button className="secondary-action" type="button" onClick={onRetryUpload}>
          重试上传
        </button>
      ) : null}
    </div>
  );
}

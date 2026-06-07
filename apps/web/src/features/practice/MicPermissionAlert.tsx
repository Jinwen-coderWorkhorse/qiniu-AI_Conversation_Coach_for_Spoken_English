type MicPermissionAlertProps = {
  message: string;
  onRetry: () => void;
};

export function MicPermissionAlert({ message, onRetry }: MicPermissionAlertProps) {
  return (
    <div className="practice-mic-alert" role="alert">
      <p className="practice-mic-alert-message">{message}</p>
      <button className="state-action state-action-inline" type="button" onClick={onRetry}>
        重新授权麦克风
      </button>
    </div>
  );
}

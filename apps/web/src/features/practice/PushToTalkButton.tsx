type PushToTalkButtonProps = {
  disabled?: boolean;
};

export function PushToTalkButton({ disabled = true }: PushToTalkButtonProps) {
  return (
    <div className="practice-talk-footer">
      <button
        className="push-to-talk-button"
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        aria-label="按住说话（后续版本实现）"
      >
        按住说话
      </button>
      <p className="practice-talk-hint">录音功能将在后续 PR 接入。</p>
    </div>
  );
}

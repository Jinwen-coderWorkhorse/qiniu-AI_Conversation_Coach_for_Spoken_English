type EndPracticeConfirmProps = {
  open: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function EndPracticeConfirm({
  open,
  isSubmitting,
  onCancel,
  onConfirm,
}: EndPracticeConfirmProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="practice-confirm-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="practice-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-practice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="practice-confirm-title" id="end-practice-title">
          结束这次练习？
        </h2>
        <p className="practice-confirm-message">
          结束后会开始生成报告，当前对话将无法继续。请确认你已经完成本轮练习。
        </p>
        <div className="practice-confirm-actions">
          <button className="secondary-action" type="button" disabled={isSubmitting} onClick={onCancel}>
            继续练习
          </button>
          <button
            className="primary-action practice-confirm-submit"
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "结束中..." : "确认结束"}
          </button>
        </div>
      </div>
    </div>
  );
}

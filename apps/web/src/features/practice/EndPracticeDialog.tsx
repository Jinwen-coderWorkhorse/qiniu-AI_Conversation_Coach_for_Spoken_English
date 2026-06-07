"use client";

import { useCallback, useEffect, useId, useRef } from "react";

type EndPracticeDialogProps = {
  isOpen: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function EndPracticeDialog({
  isOpen,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: EndPracticeDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    },
    [isSubmitting, onCancel],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="practice-end-dialog-root">
      <button
        className="practice-end-dialog-backdrop"
        type="button"
        aria-label="取消结束练习"
        disabled={isSubmitting}
        onClick={onCancel}
      />

      <div
        ref={panelRef}
        className="practice-end-dialog-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 className="practice-end-dialog-title" id={titleId}>
          结束这次练习？
        </h2>
        <p className="practice-end-dialog-message">
          结束后会生成本次练习报告，你可以查看得分和改进建议。
        </p>

        <div className="practice-end-dialog-actions">
          <button
            className="secondary-action"
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            继续练习
          </button>
          <button
            className="primary-action"
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? "正在结束..." : "确认结束"}
          </button>
        </div>
      </div>
    </div>
  );
}

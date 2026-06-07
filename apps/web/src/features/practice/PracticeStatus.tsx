import type { CapturedRecordingSummary, PracticeRecordingState } from "@/store/practiceSlice";

type PracticeStatusProps = {
  recordingState: PracticeRecordingState;
  error?: string | null;
  capturedRecording?: CapturedRecordingSummary | null;
};

export function PracticeStatus({
  recordingState,
  error,
  capturedRecording,
}: PracticeStatusProps) {
  const label = getStatusLabel(recordingState, capturedRecording);

  return (
    <section className="practice-status" aria-live="polite">
      <div className="practice-status-row">
        <span className="practice-status-label">当前状态</span>
        <span className="practice-status-value" data-state={recordingState}>
          {label}
        </span>
      </div>

      {recordingState === "error" && error ? (
        <p className="practice-status-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function getStatusLabel(
  state: PracticeRecordingState,
  capturedRecording?: CapturedRecordingSummary | null,
) {
  switch (state) {
    case "loadingOpening":
      return "正在恢复练习...";
    case "ready":
      return capturedRecording ? "录音已暂存，等待上传" : "可以开始说话";
    case "aiSpeaking":
      return "AI 正在发言";
    case "recording":
      return "录音中";
    case "uploading":
      return "上传中";
    case "transcribing":
      return "识别中";
    case "transcriptReview":
      return "等待确认识别结果";
    case "aiThinking":
      return "AI 正在回应";
    case "ending":
      return "结束练习中";
    case "reporting":
      return "报告生成中";
    case "error":
      return "出现异常";
    default:
      return state;
  }
}

import type { CapturedRecordingSummary as CapturedRecordingSummaryType } from "@/store/practiceSlice";

type CapturedRecordingSummaryProps = {
  recording: CapturedRecordingSummaryType;
};

export function CapturedRecordingSummary({ recording }: CapturedRecordingSummaryProps) {
  const sizeLabel = formatFileSize(recording.sizeBytes);
  const stopReasonLabel =
    recording.stopReason === "timeout" ? "已达 60 秒上限并自动停止" : "松开完成录音";

  return (
    <section className="practice-capture-summary" aria-live="polite">
      <div className="practice-section-heading">
        <h2>本地录音结果</h2>
        <span>上传中</span>
      </div>
      <p className="practice-capture-summary-text">
        已录制 {formatDuration(recording.durationMs)} 音频（{recording.mimeType}，{sizeLabel}）。
        {stopReasonLabel}。正在上传到服务器进行识别。
      </p>
    </section>
  );
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
  return `${totalSeconds} 秒`;
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  const kilobytes = sizeBytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

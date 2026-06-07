"use client";

import { MAX_RECORDING_DURATION_MS } from "@/lib/audio/recorder";
import type { PracticeRecordingState } from "@/store/practiceSlice";

import { WaveformMeter } from "./WaveformMeter";

type PushToTalkButtonProps = {
  disabled?: boolean;
  isRecording?: boolean;
  recordingState?: PracticeRecordingState;
  durationMs?: number;
  waveformLevel?: number;
  onPressStart: () => void;
  onPressEnd: () => void;
  onPressCancel: () => void;
};

export function PushToTalkButton({
  disabled = false,
  isRecording = false,
  recordingState = "ready",
  durationMs = 0,
  waveformLevel = 0,
  onPressStart,
  onPressEnd,
  onPressCancel,
}: PushToTalkButtonProps) {
  const label = isRecording ? "松开发送" : "按住说话";
  const timerLabel = formatRecordingDuration(durationMs);
  const hint = getTalkHint(recordingState, isRecording);

  return (
    <div className="practice-talk-footer">
      {isRecording ? (
        <div className="practice-recording-panel" aria-live="polite">
          <WaveformMeter isActive level={waveformLevel} />
          <p className="practice-recording-timer">
            录音中 {timerLabel}
            <span aria-hidden="true"> / </span>
            {formatRecordingDuration(MAX_RECORDING_DURATION_MS)}
          </p>
        </div>
      ) : null}

      <button
        className="push-to-talk-button"
        data-recording={isRecording ? "true" : "false"}
        type="button"
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={label}
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) {
            return;
          }

          event.currentTarget.setPointerCapture(event.pointerId);
          onPressStart();
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          onPressEnd();
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          onPressCancel();
        }}
      >
        {label}
      </button>

      <p className="practice-talk-hint">{hint}</p>
    </div>
  );
}

function getTalkHint(recordingState: PracticeRecordingState, isRecording: boolean) {
  if (isRecording) {
    return "松开结束录音，最长 60 秒。";
  }

  switch (recordingState) {
    case "uploading":
      return "录音已上传，正在发送到服务器。";
    case "transcribing":
      return "正在识别你的语音，请稍候。";
    case "transcriptReview":
      return "请先查看识别结果，或确认 / 重说。";
    case "aiThinking":
      return "AI 正在回应...";
    case "aiSpeaking":
      return "AI 正在发言";
    default:
      return "按住按钮开始说话，松开后自动上传并识别。";
  }
}

function formatRecordingDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

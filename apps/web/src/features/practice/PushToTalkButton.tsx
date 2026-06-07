"use client";

import { MAX_RECORDING_DURATION_MS } from "@/lib/audio/recorder";

import { WaveformMeter } from "./WaveformMeter";

type PushToTalkButtonProps = {
  disabled?: boolean;
  isRecording?: boolean;
  durationMs?: number;
  waveformLevel?: number;
  onPressStart: () => void;
  onPressEnd: () => void;
  onPressCancel: () => void;
};

export function PushToTalkButton({
  disabled = false,
  isRecording = false,
  durationMs = 0,
  waveformLevel = 0,
  onPressStart,
  onPressEnd,
  onPressCancel,
}: PushToTalkButtonProps) {
  const label = isRecording ? "松开发送" : "按住说话";
  const timerLabel = formatRecordingDuration(durationMs);

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

      <p className="practice-talk-hint">
        {isRecording ? "松开结束录音，最长 60 秒。" : "按住按钮开始说话，松开后在本页暂存录音结果。"}
      </p>
    </div>
  );
}

function formatRecordingDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

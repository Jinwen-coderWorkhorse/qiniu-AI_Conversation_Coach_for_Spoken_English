"use client";

import { createWaveformSampler, type WaveformSampler } from "./waveform";

type RecordRTCInstance = InstanceType<typeof import("recordrtc").default>;

let recordRtcModulePromise: Promise<typeof import("recordrtc").default> | null = null;

async function loadRecordRTC() {
  recordRtcModulePromise ??= import("recordrtc").then((module) => module.default);
  return recordRtcModulePromise;
}

export const MAX_RECORDING_DURATION_MS = 60_000;

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

export type RecordingMimeType = (typeof MIME_CANDIDATES)[number] | string;

export type RecordingResult = {
  blob: Blob;
  mimeType: string;
  durationMs: number;
};

export type RecorderStopReason = "released" | "timeout" | "cancelled";

export type PracticeRecorderOptions = {
  onDurationChange?: (durationMs: number) => void;
  onWaveformLevel?: (level: number) => void;
  onAutoStop?: (result: RecordingResult) => void;
};

export class PracticeRecorderError extends Error {
  readonly code: "PERMISSION_DENIED" | "MEDIA_UNAVAILABLE" | "MIME_UNSUPPORTED" | "RECORD_FAILED";

  constructor(
    code: PracticeRecorderError["code"],
    message: string,
  ) {
    super(message);
    this.name = "PracticeRecorderError";
    this.code = code;
  }
}

export function detectRecordingMimeType(): RecordingMimeType | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return null;
}

export function normalizeRecordingMimeType(blob: Blob, preferredMimeType: string) {
  if (blob.type) {
    return blob.type;
  }

  return preferredMimeType.split(";")[0] ?? preferredMimeType;
}

export class PracticeRecorder {
  private stream: MediaStream | null = null;
  private recorder: RecordRTCInstance | null = null;
  private waveformSampler: WaveformSampler | null = null;
  private startedAt = 0;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private waveformTimer: ReturnType<typeof setInterval> | null = null;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private mimeType: RecordingMimeType | null = null;
  private isRecording = false;

  constructor(private readonly options: PracticeRecorderOptions = {}) {}

  get recording() {
    return this.isRecording;
  }

  async start() {
    if (this.isRecording) {
      return;
    }

    this.mimeType = detectRecordingMimeType();

    if (!this.mimeType) {
      throw new PracticeRecorderError(
        "MIME_UNSUPPORTED",
        "当前浏览器暂不支持可用的录音格式，请更换浏览器后重试。",
      );
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (error) {
      throw mapGetUserMediaError(error);
    }

    const RecordRTC = await loadRecordRTC();

    this.recorder = new RecordRTC(this.stream, {
      type: "audio",
      mimeType: this.mimeType,
      numberOfAudioChannels: 1,
    });

    this.waveformSampler = createWaveformSampler(this.stream);
    this.startedAt = Date.now();
    this.isRecording = true;
    this.recorder.startRecording();
    this.startTimers();
  }

  async stop(reason: RecorderStopReason = "released") {
    if (!this.isRecording || !this.recorder) {
      return null;
    }

    this.clearTimers();
    this.isRecording = false;

    const recorder = this.recorder;
    const preferredMimeType = this.mimeType ?? "audio/webm";
    const durationMs =
      reason === "timeout"
        ? MAX_RECORDING_DURATION_MS
        : Math.min(Date.now() - this.startedAt, MAX_RECORDING_DURATION_MS);

    return new Promise<RecordingResult | null>((resolve, reject) => {
      recorder.stopRecording(() => {
        try {
          const blob = recorder.getBlob();

          if (!blob || blob.size === 0) {
            if (reason === "cancelled") {
              resolve(null);
              return;
            }

            reject(
              new PracticeRecorderError("RECORD_FAILED", "未采集到有效音频，请重新按住说话。"),
            );
            return;
          }

          resolve({
            blob,
            mimeType: normalizeRecordingMimeType(blob, preferredMimeType),
            durationMs,
          });
        } catch (error) {
          reject(
            error instanceof PracticeRecorderError
              ? error
              : new PracticeRecorderError("RECORD_FAILED", "录音保存失败，请重试。"),
          );
        } finally {
          this.cleanup();
        }
      });
    });
  }

  dispose() {
    this.clearTimers();
    this.isRecording = false;
    this.cleanup();
  }

  private startTimers() {
    this.durationTimer = setInterval(() => {
      const durationMs = Math.min(Date.now() - this.startedAt, MAX_RECORDING_DURATION_MS);
      this.options.onDurationChange?.(durationMs);
    }, 100);

    this.waveformTimer = setInterval(() => {
      const level = this.waveformSampler?.getLevel() ?? 0;
      this.options.onWaveformLevel?.(level);
    }, 80);

    this.autoStopTimer = setTimeout(() => {
      void this.handleAutoStop();
    }, MAX_RECORDING_DURATION_MS);
  }

  private async handleAutoStop() {
    if (!this.isRecording) {
      return;
    }

    try {
      const result = await this.stop("timeout");

      if (result) {
        this.options.onAutoStop?.(result);
      }
    } catch {
      // The page layer handles recorder errors on the next interaction.
    }
  }

  private clearTimers() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }

    if (this.waveformTimer) {
      clearInterval(this.waveformTimer);
      this.waveformTimer = null;
    }

    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = null;
    }
  }

  private cleanup() {
    this.waveformSampler?.close();
    this.waveformSampler = null;

    this.recorder?.destroy();
    this.recorder = null;

    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.mimeType = null;
  }
}

function mapGetUserMediaError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      return new PracticeRecorderError(
        "PERMISSION_DENIED",
        "麦克风权限被拒绝，请在浏览器设置中允许访问麦克风后重试。",
      );
    }

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return new PracticeRecorderError(
        "MEDIA_UNAVAILABLE",
        "未检测到可用麦克风，请连接设备后重试。",
      );
    }
  }

  return new PracticeRecorderError(
    "MEDIA_UNAVAILABLE",
    "无法访问麦克风，请检查设备与浏览器权限后重试。",
  );
}

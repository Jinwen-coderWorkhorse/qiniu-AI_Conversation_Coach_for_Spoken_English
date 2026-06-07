declare module "recordrtc" {
  export type RecordRTCOptions = {
    type?: "audio" | "video" | "gif";
    mimeType?: string;
    recorderType?: unknown;
    numberOfAudioChannels?: number;
    desiredSampRate?: number;
    timeSlice?: number;
  };

  export default class RecordRTC {
    constructor(stream: MediaStream, options?: RecordRTCOptions);
    startRecording(): void;
    stopRecording(callback?: () => void): void;
    pauseRecording(): void;
    resumeRecording(): void;
    getBlob(): Blob;
    destroy(): void;
    getState(): string;
    static StereoAudioRecorder: unknown;
  }
}

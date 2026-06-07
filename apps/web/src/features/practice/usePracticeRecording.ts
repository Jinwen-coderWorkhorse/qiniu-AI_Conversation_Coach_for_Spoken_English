"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  PracticeRecorder,
  PracticeRecorderError,
  type RecordingResult,
} from "@/lib/audio/recorder";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearCapturedRecording,
  clearMicPermissionError,
  setCapturedRecording,
  setMicPermissionError,
  setPracticeError,
  setRecordingDurationMs,
  setRecordingState,
  setWaveformLevel,
} from "@/store/practiceSlice";

import { selectPracticeSession } from "./practiceSelectors";

export function usePracticeRecording() {
  const dispatch = useAppDispatch();
  const practice = useAppSelector(selectPracticeSession);
  const recorderRef = useRef<PracticeRecorder | null>(null);
  const latestRecordingRef = useRef<RecordingResult | null>(null);
  const isPressingRef = useRef(false);

  const handleRecorderFailure = useCallback(
    (error: unknown) => {
      isPressingRef.current = false;
      recorderRef.current?.dispose();
      recorderRef.current = null;
      dispatch(setRecordingDurationMs(0));
      dispatch(setWaveformLevel(0));

      if (error instanceof PracticeRecorderError && error.code === "PERMISSION_DENIED") {
        dispatch(setMicPermissionError(error.message));
        dispatch(setRecordingState("ready"));
        return;
      }

      if (error instanceof PracticeRecorderError) {
        dispatch(setPracticeError(error.message));
        return;
      }

      dispatch(setPracticeError("录音失败，请重试。"));
    },
    [dispatch],
  );

  const ensureRecorder = useCallback(() => {
    recorderRef.current ??= new PracticeRecorder({
      onDurationChange: (durationMs) => {
        dispatch(setRecordingDurationMs(durationMs));
      },
      onWaveformLevel: (level) => {
        dispatch(setWaveformLevel(level));
      },
      onAutoStop: (result) => {
        latestRecordingRef.current = result;
        dispatch(
          setCapturedRecording({
            mimeType: result.mimeType,
            durationMs: result.durationMs,
            sizeBytes: result.blob.size,
            stopReason: "timeout",
          }),
        );
        dispatch(setRecordingState("ready"));
        isPressingRef.current = false;
      },
    });

    return recorderRef.current;
  }, [dispatch]);

  useEffect(() => {
    return () => {
      recorderRef.current?.dispose();
      recorderRef.current = null;
    };
  }, []);

  const canRecord =
    practice.recordingState === "ready" &&
    practice.sessionStatus === "in_progress" &&
    !practice.micPermissionError;

  const handlePressStart = useCallback(async () => {
    if (!canRecord || isPressingRef.current || recorderRef.current?.recording) {
      return;
    }

    isPressingRef.current = true;
    dispatch(clearMicPermissionError());
    dispatch(clearCapturedRecording());
    latestRecordingRef.current = null;

    try {
      const recorder = ensureRecorder();
      await recorder.start();
      dispatch(setRecordingState("recording"));
      dispatch(setRecordingDurationMs(0));
      dispatch(setWaveformLevel(0));
    } catch (error) {
      isPressingRef.current = false;
      handleRecorderFailure(error);
    }
  }, [canRecord, dispatch, ensureRecorder, handleRecorderFailure]);

  const handlePressEnd = useCallback(async () => {
    if (!isPressingRef.current) {
      return;
    }

    isPressingRef.current = false;

    const recorder = recorderRef.current;

    if (!recorder?.recording) {
      return;
    }

    try {
      const result = await recorder.stop("released");

      if (result) {
        latestRecordingRef.current = result;
        dispatch(
          setCapturedRecording({
            mimeType: result.mimeType,
            durationMs: result.durationMs,
            sizeBytes: result.blob.size,
            stopReason: "released",
          }),
        );
      }

      dispatch(setRecordingState("ready"));
      dispatch(setRecordingDurationMs(0));
      dispatch(setWaveformLevel(0));
    } catch (error) {
      handleRecorderFailure(error);
    }
  }, [dispatch, handleRecorderFailure]);

  const handlePressCancel = useCallback(async () => {
    if (!isPressingRef.current) {
      return;
    }

    isPressingRef.current = false;

    const recorder = recorderRef.current;

    if (!recorder?.recording) {
      return;
    }

    await recorder.stop("cancelled");
    dispatch(setRecordingState("ready"));
    dispatch(setRecordingDurationMs(0));
    dispatch(setWaveformLevel(0));
  }, [dispatch]);

  const retryMicrophone = useCallback(() => {
    dispatch(clearMicPermissionError());
    dispatch(setRecordingState("ready"));
  }, [dispatch]);

  const getLatestRecording = useCallback(() => latestRecordingRef.current, []);

  return {
    canRecord,
    isRecording: practice.recordingState === "recording",
    recordingDurationMs: practice.recordingDurationMs,
    waveformLevel: practice.waveformLevel,
    capturedRecording: practice.capturedRecording,
    micPermissionError: practice.micPermissionError,
    handlePressStart,
    handlePressEnd,
    handlePressCancel,
    retryMicrophone,
    getLatestRecording,
  };
}

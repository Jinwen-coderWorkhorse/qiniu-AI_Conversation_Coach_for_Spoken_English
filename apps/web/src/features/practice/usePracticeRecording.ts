"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  PracticeRecorder,
  PracticeRecorderError,
  type RecordingResult,
} from "@/lib/audio/recorder";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { createClientTurnId } from "@/lib/audio/uploadMimeType";
import {
  clearCapturedRecording,
  clearMicPermissionError,
  setCapturedRecording,
  setClientTurnId,
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
  const pendingStopRef = useRef<"released" | "cancelled" | null>(null);

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
    !practice.micPermissionError &&
    !practice.pendingReviewTurn;

  const finishRecording = useCallback(
    async (reason: "released" | "cancelled") => {
      const recorder = recorderRef.current;

      if (!recorder?.recording) {
        return;
      }

      try {
        const result = await recorder.stop(reason);

        if (reason === "cancelled" || !result) {
          dispatch(setRecordingState("ready"));
          dispatch(setRecordingDurationMs(0));
          dispatch(setWaveformLevel(0));
          return;
        }

        latestRecordingRef.current = result;
        dispatch(
          setCapturedRecording({
            mimeType: result.mimeType,
            durationMs: result.durationMs,
            sizeBytes: result.blob.size,
            stopReason: "released",
          }),
        );
        dispatch(setRecordingDurationMs(0));
        dispatch(setWaveformLevel(0));
      } catch (error) {
        handleRecorderFailure(error);
      }
    },
    [dispatch, handleRecorderFailure],
  );

  const handlePressStart = useCallback(async () => {
    if (!canRecord || isPressingRef.current || recorderRef.current?.recording) {
      return;
    }

    isPressingRef.current = true;
    pendingStopRef.current = null;
    dispatch(clearMicPermissionError());
    dispatch(clearCapturedRecording());
    latestRecordingRef.current = null;
    dispatch(setClientTurnId(createClientTurnId()));

    try {
      const recorder = ensureRecorder();
      await recorder.start();

      if (pendingStopRef.current) {
        const stopReason = pendingStopRef.current;
        pendingStopRef.current = null;
        isPressingRef.current = false;
        await finishRecording(stopReason);
        return;
      }

      dispatch(setRecordingState("recording"));
      dispatch(setRecordingDurationMs(0));
      dispatch(setWaveformLevel(0));
    } catch (error) {
      isPressingRef.current = false;
      pendingStopRef.current = null;
      handleRecorderFailure(error);
    }
  }, [canRecord, dispatch, ensureRecorder, finishRecording, handleRecorderFailure]);

  const handlePressEnd = useCallback(async () => {
    if (!isPressingRef.current) {
      return;
    }

    const recorder = recorderRef.current;

    if (!recorder?.recording) {
      pendingStopRef.current = "released";
      return;
    }

    isPressingRef.current = false;
    await finishRecording("released");
  }, [finishRecording]);

  const handlePressCancel = useCallback(async () => {
    if (!isPressingRef.current) {
      return;
    }

    const recorder = recorderRef.current;

    if (!recorder?.recording) {
      pendingStopRef.current = "cancelled";
      return;
    }

    isPressingRef.current = false;
    pendingStopRef.current = null;
    await finishRecording("cancelled");
  }, [finishRecording]);

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

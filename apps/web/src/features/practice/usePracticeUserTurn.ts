"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { confirmPendingTurn, discardPendingTurn, uploadUserTurn } from "@/store/practiceSlice";

import { selectPracticeSession } from "./practiceSelectors";

type UsePracticeUserTurnOptions = {
  getLatestRecording: () => { blob: Blob; mimeType: string; durationMs: number } | null;
};

export function usePracticeUserTurn({ getLatestRecording }: UsePracticeUserTurnOptions) {
  const dispatch = useAppDispatch();
  const practice = useAppSelector(selectPracticeSession);
  const uploadAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (!practice.capturedRecording || !practice.sessionId || !practice.clientTurnId) {
      return;
    }

    const uploadKey = `${practice.clientTurnId}:${practice.capturedRecording.durationMs}`;

    if (uploadAttemptRef.current === uploadKey) {
      return;
    }

    const recording = getLatestRecording();

    if (!recording) {
      return;
    }

    uploadAttemptRef.current = uploadKey;

    void dispatch(
      uploadUserTurn({
        sessionId: practice.sessionId,
        audio: recording.blob,
        durationMs: recording.durationMs,
        mimeType: recording.mimeType,
        clientTurnId: practice.clientTurnId,
      }),
    );
  }, [
    dispatch,
    getLatestRecording,
    practice.capturedRecording,
    practice.clientTurnId,
    practice.sessionId,
  ]);

  const handleDiscard = useCallback(() => {
    if (
      !practice.sessionId ||
      !practice.pendingReviewTurn ||
      practice.isDiscarding ||
      practice.isConfirming
    ) {
      return;
    }

    void dispatch(
      discardPendingTurn({
        sessionId: practice.sessionId,
        turnId: practice.pendingReviewTurn.id,
      }),
    ).then((result) => {
      if (discardPendingTurn.fulfilled.match(result)) {
        uploadAttemptRef.current = null;
      }
    });
  }, [dispatch, practice.isConfirming, practice.isDiscarding, practice.pendingReviewTurn, practice.sessionId]);

  const handleConfirm = useCallback(() => {
    if (
      !practice.sessionId ||
      !practice.pendingReviewTurn ||
      practice.isConfirming ||
      practice.isDiscarding
    ) {
      return;
    }

    void dispatch(
      confirmPendingTurn({
        sessionId: practice.sessionId,
        turnId: practice.pendingReviewTurn.id,
      }),
    ).then((result) => {
      if (confirmPendingTurn.fulfilled.match(result)) {
        uploadAttemptRef.current = null;
      }
    });
  }, [
    dispatch,
    practice.isConfirming,
    practice.isDiscarding,
    practice.pendingReviewTurn,
    practice.sessionId,
  ]);

  const retryUpload = useCallback(() => {
    if (!practice.capturedRecording || !practice.sessionId || !practice.clientTurnId) {
      return;
    }

    const recording = getLatestRecording();

    if (!recording) {
      return;
    }

    void dispatch(
      uploadUserTurn({
        sessionId: practice.sessionId,
        audio: recording.blob,
        durationMs: recording.durationMs,
        mimeType: recording.mimeType,
        clientTurnId: practice.clientTurnId,
      }),
    );
  }, [
    dispatch,
    getLatestRecording,
    practice.capturedRecording,
    practice.clientTurnId,
    practice.sessionId,
  ]);

  return {
    pendingReviewTurn: practice.pendingReviewTurn,
    turnActionError: practice.turnActionError,
    isDiscarding: practice.isDiscarding,
    isConfirming: practice.isConfirming,
    handleConfirm,
    handleDiscard,
    retryUpload,
    retryConfirm: handleConfirm,
  };
}

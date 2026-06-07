"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { loadPracticeSession, resetPractice } from "@/store/practiceSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { AiCurrentUtterance } from "./AiCurrentUtterance";
import { CapturedRecordingSummary } from "./CapturedRecordingSummary";
import { MicPermissionAlert } from "./MicPermissionAlert";
import { PracticeHeader } from "./PracticeHeader";
import { PracticeStatus } from "./PracticeStatus";
import { PushToTalkButton } from "./PushToTalkButton";
import { RecentTranscript } from "./RecentTranscript";
import { TranscriptReview } from "./TranscriptReview";
import { TurnActionError } from "./TurnActionError";
import {
  selectCurrentAiTurn,
  selectPracticeSession,
  selectRecentTurns,
} from "./practiceSelectors";
import { usePracticeRecording } from "./usePracticeRecording";
import { usePracticeUserTurn } from "./usePracticeUserTurn";

type PracticeSessionViewProps = {
  sessionId: string;
};

const BLOCKED_TALK_STATES = new Set([
  "uploading",
  "transcribing",
  "transcriptReview",
  "aiThinking",
  "aiSpeaking",
  "ending",
  "reporting",
]);

export function PracticeSessionView({ sessionId }: PracticeSessionViewProps) {
  const dispatch = useAppDispatch();
  const practice = useAppSelector(selectPracticeSession);
  const currentAiTurn = selectCurrentAiTurn(practice.turns);
  const recentTurns = selectRecentTurns(practice.turns, currentAiTurn?.id);

  const recording = usePracticeRecording();
  const userTurn = usePracticeUserTurn({
    getLatestRecording: recording.getLatestRecording,
  });

  useEffect(() => {
    dispatch(resetPractice());
    void dispatch(loadPracticeSession(sessionId));

    return () => {
      dispatch(resetPractice());
    };
  }, [dispatch, sessionId]);

  const isLoading = practice.recordingState === "loadingOpening";
  const isSessionError = practice.recordingState === "error";
  const isReady = Boolean(practice.scenario && practice.currentStepNo !== null);
  const isRecording = practice.recordingState === "recording";
  const showCapturedSummary =
    practice.capturedRecording !== null && practice.recordingState === "uploading";
  const showTranscriptReview =
    practice.recordingState === "transcriptReview" && practice.pendingReviewTurn !== null;

  const talkButtonDisabled = useMemo(() => {
    return (
      !recording.canRecord ||
      isLoading ||
      isSessionError ||
      practice.sessionStatus !== "in_progress" ||
      BLOCKED_TALK_STATES.has(practice.recordingState) ||
      practice.isDiscarding
    );
  }, [
    isLoading,
    isSessionError,
    practice.isDiscarding,
    practice.recordingState,
    practice.sessionStatus,
    recording.canRecord,
  ]);

  return (
    <section className="practice-page" aria-labelledby="practice-page-title">
      <Link className="back-link practice-back-link" href="/">
        返回首页
      </Link>

      {isSessionError ? (
        <div className="practice-error-card" role="alert">
          <h1 className="practice-error-title" id="practice-page-title">
            练习恢复失败
          </h1>
          <PracticeStatus recordingState={practice.recordingState} error={practice.error} />
          <div className="practice-error-actions">
            <button
              className="primary-action"
              type="button"
              onClick={() => void dispatch(loadPracticeSession(sessionId))}
            >
              重试恢复
            </button>
            <Link className="secondary-action secondary-action-inline" href="/">
              返回首页
            </Link>
          </div>
        </div>
      ) : null}

      {!isSessionError ? (
        <div className="practice-page-layout">
          <div className="practice-page-body">
            {isReady && practice.scenario && practice.currentStepNo !== null ? (
              <PracticeHeader
                scenario={practice.scenario}
                currentStepNo={practice.currentStepNo}
                sessionStatus={practice.sessionStatus ?? "in_progress"}
                endPracticeDisabled={isRecording || practice.recordingState !== "ready"}
                isRecording={isRecording}
              />
            ) : (
              <div className="practice-header-loading" aria-busy="true">
                <span className="loading-line loading-line-title" />
                <span className="loading-line loading-line-short" />
              </div>
            )}

            {recording.micPermissionError ? (
              <MicPermissionAlert
                message={recording.micPermissionError}
                onRetry={recording.retryMicrophone}
              />
            ) : null}

            <AiCurrentUtterance turn={currentAiTurn} isLoading={isLoading} />
            <RecentTranscript turns={recentTurns} />
            <PracticeStatus
              recordingState={practice.recordingState}
              error={practice.error}
              capturedRecording={practice.capturedRecording}
            />

            {practice.turnActionError ? (
              <TurnActionError
                message={practice.turnActionError}
                onRetryUpload={
                  practice.capturedRecording && practice.recordingState === "ready"
                    ? userTurn.retryUpload
                    : undefined
                }
              />
            ) : null}

            {showTranscriptReview && practice.pendingReviewTurn ? (
              <TranscriptReview
                turn={practice.pendingReviewTurn}
                isDiscarding={practice.isDiscarding}
                onRetry={userTurn.handleDiscard}
              />
            ) : null}

            {showCapturedSummary && practice.capturedRecording ? (
              <CapturedRecordingSummary recording={practice.capturedRecording} />
            ) : null}
          </div>

          <PushToTalkButton
            disabled={talkButtonDisabled}
            durationMs={recording.recordingDurationMs}
            isRecording={recording.isRecording}
            recordingState={practice.recordingState}
            waveformLevel={recording.waveformLevel}
            onPressCancel={() => void recording.handlePressCancel()}
            onPressEnd={() => void recording.handlePressEnd()}
            onPressStart={() => void recording.handlePressStart()}
          />
        </div>
      ) : null}
    </section>
  );
}

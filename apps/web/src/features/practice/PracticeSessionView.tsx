"use client";

import Link from "next/link";
import { useEffect } from "react";

import { loadPracticeSession, resetPractice } from "@/store/practiceSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { AiCurrentUtterance } from "./AiCurrentUtterance";
import { PracticeHeader } from "./PracticeHeader";
import { PracticeStatus } from "./PracticeStatus";
import { PushToTalkButton } from "./PushToTalkButton";
import { RecentTranscript } from "./RecentTranscript";
import {
  selectCurrentAiTurn,
  selectPracticeSession,
  selectRecentTurns,
} from "./practiceSelectors";

type PracticeSessionViewProps = {
  sessionId: string;
};

export function PracticeSessionView({ sessionId }: PracticeSessionViewProps) {
  const dispatch = useAppDispatch();
  const practice = useAppSelector(selectPracticeSession);
  const currentAiTurn = selectCurrentAiTurn(practice.turns);
  const recentTurns = selectRecentTurns(practice.turns, currentAiTurn?.id);

  useEffect(() => {
    dispatch(resetPractice());
    void dispatch(loadPracticeSession(sessionId));

    return () => {
      dispatch(resetPractice());
    };
  }, [dispatch, sessionId]);

  const isLoading = practice.recordingState === "loadingOpening";
  const isError = practice.recordingState === "error";
  const isReady = Boolean(practice.scenario && practice.currentStepNo !== null);

  return (
    <section className="practice-page" aria-labelledby="practice-page-title">
      <Link className="back-link practice-back-link" href="/">
        返回首页
      </Link>

      {isError ? (
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

      {!isError ? (
        <div className="practice-page-layout">
          <div className="practice-page-body">
            {isReady && practice.scenario && practice.currentStepNo !== null ? (
              <PracticeHeader
                scenario={practice.scenario}
                currentStepNo={practice.currentStepNo}
                sessionStatus={practice.sessionStatus ?? "in_progress"}
              />
            ) : (
              <div className="practice-header-loading" aria-busy="true">
                <span className="loading-line loading-line-title" />
                <span className="loading-line loading-line-short" />
              </div>
            )}

            <AiCurrentUtterance turn={currentAiTurn} isLoading={isLoading} />
            <RecentTranscript turns={recentTurns} />
            <PracticeStatus recordingState={practice.recordingState} error={practice.error} />
          </div>

          <PushToTalkButton disabled />
        </div>
      ) : null}
    </section>
  );
}

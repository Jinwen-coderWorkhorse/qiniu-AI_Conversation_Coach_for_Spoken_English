"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { ApiRequestError } from "@/lib/api/client";
import type { PracticeSessionEvent } from "@/lib/api/contracts";
import {
  buildPracticeSessionEventsUrl,
  getPracticeSession,
  getPracticeSessionReport,
} from "@/lib/api/endpoints";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";
import { subscribePracticeSessionEvents } from "@/lib/sse/practiceSessionEvents";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { applyReportProgressEvent, setSessionStatus } from "@/store/practiceSlice";

import { selectPracticeSession } from "./practiceSelectors";

const REPORT_POLL_INTERVAL_MS = 3000;

type UsePracticeReportingOptions = {
  sessionId: string;
};

export function usePracticeReporting({ sessionId }: UsePracticeReportingOptions) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const practice = useAppSelector(selectPracticeSession);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pollingActiveRef = useRef(false);
  const redirectedRef = useRef(false);

  const shouldTrackReporting =
    practice.sessionId === sessionId &&
    (practice.recordingState === "reporting" ||
      practice.sessionStatus === "reporting" ||
      practice.sessionStatus === "completed");

  useEffect(() => {
    if (!shouldTrackReporting) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();

    const clearPollTimer = () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = undefined;
      }
    };

    const redirectToReportPage = () => {
      if (redirectedRef.current || cancelled) {
        return;
      }

      redirectedRef.current = true;
      router.replace(`/reports/${sessionId}`);
    };

    const schedulePoll = () => {
      clearPollTimer();

      if (cancelled || redirectedRef.current) {
        return;
      }

      pollTimerRef.current = setTimeout(() => {
        void pollReportStatus();
      }, REPORT_POLL_INTERVAL_MS);
    };

    const pollReportStatus = async (forceAuthentication = false) => {
      if (cancelled || redirectedRef.current) {
        return;
      }

      pollingActiveRef.current = true;

      try {
        const identity = forceAuthentication
          ? await authenticateAnonymousIdentity()
          : await ensureAnonymousIdentity();
        const [session, report] = await Promise.all([
          getPracticeSession(sessionId, identity.access_token),
          getPracticeSessionReport(sessionId, identity.access_token),
        ]);

        if (cancelled || redirectedRef.current) {
          return;
        }

        dispatch(setSessionStatus(session.status));

        if (session.status === "completed" || report.status === "completed" || report.status === "failed") {
          redirectToReportPage();
          return;
        }

        if (session.status === "reporting" || report.status === "pending") {
          schedulePoll();
        }
      } catch (error) {
        if (cancelled || redirectedRef.current) {
          return;
        }

        if (isUnauthorized(error)) {
          clearAnonymousAccessToken();
          await pollReportStatus(true);
          return;
        }

        schedulePoll();
      } finally {
        pollingActiveRef.current = false;
      }
    };

    const handleSseEvent = (event: PracticeSessionEvent) => {
      dispatch(applyReportProgressEvent(event));

      if (event.type === "report.ready") {
        void pollReportStatus();
      }
    };

    const startPollingFallback = () => {
      if (!pollingActiveRef.current) {
        void pollReportStatus();
      }
    };

    const connectSse = async (forceAuthentication = false) => {
      try {
        const identity = forceAuthentication
          ? await authenticateAnonymousIdentity()
          : await ensureAnonymousIdentity();

        if (cancelled) {
          return;
        }

        await subscribePracticeSessionEvents({
          url: buildPracticeSessionEventsUrl(sessionId),
          accessToken: identity.access_token,
          onEvent: handleSseEvent,
          onDisconnect: startPollingFallback,
          signal: abortController.signal,
        });
      } catch (error) {
        if (cancelled || isUnauthorized(error)) {
          if (isUnauthorized(error)) {
            clearAnonymousAccessToken();
            await connectSse(true);
          }

          return;
        }

        startPollingFallback();
      }
    };

    if (practice.sessionStatus === "completed") {
      redirectToReportPage();
      return () => {
        cancelled = true;
        clearPollTimer();
        abortController.abort();
      };
    }

    void connectSse();
    void pollReportStatus();

    return () => {
      cancelled = true;
      clearPollTimer();
      abortController.abort();
    };
  }, [dispatch, practice.recordingState, practice.sessionId, practice.sessionStatus, router, sessionId, shouldTrackReporting]);
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import type { PracticeSessionReportResponse } from "@/lib/api/contracts";
import { getPracticeSessionReport } from "@/lib/api/endpoints";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";
import {
  canUseReportPreview,
  createContractMockReport,
  parseReportPreviewStatus,
  type ReportPreviewStatus,
} from "@/lib/report/mockReport";

const REPORT_POLL_INTERVAL_MS = 3000;

export type PracticeReportLoadStatus = "loading" | "ready" | "error";

type UsePracticeReportOptions = {
  sessionId: string;
  previewStatus?: ReportPreviewStatus;
};

type PracticeReportState = {
  status: PracticeReportLoadStatus;
  report?: PracticeSessionReportResponse;
  errorMessage?: string;
  isMockFallback: boolean;
  reload: () => void;
};

export function usePracticeReport({
  sessionId,
  previewStatus,
}: UsePracticeReportOptions): PracticeReportState {
  const [loadStatus, setLoadStatus] = useState<PracticeReportLoadStatus>("loading");
  const [report, setReport] = useState<PracticeSessionReportResponse>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isMockFallback, setIsMockFallback] = useState(false);
  const [reloadCounter, setReloadCounter] = useState(0);

  const reload = useCallback(() => {
    setReloadCounter((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadReport(forceAuthentication = false) {
      if (previewStatus && canUseReportPreview()) {
        if (cancelled) {
          return;
        }

        setIsMockFallback(true);
        setReport(createContractMockReport(sessionId, previewStatus));
        setErrorMessage(undefined);
        setLoadStatus("ready");
        return;
      }

      setLoadStatus("loading");
      setErrorMessage(undefined);
      setIsMockFallback(false);

      try {
        const identity = forceAuthentication
          ? await authenticateAnonymousIdentity()
          : await ensureAnonymousIdentity();
        const response = await getPracticeSessionReport(sessionId, identity.access_token);

        if (cancelled) {
          return;
        }

        setReport(response);
        setLoadStatus("ready");

        if (response.status === "pending") {
          pollTimer = setTimeout(() => {
            void loadReport();
          }, REPORT_POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorized(error)) {
          clearAnonymousAccessToken();
          await loadReport(true);
          return;
        }

        setReport(undefined);
        setErrorMessage(getReportErrorMessage(error));
        setLoadStatus("error");
      }
    }

    void loadReport();

    return () => {
      cancelled = true;

      if (pollTimer) {
        clearTimeout(pollTimer);
      }
    };
  }, [previewStatus, reloadCounter, sessionId]);

  return {
    status: loadStatus,
    report,
    errorMessage,
    isMockFallback,
    reload,
  };
}

export function readReportPreviewFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
) {
  const rawValue = searchParams.preview;

  if (Array.isArray(rawValue)) {
    return parseReportPreviewStatus(rawValue[0]);
  }

  return parseReportPreviewStatus(rawValue);
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function getReportErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "NOT_FOUND") {
      return "报告不存在或尚未生成。";
    }

    if (error.status === 401) {
      return "匿名身份已失效，请重试恢复。";
    }

    if (error.status === 403) {
      return "无权查看这份报告。";
    }

    return error.message || "报告加载失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}

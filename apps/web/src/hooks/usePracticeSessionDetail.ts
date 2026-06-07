"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import type { PracticeSessionDetail } from "@/lib/api/contracts";
import { getPracticeSession } from "@/lib/api/endpoints";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";

export type PracticeSessionDetailLoadStatus = "loading" | "ready" | "error";

type PracticeSessionDetailState = {
  status: PracticeSessionDetailLoadStatus;
  session?: PracticeSessionDetail;
  errorMessage?: string;
  reload: () => void;
};

export function usePracticeSessionDetail(sessionId: string): PracticeSessionDetailState {
  const [status, setStatus] = useState<PracticeSessionDetailLoadStatus>("loading");
  const [session, setSession] = useState<PracticeSessionDetail>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [reloadCounter, setReloadCounter] = useState(0);

  const reload = useCallback(() => {
    setReloadCounter((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession(forceAuthentication = false) {
      setStatus("loading");
      setErrorMessage(undefined);

      try {
        const identity = forceAuthentication
          ? await authenticateAnonymousIdentity()
          : await ensureAnonymousIdentity();
        const response = await getPracticeSession(sessionId, identity.access_token);

        if (cancelled) {
          return;
        }

        setSession(response);
        setStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorized(error)) {
          clearAnonymousAccessToken();
          await loadSession(true);
          return;
        }

        setSession(undefined);
        setErrorMessage(getSessionErrorMessage(error));
        setStatus("error");
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [reloadCounter, sessionId]);

  return {
    status,
    session,
    errorMessage,
    reload,
  };
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function getSessionErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "NOT_FOUND") {
      return "练习不存在或已被删除。";
    }

    if (error.status === 401) {
      return "匿名身份已失效，请重试恢复。";
    }

    if (error.status === 403) {
      return "无权查看这次练习。";
    }

    return error.message || "练习详情加载失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}

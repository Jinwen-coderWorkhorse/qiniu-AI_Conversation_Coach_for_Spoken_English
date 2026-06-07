"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiRequestError } from "@/lib/api/client";
import type { HistoryItem, StatsResponse } from "@/lib/api/contracts";
import { getMyStats, listPracticeSessions } from "@/lib/api/endpoints";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";

const HISTORY_PAGE_SIZE = 10;

export type HistoryDrawerLoadStatus = "idle" | "loading" | "ready" | "error";

type HistoryDrawerState = {
  status: HistoryDrawerLoadStatus;
  historyItems: HistoryItem[];
  stats?: StatsResponse;
  errorMessage?: string;
  reload: () => void;
};

export function useHistoryDrawer(isOpen: boolean): HistoryDrawerState {
  const [status, setStatus] = useState<HistoryDrawerLoadStatus>("idle");
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<StatsResponse>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [reloadCounter, setReloadCounter] = useState(0);

  const reload = useCallback(() => {
    setReloadCounter((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    async function loadHistory(forceAuthentication = false) {
      setStatus("loading");
      setErrorMessage(undefined);

      try {
        const identity = forceAuthentication
          ? await authenticateAnonymousIdentity()
          : await ensureAnonymousIdentity();

        const [historyResponse, statsResponse] = await Promise.all([
          listPracticeSessions(identity.access_token, { page: 1, page_size: HISTORY_PAGE_SIZE }),
          getMyStats(identity.access_token),
        ]);

        if (cancelled) {
          return;
        }

        setHistoryItems(historyResponse.items);
        setStats(statsResponse);
        setStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        if (isUnauthorized(error)) {
          clearAnonymousAccessToken();
          await loadHistory(true);
          return;
        }

        setHistoryItems([]);
        setStats(undefined);
        setErrorMessage(getHistoryErrorMessage(error));
        setStatus("error");
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadCounter]);

  return {
    status,
    historyItems,
    stats,
    errorMessage,
    reload,
  };
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function getHistoryErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) {
      return "匿名身份已失效，请重试恢复。";
    }

    return error.message || "历史数据加载失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}

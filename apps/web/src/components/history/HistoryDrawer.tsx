"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef } from "react";

import type { HistoryItem } from "@/lib/api/contracts";
import { useHistoryDrawer } from "@/hooks/useHistoryDrawer";

import { StatsSummary } from "./StatsSummary";

type HistoryDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function HistoryDrawer({ isOpen, onClose }: HistoryDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const { status, historyItems, stats, errorMessage, reload } = useHistoryDrawer(isOpen);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleKeyDown, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="history-drawer-root">
      <button
        className="history-drawer-backdrop"
        type="button"
        aria-label="关闭历史侧边栏"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        id="history-drawer"
        className="history-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="history-drawer-header">
          <div className="history-drawer-heading">
            <h2 className="history-drawer-title" id={titleId}>
              练习历史
            </h2>
            <p className="history-drawer-subtitle">回看 transcript，进入报告</p>
          </div>
          <button className="history-drawer-close" type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="history-drawer-body">
          {status === "loading" ? <HistoryDrawerLoadingState /> : null}

          {status === "error" ? (
            <div className="history-drawer-state" role="alert">
              <p>{errorMessage}</p>
              <button className="state-action" type="button" onClick={reload}>
                重试
              </button>
            </div>
          ) : null}

          {status === "ready" && stats ? <StatsSummary stats={stats} /> : null}

          {status === "ready" ? (
            <section className="history-list-section" aria-label="最近练习">
              <div className="history-list-heading">
                <h3 className="history-list-title">最近练习</h3>
                <span className="history-list-count">{historyItems.length} 条</span>
              </div>

              {historyItems.length === 0 ? (
                <div className="history-drawer-state">
                  <p>还没有完成的练习。完成一轮练习后，这里会展示历史记录。</p>
                </div>
              ) : (
                <ul className="history-list">
                  {historyItems.map((item) => (
                    <HistoryListItem key={item.id} item={item} onNavigate={onClose} />
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function HistoryListItem({
  item,
  onNavigate,
}: {
  item: HistoryItem;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link className="history-list-item" href={`/history/${item.id}`} onClick={onNavigate}>
        <span className="history-list-item-topline">
          <span className="history-list-item-title">{item.scenario_name}</span>
          <span className="history-list-item-score">
            {item.overall_score === null || item.overall_score === undefined
              ? "暂无分数"
              : `${item.overall_score} 分`}
          </span>
        </span>
        <span className="history-list-item-meta">
          <span>{formatHistoryDate(item.created_at)}</span>
          <span>{formatDuration(item.duration_sec)}</span>
        </span>
        {item.level_description ? (
          <span className="history-list-item-level">{item.level_description}</span>
        ) : null}
      </Link>
    </li>
  );
}

function HistoryDrawerLoadingState() {
  return (
    <div className="history-drawer-loading" aria-live="polite" aria-busy="true">
      <span className="loading-line loading-line-title" />
      <span className="loading-line" />
      <span className="loading-line loading-line-short" />
      <span className="loading-line" />
    </div>
  );
}

function formatHistoryDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDuration(durationSec: number) {
  if (durationSec < 60) {
    return `${durationSec} 秒`;
  }

  const minutes = Math.max(1, Math.round(durationSec / 60));
  return `${minutes} 分钟`;
}

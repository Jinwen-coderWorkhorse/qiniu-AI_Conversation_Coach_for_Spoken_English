"use client";

import Link from "next/link";
import { useState } from "react";

import { HistoryDrawer } from "@/components/history/HistoryDrawer";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-leading">
          <button
            className="history-menu-button"
            type="button"
            aria-expanded={isHistoryOpen}
            aria-controls="history-drawer"
            aria-label="打开练习历史"
            onClick={() => setIsHistoryOpen(true)}
          >
            <span className="history-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="history-menu-label">历史</span>
          </button>

          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              AI
            </span>
            <span>AI English Coach</span>
          </Link>
        </div>

        <span className="topbar-status">MVP</span>
      </header>

      <main className="app-main">{children}</main>

      <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
    </div>
  );
}

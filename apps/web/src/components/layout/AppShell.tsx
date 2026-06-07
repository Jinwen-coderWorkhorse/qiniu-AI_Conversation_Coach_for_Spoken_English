import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            AI
          </span>
          <span>AI English Coach</span>
        </Link>
        <span className="topbar-status">MVP</span>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

const STORAGE_KEY = "current_session_id";

export function readCurrentSessionId(): string | undefined {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeCurrentSessionId(sessionId: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, sessionId);
  } catch {
    // Session navigation can continue even if persistence is unavailable.
  }
}

export function clearCurrentSessionId() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Best-effort cleanup only.
  }
}

function canUseLocalStorage() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

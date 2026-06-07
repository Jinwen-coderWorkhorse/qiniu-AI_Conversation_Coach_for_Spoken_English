const SUPPORTED_UPLOAD_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
]);

export function normalizeUploadMimeType(mimeType: string) {
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? mimeType;

  if (SUPPORTED_UPLOAD_MIME_TYPES.has(normalized)) {
    return normalized === "audio/x-wav" ? "audio/wav" : normalized;
  }

  if (normalized.startsWith("audio/")) {
    return "audio/webm";
  }

  return normalized;
}

export function createClientTurnId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `turn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

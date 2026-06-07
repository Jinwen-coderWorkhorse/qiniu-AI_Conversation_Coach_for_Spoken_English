import type { PracticeSessionEvent, PracticeSessionEventName } from "@/lib/api/contracts";

const PRACTICE_SESSION_EVENT_NAMES = new Set<PracticeSessionEventName>([
  "ai.generating",
  "ai.text.delta",
  "ai.text.done",
  "ai.audio.ready",
  "practice.step.changed",
  "report.ready",
  "error",
]);

type SubscribePracticeSessionEventsOptions = {
  url: string;
  accessToken: string;
  onEvent: (event: PracticeSessionEvent) => void;
  onDisconnect: () => void;
  signal?: AbortSignal;
};

export async function subscribePracticeSessionEvents({
  url,
  accessToken,
  onEvent,
  onDisconnect,
  signal,
}: SubscribePracticeSessionEventsOptions) {
  let response: Response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    });
  } catch (error) {
    if (!isAbortError(error)) {
      onDisconnect();
    }

    return;
  }

  if (!response.ok || !response.body) {
    onDisconnect();
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundary = findEventBoundary(buffer);

      while (boundary >= 0) {
        const chunk = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const event = parseSseChunk(chunk);

        if (event) {
          onEvent(event);
        }

        boundary = findEventBoundary(buffer);
      }
    }
  } catch (error) {
    if (!isAbortError(error)) {
      onDisconnect();
      return;
    }
  } finally {
    reader.releaseLock();
  }

  onDisconnect();
}

function findEventBoundary(buffer: string) {
  const unixBoundary = buffer.indexOf("\n\n");
  const windowsBoundary = buffer.indexOf("\r\n\r\n");

  if (unixBoundary === -1) {
    return windowsBoundary;
  }

  if (windowsBoundary === -1) {
    return unixBoundary;
  }

  return Math.min(unixBoundary, windowsBoundary);
}

function parseSseChunk(chunk: string): PracticeSessionEvent | undefined {
  const normalizedChunk = chunk.replace(/\r/g, "");
  const lines = normalizedChunk.split("\n");
  let eventType: string | undefined;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventType = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  if (!eventType || !isPracticeSessionEventName(eventType)) {
    return undefined;
  }

  const rawData = dataLines.join("\n");

  try {
    return {
      type: eventType,
      data: rawData ? (JSON.parse(rawData) as Record<string, unknown>) : {},
    };
  } catch {
    return {
      type: eventType,
      data: {},
    };
  }
}

function isPracticeSessionEventName(value: string): value is PracticeSessionEventName {
  return PRACTICE_SESSION_EVENT_NAMES.has(value as PracticeSessionEventName);
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

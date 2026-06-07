import { apiClient, type ApiClient } from "./client";
import type {
  AnonymousAuthRequest,
  AnonymousAuthResponse,
  ConfirmTurnRequest,
  ConfirmTurnResponse,
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
  DiscardTurnResponse,
  EndPracticeSessionRequest,
  EndPracticeSessionResponse,
  HistoryListResponse,
  ListPracticeSessionsQuery,
  PracticeSessionDetail,
  PracticeSessionReportResponse,
  ScenarioDetail,
  ScenariosResponse,
  StatsResponse,
  SubmitUserTurnPayload,
  SubmitUserTurnResponse,
} from "./contracts";

export function postAnonymousAuth(
  identity: AnonymousAuthRequest,
  client: ApiClient = apiClient,
) {
  return client.post<AnonymousAuthResponse>("/auth/anonymous", identity);
}

export function getScenarios(accessToken: string, client: ApiClient = apiClient) {
  return client.get<ScenariosResponse>("/scenarios", { accessToken });
}

export function getScenario(
  slug: string,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.get<ScenarioDetail>(`/scenarios/${encodeURIComponent(slug)}`, {
    accessToken,
  });
}

export function createPracticeSession(
  payload: CreatePracticeSessionRequest,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.post<CreatePracticeSessionResponse>("/practice-sessions", payload, {
    accessToken,
  });
}

export function getPracticeSessionReport(
  sessionId: string,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.get<PracticeSessionReportResponse>(
    `/practice-sessions/${encodeURIComponent(sessionId)}/report`,
    { accessToken },
  );
}

export function listPracticeSessions(
  accessToken: string,
  query: ListPracticeSessionsQuery = {},
  client: ApiClient = apiClient,
) {
  const searchParams = new URLSearchParams();

  if (query.page !== undefined) {
    searchParams.set("page", String(query.page));
  }

  if (query.page_size !== undefined) {
    searchParams.set("page_size", String(query.page_size));
  }

  if (query.scenario_slug) {
    searchParams.set("scenario_slug", query.scenario_slug);
  }

  const suffix = searchParams.size > 0 ? `?${searchParams.toString()}` : "";

  return client.get<HistoryListResponse>(`/practice-sessions${suffix}`, { accessToken });
}

export function getMyStats(accessToken: string, client: ApiClient = apiClient) {
  return client.get<StatsResponse>("/me/stats", { accessToken });
}

export function getPracticeSession(
  sessionId: string,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.get<PracticeSessionDetail>(
    `/practice-sessions/${encodeURIComponent(sessionId)}`,
    { accessToken },
  );
}

export function submitUserTurn(
  sessionId: string,
  payload: SubmitUserTurnPayload,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  const formData = new FormData();
  const extension = getAudioFileExtension(payload.mime_type);

  formData.append("audio", payload.audio, `recording.${extension}`);
  formData.append("client_turn_id", payload.client_turn_id);
  formData.append("duration_ms", String(payload.duration_ms));
  formData.append("mime_type", payload.mime_type);

  return client.post<SubmitUserTurnResponse>(
    `/practice-sessions/${encodeURIComponent(sessionId)}/user-turns`,
    formData,
    { accessToken },
  );
}

export function discardUserTurn(
  sessionId: string,
  turnId: string,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.post<DiscardTurnResponse>(
    `/practice-sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}/discard`,
    undefined,
    { accessToken },
  );
}

export function confirmUserTurn(
  sessionId: string,
  turnId: string,
  payload: ConfirmTurnRequest,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.post<ConfirmTurnResponse>(
    `/practice-sessions/${encodeURIComponent(sessionId)}/turns/${encodeURIComponent(turnId)}/confirm`,
    payload,
    { accessToken },
  );
}

export function endPracticeSession(
  sessionId: string,
  payload: EndPracticeSessionRequest,
  accessToken: string,
  client: ApiClient = apiClient,
) {
  return client.post<EndPracticeSessionResponse>(
    `/practice-sessions/${encodeURIComponent(sessionId)}/end`,
    payload,
    { accessToken },
  );
}

export function buildPracticeSessionEventsUrl(sessionId: string, baseUrl?: string) {
  const configuredBaseUrl = stripApiBaseUrl(baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL);
  const path = `/practice-sessions/${encodeURIComponent(sessionId)}/events`;

  if (/^https?:\/\//.test(configuredBaseUrl)) {
    return `${configuredBaseUrl}/${path.replace(/^\/+/, "")}`;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");
    const prefix = configuredBaseUrl === "/" ? "" : configuredBaseUrl;
    return `${origin}${prefix}/${path.replace(/^\/+/, "")}`;
  }

  return `/${path.replace(/^\/+/, "")}`;
}

function stripApiBaseUrl(value?: string) {
  const normalized = (value || "/api/v1").replace(/\/+$/, "");
  return normalized || "/api/v1";
}

function getAudioFileExtension(mimeType: string) {
  switch (mimeType) {
    case "audio/mp4":
      return "mp4";
    case "audio/mpeg":
      return "mp3";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    default:
      return "webm";
  }
}

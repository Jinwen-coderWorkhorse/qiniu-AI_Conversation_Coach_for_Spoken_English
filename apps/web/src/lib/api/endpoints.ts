import { apiClient, type ApiClient } from "./client";
import type {
  AnonymousAuthRequest,
  AnonymousAuthResponse,
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
  HistoryListResponse,
  ListPracticeSessionsQuery,
  PracticeSessionDetail,
  PracticeSessionReportResponse,
  ScenarioDetail,
  ScenariosResponse,
  StatsResponse,
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

import { apiClient, type ApiClient } from "./client";
import type {
  AnonymousAuthRequest,
  AnonymousAuthResponse,
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
  PracticeSessionReportResponse,
  ScenarioDetail,
  ScenariosResponse,
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

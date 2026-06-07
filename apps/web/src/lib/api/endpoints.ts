import { apiClient, type ApiClient } from "./client";
import type {
  AnonymousAuthRequest,
  AnonymousAuthResponse,
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

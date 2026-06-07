import type { ApiClientHeaders, ApiErrorResponse, ApiRequestBody } from "./contracts";

const DEFAULT_API_BASE_URL = "/api/v1";

export type ApiClientOptions = {
  baseUrl?: string;
  accessToken?: string;
  fetcher?: typeof fetch;
  requestIdFactory?: () => string;
};

export type ApiRequestOptions = Omit<RequestInit, "body" | "headers"> &
  ApiClientHeaders & {
    body?: ApiRequestBody | FormData;
    headers?: HeadersInit;
  };

type ApiRequestErrorOptions = {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(message: string, options: ApiRequestErrorOptions) {
    super(message);
    this.name = "ApiRequestError";
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.details = options.details;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly accessToken?: string;
  private readonly fetcher: typeof fetch;
  private readonly requestIdFactory: () => string;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = stripTrailingSlash(
      options.baseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    );
    this.accessToken = options.accessToken;
    this.fetcher = options.fetcher ?? fetch;
    this.requestIdFactory = options.requestIdFactory ?? createRequestId;
  }

  withAccessToken(accessToken?: string) {
    return new ApiClient({
      baseUrl: this.baseUrl,
      accessToken,
      fetcher: this.fetcher,
      requestIdFactory: this.requestIdFactory,
    });
  }

  get<TResponse>(path: string, options: Omit<ApiRequestOptions, "body" | "method"> = {}) {
    return this.request<TResponse>(path, {
      ...options,
      method: "GET",
    });
  }

  post<TResponse>(
    path: string,
    body?: ApiRequestBody | FormData,
    options: Omit<ApiRequestOptions, "body" | "method"> = {},
  ) {
    return this.request<TResponse>(path, {
      ...options,
      body,
      method: "POST",
    });
  }

  async request<TResponse>(path: string, options: ApiRequestOptions = {}) {
    const { accessToken, body, headers: customHeaders, requestId, ...init } = options;
    const headers = new Headers(customHeaders);
    const token = accessToken ?? this.accessToken;
    const requestBody = prepareBody(body, headers);

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (!headers.has("X-Request-Id")) {
      headers.set("X-Request-Id", requestId ?? this.requestIdFactory());
    }

    const response = await this.fetcher(joinUrl(this.baseUrl, path), {
      ...init,
      body: requestBody,
      headers,
    });

    if (!response.ok) {
      await throwApiError(response);
    }

    if (response.status === 204) {
      return undefined as TResponse;
    }

    return (await response.json()) as TResponse;
  }
}

export const apiClient = new ApiClient();

function prepareBody(body: ApiRequestOptions["body"], headers: Headers) {
  if (body === undefined) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(body);
}

async function throwApiError(response: Response): Promise<never> {
  const payload = await readJson<ApiErrorResponse>(response);
  const error = payload?.error;

  throw new ApiRequestError(error?.message ?? response.statusText, {
    status: response.status,
    code: error?.code,
    requestId: error?.request_id,
    details: payload,
  });
}

async function readJson<T>(response: Response) {
  const text = await response.text();

  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function joinUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${baseUrl}/${path.replace(/^\/+/, "")}`;
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

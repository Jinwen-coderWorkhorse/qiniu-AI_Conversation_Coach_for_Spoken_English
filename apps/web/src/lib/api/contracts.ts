export type ApiErrorBody = {
  code: string;
  message: string;
  request_id?: string;
};

export type ApiErrorResponse = {
  error: ApiErrorBody;
};

export type ApiRequestBody =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

export type ApiClientHeaders = {
  accessToken?: string;
  requestId?: string;
};

export type AnonymousAuthRequest = {
  anonymous_id: string;
  anonymous_secret: string;
};

export type AnonymousAuthResponse = {
  user: {
    id: string;
    anonymous_id: string;
  };
  access_token: string;
  expires_in: number;
};

export type Scenario = {
  slug: string;
  name: string;
  summary: string;
  estimated_minutes: number;
  steps: string[];
};

export type ScenariosResponse = {
  items: Scenario[];
};

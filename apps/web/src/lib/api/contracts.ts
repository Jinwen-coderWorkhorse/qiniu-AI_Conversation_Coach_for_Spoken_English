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

export type ScenarioStep = {
  step_no: number;
  title: string;
};

export type ScenarioDetail = {
  slug: string;
  name: string;
  summary: string;
  estimated_minutes: number;
  steps: ScenarioStep[];
};

export type ScenariosResponse = {
  items: Scenario[];
};

export type CreatePracticeSessionRequest = {
  scenario_slug: string;
};

export type CreatePracticeSessionResponse = {
  id: string;
  status: string;
  scenario: {
    slug: string;
    name: string;
  };
  current_step_no: number;
  opening_message: {
    turn_id: string;
    text: string;
    audio_url: string | null;
    audio_mime_type: string | null;
  };
  events_url: string;
};

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

export type ReportStatus = "pending" | "completed" | "failed";

export type ReportScores = {
  pronunciation: number;
  fluency: number;
  grammar: number;
  expression: number;
};

export type ReportOverview = {
  overall_score: number;
  level_description: string;
  one_sentence_summary: string;
  scores: ReportScores;
};

export type ReportItemType = "pronunciation" | "grammar" | "expression";

export type ReportItem = {
  id: string;
  type: ReportItemType;
  explanation: string;
  practice_text: string;
  original_text?: string | null;
  suggestion_text?: string | null;
};

export type ReportStateError = {
  code: string;
  message: string;
};

export type ReportPendingResponse = {
  id: string;
  session_id: string;
  status: "pending";
};

export type ReportCompletedResponse = {
  id: string;
  session_id: string;
  status: "completed";
  overview: ReportOverview;
  items: ReportItem[];
};

export type ReportFailedResponse = {
  id: string;
  session_id: string;
  status: "failed";
  error: ReportStateError;
};

export type PracticeSessionReportResponse =
  | ReportPendingResponse
  | ReportCompletedResponse
  | ReportFailedResponse;

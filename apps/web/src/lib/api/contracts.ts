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

export type TurnSpeaker = "ai" | "user";

export type ConversationTurn = {
  id: string;
  turn_index: number;
  speaker: TurnSpeaker;
  transcript: string;
  asr_confidence?: number | null;
  audio_url?: string | null;
};

export type SessionScenario = {
  slug: string;
  name: string;
};

export type PracticeSessionDetail = {
  id: string;
  status: string;
  scenario: SessionScenario;
  current_step_no: number;
  started_at: string;
  ended_at?: string | null;
  turns: ConversationTurn[];
};

export type HistoryItem = {
  id: string;
  scenario_name: string;
  created_at: string;
  duration_sec: number;
  overall_score?: number | null;
  level_description?: string | null;
};

export type Pagination = {
  page: number;
  page_size: number;
  total: number;
};

export type HistoryListResponse = {
  items: HistoryItem[];
  pagination: Pagination;
};

export type ScoreTrendPoint = {
  date: string;
  score: number;
};

export type StatsResponse = {
  practice_count: number;
  spoken_minutes: number;
  user_word_count: number;
  average_score: number | null;
  score_trend: ScoreTrendPoint[];
};

export type ListPracticeSessionsQuery = {
  page?: number;
  page_size?: number;
  scenario_slug?: string;
};

export type AsrMetrics = {
  duration_ms?: number;
  word_count?: number;
  speech_rate_wpm?: number;
  pause_count?: number;
};

export type UserTurnAsr = {
  id: string;
  turn_index: number;
  speaker: "user";
  transcript: string;
  asr_confidence: number;
  needs_retry: boolean;
  metrics?: AsrMetrics;
};

export type SubmitUserTurnResponse = {
  turn: UserTurnAsr;
  hint?: string | null;
};

export type SubmitUserTurnPayload = {
  audio: Blob;
  client_turn_id: string;
  duration_ms: number;
  mime_type: string;
};

export type DiscardTurnResponse = {
  status: "discarded";
};

export type ConfirmTurnRequest = {
  accepted: boolean;
};

export type AiTurnResponse = {
  id: string;
  turn_index: number;
  speaker: "ai";
  text: string;
  audio_url?: string | null;
  audio_mime_type?: string | null;
};

export type ConfirmTurnResponse = {
  status: string;
  user_turn_id: string;
  ai_turn: AiTurnResponse;
  current_step_no: number;
};

export type EndPracticeSessionRequest = {
  reason: "user_finished" | "timeout";
};

export type EndPracticeSessionResponse = {
  session_id: string;
  status: string;
  report_id: string;
};

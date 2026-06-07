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

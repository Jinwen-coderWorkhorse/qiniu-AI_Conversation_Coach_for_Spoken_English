import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/lib/api/client";
import type {
  ConversationTurn,
  PracticeSessionDetail,
  SessionScenario,
} from "@/lib/api/contracts";
import { getPracticeSession } from "@/lib/api/endpoints";
import {
  authenticateAnonymousIdentity,
  clearAnonymousAccessToken,
  ensureAnonymousIdentity,
} from "@/lib/auth/anonymousIdentity";

export type PracticeRecordingState =
  | "loadingOpening"
  | "ready"
  | "recording"
  | "uploading"
  | "transcribing"
  | "transcriptReview"
  | "aiThinking"
  | "aiSpeaking"
  | "ending"
  | "reporting"
  | "error";

export type CapturedRecordingSummary = {
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  stopReason: "released" | "timeout";
};

export type PracticeState = {
  sessionId: string | null;
  scenario: SessionScenario | null;
  currentStepNo: number | null;
  sessionStatus: string | null;
  turns: ConversationTurn[];
  recordingState: PracticeRecordingState;
  error: string | null;
  recordingDurationMs: number;
  waveformLevel: number;
  capturedRecording: CapturedRecordingSummary | null;
  micPermissionError: string | null;
};

const initialState: PracticeState = {
  sessionId: null,
  scenario: null,
  currentStepNo: null,
  sessionStatus: null,
  turns: [],
  recordingState: "loadingOpening",
  error: null,
  recordingDurationMs: 0,
  waveformLevel: 0,
  capturedRecording: null,
  micPermissionError: null,
};

export const loadPracticeSession = createAsyncThunk<
  PracticeSessionDetail,
  string,
  { rejectValue: string }
>("practice/loadSession", async (sessionId, { rejectWithValue }) => {
  try {
    const identity = await ensureAnonymousIdentity();
    return await getPracticeSession(sessionId, identity.access_token);
  } catch (error) {
    if (isUnauthorized(error)) {
      clearAnonymousAccessToken();

      try {
        const identity = await authenticateAnonymousIdentity();
        return await getPracticeSession(sessionId, identity.access_token);
      } catch (retryError) {
        return rejectWithValue(getSessionErrorMessage(retryError));
      }
    }

    return rejectWithValue(getSessionErrorMessage(error));
  }
});

const practiceSlice = createSlice({
  name: "practice",
  initialState,
  reducers: {
    resetPractice: () => initialState,
    setRecordingState: (state, action: PayloadAction<PracticeRecordingState>) => {
      state.recordingState = action.payload;

      if (action.payload !== "error") {
        state.error = null;
      }
    },
    setPracticeError: (state, action: PayloadAction<string>) => {
      state.recordingState = "error";
      state.error = action.payload;
    },
    hydratePracticeSession: (state, action: PayloadAction<PracticeSessionDetail>) => {
      applySessionDetail(state, action.payload);
      state.recordingState = "ready";
      state.error = null;
    },
    setRecordingDurationMs: (state, action: PayloadAction<number>) => {
      state.recordingDurationMs = action.payload;
    },
    setWaveformLevel: (state, action: PayloadAction<number>) => {
      state.waveformLevel = action.payload;
    },
    setCapturedRecording: (state, action: PayloadAction<CapturedRecordingSummary>) => {
      state.capturedRecording = action.payload;
    },
    clearCapturedRecording: (state) => {
      state.capturedRecording = null;
    },
    setMicPermissionError: (state, action: PayloadAction<string>) => {
      state.micPermissionError = action.payload;
    },
    clearMicPermissionError: (state) => {
      state.micPermissionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPracticeSession.pending, (state, action) => {
        state.sessionId = action.meta.arg;
        state.recordingState = "loadingOpening";
        state.error = null;
      })
      .addCase(loadPracticeSession.fulfilled, (state, action) => {
        applySessionDetail(state, action.payload);
        state.recordingState = "ready";
        state.error = null;
      })
      .addCase(loadPracticeSession.rejected, (state, action) => {
        state.recordingState = "error";
        state.error = action.payload ?? "练习详情加载失败，请稍后重试。";
      });
  },
});

function applySessionDetail(state: PracticeState, session: PracticeSessionDetail) {
  state.sessionId = session.id;
  state.scenario = session.scenario;
  state.currentStepNo = session.current_step_no;
  state.sessionStatus = session.status;
  state.turns = session.turns;
}

function isUnauthorized(error: unknown) {
  return error instanceof ApiRequestError && error.status === 401;
}

function getSessionErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === "NOT_FOUND") {
      return "练习不存在或已被删除。";
    }

    if (error.status === 401) {
      return "匿名身份已失效，请重试恢复。";
    }

    if (error.status === 403) {
      return "无权查看这次练习。";
    }

    return error.message || "练习详情加载失败，请稍后重试。";
  }

  return "无法连接服务，请确认后端已启动。";
}

export const {
  resetPractice,
  setRecordingState,
  setPracticeError,
  hydratePracticeSession,
  setRecordingDurationMs,
  setWaveformLevel,
  setCapturedRecording,
  clearCapturedRecording,
  setMicPermissionError,
  clearMicPermissionError,
} = practiceSlice.actions;

export const practiceReducer = practiceSlice.reducer;

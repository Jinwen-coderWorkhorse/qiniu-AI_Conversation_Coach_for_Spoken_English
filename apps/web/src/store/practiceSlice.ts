import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { ApiRequestError } from "@/lib/api/client";
import type {
  ConfirmTurnResponse,
  ConversationTurn,
  EndPracticeSessionResponse,
  PracticeSessionDetail,
  SessionScenario,
  SubmitUserTurnResponse,
} from "@/lib/api/contracts";
import {
  confirmUserTurn,
  discardUserTurn,
  endPracticeSession as postEndPracticeSession,
  getPracticeSession,
  submitUserTurn,
} from "@/lib/api/endpoints";
import { normalizeUploadMimeType } from "@/lib/audio/uploadMimeType";
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

export type PendingReviewTurn = {
  id: string;
  turn_index: number;
  transcript: string;
  asr_confidence: number;
  needs_retry: boolean;
  hint?: string | null;
};

export type UploadUserTurnArgs = {
  sessionId: string;
  audio: Blob;
  durationMs: number;
  mimeType: string;
  clientTurnId: string;
};

export type PracticeState = {
  sessionId: string | null;
  scenario: SessionScenario | null;
  currentStepNo: number | null;
  sessionStatus: string | null;
  turns: ConversationTurn[];
  recordingState: PracticeRecordingState;
  error: string | null;
  turnActionError: string | null;
  recordingDurationMs: number;
  waveformLevel: number;
  capturedRecording: CapturedRecordingSummary | null;
  micPermissionError: string | null;
  clientTurnId: string | null;
  pendingReviewTurn: PendingReviewTurn | null;
  isDiscarding: boolean;
  isConfirming: boolean;
  isEnding: boolean;
};

const initialState: PracticeState = {
  sessionId: null,
  scenario: null,
  currentStepNo: null,
  sessionStatus: null,
  turns: [],
  recordingState: "loadingOpening",
  error: null,
  turnActionError: null,
  recordingDurationMs: 0,
  waveformLevel: 0,
  capturedRecording: null,
  micPermissionError: null,
  clientTurnId: null,
  pendingReviewTurn: null,
  isDiscarding: false,
  isConfirming: false,
  isEnding: false,
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

export const uploadUserTurn = createAsyncThunk<
  SubmitUserTurnResponse,
  UploadUserTurnArgs,
  { rejectValue: string }
>("practice/uploadUserTurn", async (payload, { rejectWithValue, dispatch }) => {
  dispatch(setRecordingState("uploading"));

  try {
    const identity = await ensureAnonymousIdentity();
    dispatch(setRecordingState("transcribing"));

    const mimeType = normalizeUploadMimeType(payload.mimeType);

    return await submitUserTurn(
      payload.sessionId,
      {
        audio: payload.audio,
        client_turn_id: payload.clientTurnId,
        duration_ms: payload.durationMs,
        mime_type: mimeType,
      },
      identity.access_token,
    );
  } catch (error) {
    if (isUnauthorized(error)) {
      clearAnonymousAccessToken();

      try {
        const identity = await authenticateAnonymousIdentity();
        dispatch(setRecordingState("transcribing"));

        const mimeType = normalizeUploadMimeType(payload.mimeType);

        return await submitUserTurn(
          payload.sessionId,
          {
            audio: payload.audio,
            client_turn_id: payload.clientTurnId,
            duration_ms: payload.durationMs,
            mime_type: mimeType,
          },
          identity.access_token,
        );
      } catch (retryError) {
        return rejectWithValue(getTurnActionErrorMessage(retryError));
      }
    }

    return rejectWithValue(getTurnActionErrorMessage(error));
  }
});

export const confirmPendingTurn = createAsyncThunk<
  ConfirmTurnResponse,
  { sessionId: string; turnId: string },
  { rejectValue: string }
>("practice/confirmPendingTurn", async ({ sessionId, turnId }, { rejectWithValue }) => {
  try {
    const identity = await ensureAnonymousIdentity();
    return await confirmUserTurn(
      sessionId,
      turnId,
      { accepted: true },
      identity.access_token,
    );
  } catch (error) {
    if (isUnauthorized(error)) {
      clearAnonymousAccessToken();

      try {
        const identity = await authenticateAnonymousIdentity();
        return await confirmUserTurn(
          sessionId,
          turnId,
          { accepted: true },
          identity.access_token,
        );
      } catch (retryError) {
        return rejectWithValue(getTurnActionErrorMessage(retryError));
      }
    }

    return rejectWithValue(getTurnActionErrorMessage(error));
  }
});

export const discardPendingTurn = createAsyncThunk<
  void,
  { sessionId: string; turnId: string },
  { rejectValue: string }
>("practice/discardPendingTurn", async ({ sessionId, turnId }, { rejectWithValue }) => {
  try {
    const identity = await ensureAnonymousIdentity();
    await discardUserTurn(sessionId, turnId, identity.access_token);
  } catch (error) {
    if (isUnauthorized(error)) {
      clearAnonymousAccessToken();

      try {
        const identity = await authenticateAnonymousIdentity();
        await discardUserTurn(sessionId, turnId, identity.access_token);
        return;
      } catch (retryError) {
        return rejectWithValue(getTurnActionErrorMessage(retryError));
      }
    }

    return rejectWithValue(getTurnActionErrorMessage(error));
  }
});

export const endPracticeSession = createAsyncThunk<
  EndPracticeSessionResponse,
  { sessionId: string },
  { rejectValue: string }
>("practice/endSession", async ({ sessionId }, { rejectWithValue }) => {
  try {
    const identity = await ensureAnonymousIdentity();
    return await postEndPracticeSession(
      sessionId,
      { reason: "user_finished" },
      identity.access_token,
    );
  } catch (error) {
    if (isUnauthorized(error)) {
      clearAnonymousAccessToken();

      try {
        const identity = await authenticateAnonymousIdentity();
        return await postEndPracticeSession(
          sessionId,
          { reason: "user_finished" },
          identity.access_token,
        );
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
      state.turnActionError = null;
    },
    setRecordingDurationMs: (state, action: PayloadAction<number>) => {
      state.recordingDurationMs = action.payload;
    },
    setWaveformLevel: (state, action: PayloadAction<number>) => {
      state.waveformLevel = action.payload;
    },
    setCapturedRecording: (state, action: PayloadAction<CapturedRecordingSummary>) => {
      state.capturedRecording = action.payload;
      state.turnActionError = null;

      if (state.recordingState === "recording") {
        state.recordingState = "uploading";
      }
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
    setClientTurnId: (state, action: PayloadAction<string>) => {
      state.clientTurnId = action.payload;
    },
    clearTurnActionError: (state) => {
      state.turnActionError = null;
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
        state.turnActionError = null;
      })
      .addCase(loadPracticeSession.rejected, (state, action) => {
        state.recordingState = "error";
        state.error = action.payload ?? "练习详情加载失败，请稍后重试。";
      })
      .addCase(uploadUserTurn.pending, (state) => {
        state.turnActionError = null;
      })
      .addCase(uploadUserTurn.fulfilled, (state, action) => {
        state.recordingState = "transcriptReview";
        state.pendingReviewTurn = mapPendingReviewTurn(action.payload);
        state.capturedRecording = null;
        state.turnActionError = null;
      })
      .addCase(uploadUserTurn.rejected, (state, action) => {
        state.recordingState = "ready";
        state.turnActionError = action.payload ?? "上传失败，请重试。";
      })
      .addCase(discardPendingTurn.pending, (state) => {
        state.isDiscarding = true;
        state.turnActionError = null;
      })
      .addCase(discardPendingTurn.fulfilled, (state) => {
        state.isDiscarding = false;
        state.pendingReviewTurn = null;
        state.clientTurnId = null;
        state.recordingState = "ready";
        state.turnActionError = null;
      })
      .addCase(discardPendingTurn.rejected, (state, action) => {
        state.isDiscarding = false;
        state.turnActionError = action.payload ?? "重说失败，请重试。";
      })
      .addCase(confirmPendingTurn.pending, (state) => {
        state.isConfirming = true;
        state.turnActionError = null;
        state.recordingState = "aiThinking";
      })
      .addCase(confirmPendingTurn.fulfilled, (state, action) => {
        state.isConfirming = false;

        if (state.pendingReviewTurn) {
          state.turns.push(mapConfirmedUserTurn(state.pendingReviewTurn));
        }

        state.turns.push(mapConfirmedAiTurn(action.payload.ai_turn));
        state.currentStepNo = action.payload.current_step_no;
        state.pendingReviewTurn = null;
        state.clientTurnId = null;
        state.turnActionError = null;
        state.recordingState = action.payload.ai_turn.audio_url ? "aiSpeaking" : "ready";
      })
      .addCase(confirmPendingTurn.rejected, (state, action) => {
        state.isConfirming = false;
        state.recordingState = "transcriptReview";
        state.turnActionError = action.payload ?? "确认失败，请重试。";
      })
      .addCase(endPracticeSession.pending, (state) => {
        state.isEnding = true;
        state.recordingState = "ending";
        state.error = null;
      })
      .addCase(endPracticeSession.fulfilled, (state) => {
        state.isEnding = false;
        state.recordingState = "reporting";
        state.sessionStatus = "reporting";
      })
      .addCase(endPracticeSession.rejected, (state, action) => {
        state.isEnding = false;
        state.recordingState = "ready";
        state.error = action.payload ?? "结束练习失败，请重试。";
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

function mapPendingReviewTurn(response: SubmitUserTurnResponse): PendingReviewTurn {
  return {
    id: response.turn.id,
    turn_index: response.turn.turn_index,
    transcript: response.turn.transcript,
    asr_confidence: response.turn.asr_confidence,
    needs_retry: response.turn.needs_retry,
    hint: response.hint,
  };
}

function mapConfirmedUserTurn(turn: PendingReviewTurn): ConversationTurn {
  return {
    id: turn.id,
    turn_index: turn.turn_index,
    speaker: "user",
    transcript: turn.transcript,
    asr_confidence: turn.asr_confidence,
  };
}

function mapConfirmedAiTurn(turn: ConfirmTurnResponse["ai_turn"]): ConversationTurn {
  return {
    id: turn.id,
    turn_index: turn.turn_index,
    speaker: "ai",
    transcript: turn.text,
    audio_url: turn.audio_url,
  };
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

function getTurnActionErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    switch (error.code) {
      case "SESSION_NOT_IN_PROGRESS":
        return "当前练习已结束。";
      case "AUDIO_REQUIRED":
        return "请重新录音。";
      case "AUDIO_TOO_LARGE":
        return "音频太大，请缩短录音。";
      case "AUDIO_DURATION_EXCEEDED":
        return "单次最多录 60 秒。";
      case "UNSUPPORTED_AUDIO_TYPE":
        return "当前浏览器录音格式暂不支持。";
      case "ASR_FAILED":
        return "识别失败，请重试。";
      case "RATE_LIMITED":
        return "今日练习轮次已达上限。";
      case "TURN_NOT_FOUND":
        return "识别结果不存在。";
      case "TURN_NOT_PENDING":
        return "当前识别结果不可重说。";
      default:
        return error.message || "操作失败，请稍后重试。";
    }
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
  setClientTurnId,
  clearTurnActionError,
} = practiceSlice.actions;

export const practiceReducer = practiceSlice.reducer;

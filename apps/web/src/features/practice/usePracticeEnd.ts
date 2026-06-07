"use client";

import { useCallback, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearEndPracticeError, endPractice } from "@/store/practiceSlice";

import { selectPracticeSession } from "./practiceSelectors";

type UsePracticeEndOptions = {
  sessionId: string;
};

export function usePracticeEnd({ sessionId }: UsePracticeEndOptions) {
  const dispatch = useAppDispatch();
  const practice = useAppSelector(selectPracticeSession);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const openConfirm = useCallback(() => {
    dispatch(clearEndPracticeError());
    setConfirmOpen(true);
  }, [dispatch]);

  const closeConfirm = useCallback(() => {
    if (practice.isEndingPractice) {
      return;
    }

    setConfirmOpen(false);
  }, [practice.isEndingPractice]);

  const confirmEndPractice = useCallback(async () => {
    const result = await dispatch(endPractice(sessionId));

    if (endPractice.fulfilled.match(result)) {
      setConfirmOpen(false);
    }
  }, [dispatch, sessionId]);

  return {
    confirmOpen,
    endPracticeError: practice.endPracticeError,
    isEndingPractice: practice.isEndingPractice,
    openConfirm,
    closeConfirm,
    confirmEndPractice,
  };
}

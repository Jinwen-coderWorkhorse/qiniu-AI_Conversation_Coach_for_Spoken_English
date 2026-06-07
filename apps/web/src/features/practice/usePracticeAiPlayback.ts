"use client";

import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setRecordingState } from "@/store/practiceSlice";

import { selectCurrentAiTurn, selectPracticeSession } from "./practiceSelectors";

export function usePracticeAiPlayback() {
  const dispatch = useAppDispatch();
  const practice = useAppSelector(selectPracticeSession);
  const currentAiTurn = selectCurrentAiTurn(practice.turns);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTokenRef = useRef(0);

  useEffect(() => {
    if (practice.recordingState !== "aiSpeaking") {
      audioRef.current?.pause();
      audioRef.current = null;
      return;
    }

    const audioUrl = currentAiTurn?.audio_url;

    if (!audioUrl) {
      dispatch(setRecordingState("ready"));
      return;
    }

    const playbackToken = playbackTokenRef.current + 1;
    playbackTokenRef.current = playbackToken;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const finishPlayback = () => {
      if (playbackTokenRef.current !== playbackToken) {
        return;
      }

      dispatch(setRecordingState("ready"));
    };

    audio.addEventListener("ended", finishPlayback);
    audio.addEventListener("error", finishPlayback);

    void audio.play().catch(finishPlayback);

    return () => {
      audio.removeEventListener("ended", finishPlayback);
      audio.removeEventListener("error", finishPlayback);
      audio.pause();
      audioRef.current = null;
    };
  }, [currentAiTurn?.audio_url, currentAiTurn?.id, dispatch, practice.recordingState]);
}

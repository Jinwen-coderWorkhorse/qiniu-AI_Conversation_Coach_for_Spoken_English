import type { ConversationTurn } from "@/lib/api/contracts";
import type { PracticeRecordingState } from "@/store/practiceSlice";

type AiCurrentUtteranceProps = {
  turn?: ConversationTurn;
  recordingState?: PracticeRecordingState;
  showTextFallback?: boolean;
  isLoading?: boolean;
};

export function AiCurrentUtterance({
  turn,
  recordingState = "ready",
  showTextFallback = false,
  isLoading = false,
}: AiCurrentUtteranceProps) {
  const isThinking = recordingState === "aiThinking";
  const isSpeaking = recordingState === "aiSpeaking";

  return (
    <section className="practice-ai-utterance" aria-labelledby="practice-ai-utterance-title">
      <div className="practice-section-heading">
        <h2 id="practice-ai-utterance-title">AI 当前发言</h2>
        {turn ? <span>第 {turn.turn_index} 轮</span> : null}
      </div>

      {isLoading ? (
        <div className="practice-ai-utterance-body practice-ai-utterance-loading" aria-busy="true">
          <span className="loading-line" />
          <span className="loading-line loading-line-short" />
        </div>
      ) : null}

      {!isLoading && isThinking ? (
        <p className="practice-ai-utterance-status" aria-live="polite">
          AI 正在回应...
        </p>
      ) : null}

      {!isLoading && !isThinking && turn ? (
        <>
          <p className="practice-ai-utterance-text">{turn.transcript}</p>
          {isSpeaking && turn.audio_url ? (
            <p className="practice-ai-utterance-status" aria-live="polite">
              正在播放 AI 语音...
            </p>
          ) : null}
          {showTextFallback && !isSpeaking ? (
            <p className="practice-ai-utterance-fallback" role="status">
              音频暂不可用，请阅读文字继续下一轮。
            </p>
          ) : null}
        </>
      ) : null}

      {!isLoading && !isThinking && !turn ? (
        <p className="practice-ai-utterance-empty">暂无 AI 开场白，请稍后重试恢复练习。</p>
      ) : null}
    </section>
  );
}

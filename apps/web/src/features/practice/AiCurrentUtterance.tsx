import type { ConversationTurn } from "@/lib/api/contracts";

type AiCurrentUtteranceProps = {
  turn?: ConversationTurn;
  isLoading?: boolean;
};

export function AiCurrentUtterance({ turn, isLoading = false }: AiCurrentUtteranceProps) {
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

      {!isLoading && turn ? (
        <p className="practice-ai-utterance-text">{turn.transcript}</p>
      ) : null}

      {!isLoading && !turn ? (
        <p className="practice-ai-utterance-empty">暂无 AI 开场白，请稍后重试恢复练习。</p>
      ) : null}
    </section>
  );
}

import type { ConversationTurn } from "@/lib/api/contracts";

type TranscriptTimelineProps = {
  turns: ConversationTurn[];
};

export function TranscriptTimeline({ turns }: TranscriptTimelineProps) {
  if (turns.length === 0) {
    return (
      <div className="history-empty-transcript">
        <p>这次练习还没有可回看的对话记录。</p>
      </div>
    );
  }

  return (
    <ol className="transcript-timeline" aria-label="对话记录">
      {turns.map((turn) => (
        <li
          className="transcript-turn"
          data-speaker={turn.speaker}
          key={turn.id}
        >
          <div className="transcript-turn-header">
            <span className="transcript-turn-speaker">
              {turn.speaker === "ai" ? "AI" : "你"}
            </span>
            <span className="transcript-turn-index">第 {turn.turn_index} 轮</span>
          </div>
          <p className="transcript-turn-text">{turn.transcript}</p>
          {turn.speaker === "user" && turn.asr_confidence !== null && turn.asr_confidence !== undefined ? (
            <p className="transcript-turn-confidence">
              识别置信度 {Math.round(turn.asr_confidence * 100)}%
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

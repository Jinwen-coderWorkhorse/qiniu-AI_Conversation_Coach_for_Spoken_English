import type { ConversationTurn } from "@/lib/api/contracts";

type RecentTranscriptProps = {
  turns: ConversationTurn[];
};

export function RecentTranscript({ turns }: RecentTranscriptProps) {
  return (
    <section className="practice-recent-transcript" aria-labelledby="practice-recent-transcript-title">
      <div className="practice-section-heading">
        <h2 id="practice-recent-transcript-title">最近对话</h2>
        <span>最近 {turns.length} 轮</span>
      </div>

      {turns.length === 0 ? (
        <p className="practice-recent-empty">还没有更早的对话记录。</p>
      ) : (
        <ol className="practice-recent-list" aria-label="最近对话记录">
          {turns.map((turn) => (
            <li className="practice-recent-item" data-speaker={turn.speaker} key={turn.id}>
              <div className="practice-recent-item-header">
                <span className="practice-recent-speaker">
                  {turn.speaker === "ai" ? "AI" : "你"}
                </span>
                <span className="practice-recent-index">第 {turn.turn_index} 轮</span>
              </div>
              <p className="practice-recent-text">{turn.transcript}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

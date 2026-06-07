import type { ConversationTurn } from "@/lib/api/contracts";
import type { RootState } from "@/store";

const RECENT_TURN_LIMIT = 3;

export function selectCurrentAiTurn(turns: ConversationTurn[]) {
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    if (turns[index]?.speaker === "ai") {
      return turns[index];
    }
  }

  return undefined;
}

export function selectRecentTurns(turns: ConversationTurn[], currentAiTurnId?: string) {
  const filteredTurns = currentAiTurnId
    ? turns.filter((turn) => turn.id !== currentAiTurnId)
    : turns;

  return filteredTurns.slice(-RECENT_TURN_LIMIT);
}

export function selectPracticeSession(state: RootState) {
  return state.practice;
}

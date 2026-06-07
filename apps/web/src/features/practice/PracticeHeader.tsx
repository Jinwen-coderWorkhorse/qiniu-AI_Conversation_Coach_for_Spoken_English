import type { SessionScenario } from "@/lib/api/contracts";

type PracticeHeaderProps = {
  scenario: SessionScenario;
  currentStepNo: number;
  sessionStatus: string;
  endPracticeDisabled?: boolean;
  isRecording?: boolean;
};

export function PracticeHeader({
  scenario,
  currentStepNo,
  sessionStatus,
  endPracticeDisabled = false,
  isRecording = false,
}: PracticeHeaderProps) {
  return (
    <header className="practice-header">
      <div className="practice-header-copy">
        <p className="eyebrow">语音对话</p>
        <h1 className="practice-header-title">{scenario.name}</h1>
        <p className="practice-header-meta">
          当前步骤 {currentStepNo}
          <span aria-hidden="true"> · </span>
          {formatSessionStatus(sessionStatus)}
        </p>
      </div>

      <button
        className="practice-end-button"
        type="button"
        disabled={endPracticeDisabled}
        aria-disabled={endPracticeDisabled}
        title={isRecording ? "录音中暂不可结束练习" : "结束练习将在后续版本接入"}
      >
        结束练习
      </button>
    </header>
  );
}

function formatSessionStatus(status: string) {
  switch (status) {
    case "in_progress":
      return "练习进行中";
    case "reporting":
      return "报告生成中";
    case "completed":
      return "已完成";
    case "aborted":
      return "已放弃";
    case "failed":
      return "异常结束";
    default:
      return status;
  }
}

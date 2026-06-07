import type { SessionScenario } from "@/lib/api/contracts";

type PracticeHeaderProps = {
  scenario: SessionScenario;
  currentStepNo: number;
  sessionStatus: string;
};

export function PracticeHeader({
  scenario,
  currentStepNo,
  sessionStatus,
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

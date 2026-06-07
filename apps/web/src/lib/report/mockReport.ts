import type {
  PracticeSessionReportResponse,
  ReportStatus,
} from "@/lib/api/contracts";

const MOCK_REPORT_ID = "00000000-0000-4000-8000-000000000001";
const MOCK_PRONUNCIATION_ITEM_ID = "00000000-0000-4000-8000-000000000002";
const MOCK_EXPRESSION_ITEM_ID = "00000000-0000-4000-8000-000000000003";

export type ReportPreviewStatus = ReportStatus;

export function createContractMockReport(
  sessionId: string,
  status: ReportPreviewStatus,
): PracticeSessionReportResponse {
  if (status === "pending") {
    return {
      id: MOCK_REPORT_ID,
      session_id: sessionId,
      status: "pending",
    };
  }

  if (status === "failed") {
    return {
      id: MOCK_REPORT_ID,
      session_id: sessionId,
      status: "failed",
      error: {
        code: "REPORT_FAILED",
        message: "报告生成失败，可稍后重试。",
      },
    };
  }

  return {
    id: MOCK_REPORT_ID,
    session_id: sessionId,
    status: "completed",
    overview: {
      overall_score: 76,
      level_description: "可以完成基本沟通",
      one_sentence_summary: "你能回答主要问题，但句子还偏短。",
      scores: {
        pronunciation: 78,
        fluency: 70,
        grammar: 76,
        expression: 72,
      },
    },
    items: [
      {
        id: MOCK_PRONUNCIATION_ITEM_ID,
        type: "pronunciation",
        explanation:
          "这轮回答识别置信度略低，建议放慢语速，并把 project 这类关键词说完整。",
        practice_text: "I worked on a project about online shopping.",
      },
      {
        id: MOCK_EXPRESSION_ITEM_ID,
        type: "expression",
        original_text: "I worked on a shopping app.",
        suggestion_text:
          "I worked on a shopping app, and I was responsible for the checkout flow.",
        explanation: "可以补充职责，让表达更完整。",
        practice_text:
          "I worked on a shopping app, and I was responsible for the checkout flow.",
      },
    ],
  };
}

export function parseReportPreviewStatus(value: string | null | undefined): ReportPreviewStatus | undefined {
  if (value === "pending" || value === "completed" || value === "failed") {
    return value;
  }

  return undefined;
}

export function canUseReportPreview() {
  return process.env.NODE_ENV === "development";
}

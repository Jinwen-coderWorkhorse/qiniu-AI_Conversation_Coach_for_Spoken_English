import type { ReportItem } from "@/lib/api/contracts";

export function pickPronunciationItem(items: ReportItem[]) {
  return items.find((item) => item.type === "pronunciation");
}

export function pickGrammarOrExpressionItem(items: ReportItem[]) {
  return items.find((item) => item.type === "grammar" || item.type === "expression");
}

export function getReportItemTypeLabel(type: ReportItem["type"]) {
  switch (type) {
    case "pronunciation":
      return "发音建议";
    case "grammar":
      return "语法建议";
    case "expression":
      return "表达建议";
  }
}

export const SCORE_LABELS = {
  pronunciation: "发音",
  fluency: "流利度",
  grammar: "语法",
  expression: "表达",
} as const;

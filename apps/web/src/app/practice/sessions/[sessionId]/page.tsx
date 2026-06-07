"use client";

import { use } from "react";

import { PracticeSessionView } from "@/features/practice/PracticeSessionView";

type PracticeSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default function PracticeSessionPage({ params }: PracticeSessionPageProps) {
  const { sessionId } = use(params);

  return <PracticeSessionView sessionId={sessionId} />;
}

import Link from "next/link";

type PracticeSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

export default async function PracticeSessionPage({ params }: PracticeSessionPageProps) {
  const { sessionId } = await params;

  return (
    <section className="practice-session-shell" aria-labelledby="practice-session-title">
      <p className="eyebrow">语音对话页</p>
      <h1 id="practice-session-title">练习进行中</h1>
      <p className="practice-session-summary">
        会话 ID：<code>{sessionId}</code>
      </p>
      <p className="practice-session-note">
        语音对话功能将由工程师 D 在后续 PR 实现。当前页面仅作为开练后的跳转目标。
      </p>
      <Link className="back-link" href="/">
        返回首页
      </Link>
    </section>
  );
}

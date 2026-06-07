export default function HomePage() {
  return (
    <section className="home-shell" aria-labelledby="home-title">
      <div className="home-copy">
        <p className="eyebrow">AI Speaking Practice</p>
        <h1 id="home-title">AI 英语口语陪练</h1>
        <p className="home-summary">选择一个真实场景，用几分钟完成一轮口语练习。</p>
      </div>

      <div className="scenario-panel" aria-label="练习场景">
        <div className="section-heading">
          <span>练习场景</span>
          <span>3 个入口</span>
        </div>
        <div className="scenario-slots" aria-hidden="true">
          <div className="scenario-slot" />
          <div className="scenario-slot" />
          <div className="scenario-slot" />
        </div>
      </div>
    </section>
  );
}

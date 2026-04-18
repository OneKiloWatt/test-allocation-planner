/* global React */
// PAGES/TOP.md — 初回ランディング
const { useState: useStateTop } = React;

function TopPage({ onStart, onLogin }) {
  return (
    <div style={{
      minHeight: "100%",
      padding: "32px 24px 120px",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 12, height: 12, borderRadius: 999, background: "var(--accent)" }}/>
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.01em" }}>
          テスト配分ノート
        </div>
      </div>

      {/* Headline */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 30, fontWeight: 700, lineHeight: 1.35,
          margin: 0, letterSpacing: "-0.01em",
          textWrap: "pretty",
        }}>
          テスト前の勉強を、<br/>
          <span style={{ color: "var(--accent)" }}>配分から</span>組みなおす。
        </h1>
        <p style={{
          margin: "14px 0 0", fontSize: 14,
          color: "var(--fg-muted)", lineHeight: 1.7,
        }}>
          テスト前の勉強計画を作り、進捗を記録し、<br/>
          結果を振り返るアプリです。
        </p>
      </div>

      {/* Visual — abstract placeholder that hints at the 3 phases */}
      <div style={{
        borderRadius: 20,
        padding: "24px 20px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
        marginBottom: 28,
      }}>
        <div className="label" style={{ marginBottom: 14 }}>3ステップで始まります</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StepRow n={1} title="テストを作る" sub="日程と科目を入れるだけ"/>
          <Divider/>
          <StepRow n={2} title="学習プランを作る" sub="自動で組む・手動で組むを選べる"/>
          <Divider/>
          <StepRow n={3} title="記録して振り返る" sub="結果を次のテストに引き継げる"/>
        </div>
      </div>

      {/* Spacer to push CTAs down a bit */}
      <div style={{ flex: 1, minHeight: 12 }}/>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
          すぐ試す
        </button>
        <button className="btn btn-ghost btn-lg btn-block" onClick={onLogin}>
          ログイン
        </button>
      </div>

      {/* Anonymous notice — 明確に、脅さず */}
      <p style={{
        margin: "14px 4px 0",
        fontSize: 12, lineHeight: 1.6,
        color: "var(--fg-subtle)", textAlign: "center",
      }}>
        まずは匿名で試せます。<br/>
        記録を別の端末でも使いたい場合はログインしてください。
      </p>
    </div>
  );
}

function StepRow({ n, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 999,
        background: "var(--accent-soft)",
        color: "var(--accent-fg)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-num)",
        fontWeight: 700, fontSize: 14,
        border: "1px solid hsl(22, 55%, 86%)",
        flexShrink: 0,
      }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", marginLeft: 44 }}/>;
}

window.TopPage = TopPage;

/* global React */
// PAGES/TOP.md — 初回ランディング
const { useState: useStateTop } = React;
const BRAND = window.APP_BRAND;

function TopPage({ onStart, onLogin }) {
  return (
    <div style={{
      minHeight: "100%",
      padding: "32px 24px 120px",
      display: "flex", flexDirection: "column",
      position: "relative",
    }}>
      {/* Brand */}
      <div style={{ marginBottom: 40 }}>
        <img
          src="logo.svg"
          alt={`${BRAND.nickname} ロゴ`}
          style={{ display: "block", width: 210, height: "auto" }}
        />
      </div>

      {/* Headline */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontSize: 30, fontWeight: 700, lineHeight: 1.35,
          margin: 0, letterSpacing: "-0.01em",
          textWrap: "pretty",
        }}>
          テスト勉強、<br/>
          何から始めるか<br/>
          <span style={{ color: "var(--accent)" }}>迷わなくなる。</span>
        </h1>
        <p style={{
          margin: "14px 0 0", fontSize: 14,
          color: "var(--fg-muted)", lineHeight: 1.7,
        }}>
          科目と日数を入れるだけで、<br/>
          何をどれだけやればいいか見えてくる。
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
          <StepRow n={3} title="記録して次に活かす" sub="やったことが次のテストで使える"/>
        </div>
      </div>

      {/* Spacer to push CTAs down a bit */}
      <div style={{ flex: 1, minHeight: 12 }}/>

      {/* CTAs */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button className="btn btn-primary btn-lg btn-block" onClick={onStart}>
          すぐ試す
        </button>
        <button className="btn btn-ghost" style={{width:"100%", fontSize:14, padding:"10px 14px"}} onClick={onLogin}>ログインする</button>
      </div>

      {/* Anonymous notice — 明確に、脅さず */}
      <p style={{
        margin: "14px 4px 0",
        fontSize: 12, lineHeight: 1.6,
        color: "var(--fg-subtle)", textAlign: "center",
      }}>
        登録なしで、今すぐ使えます。（ログインは後でもOK）
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

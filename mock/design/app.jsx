/* global React */
const { useState, useEffect, useMemo } = React;

// ─────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────
const SUBJECTS = [
  { name: "数学", short: "数", color: "hsl(22, 65%, 52%)" },
  { name: "英語", short: "英", color: "hsl(200, 40%, 50%)" },
  { name: "理科", short: "理", color: "hsl(150, 30%, 45%)" },
  { name: "国語", short: "国", color: "hsl(340, 30%, 55%)" },
  { name: "社会", short: "社", color: "hsl(45, 40%, 50%)" },
];
window.SUBJECTS = SUBJECTS;

function SubjDot({ subject, size = 22 }) {
  const s = SUBJECTS.find((x) => x.name === subject) || SUBJECTS[0];
  return (
    <span
      className="subj-dot"
      style={{ background: s.color, width: size, height: size, fontSize: size * 0.5 }}
    >
      {s.short}
    </span>
  );
}

function Icon({ name, size = 18, stroke = 1.8, color = "currentColor" }) {
  const p = { fill: "none", stroke: color, strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    plus: <><path d="M12 5v14M5 12h14" {...p}/></>,
    check: <path d="M5 12l5 5L20 7" {...p}/>,
    pencil: <><path d="M4 20h4l10-10-4-4L4 16v4z" {...p}/><path d="M13.5 6.5l4 4" {...p}/></>,
    clock: <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 7v5l3 2" {...p}/></>,
    chevron: <path d="M9 6l6 6-6 6" {...p}/>,
    chevronDown: <path d="M6 9l6 6 6-6" {...p}/>,
    book: <><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z" {...p}/><path d="M4 19a2 2 0 002 2h13" {...p}/></>,
    home: <><path d="M3 11l9-8 9 8v10a1 1 0 01-1 1h-5v-7h-6v7H4a1 1 0 01-1-1V11z" {...p}/></>,
    record: <><circle cx="12" cy="12" r="9" {...p}/><circle cx="12" cy="12" r="3.5" fill={color} stroke="none"/></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" {...p}/><path d="M3.5 10h17M8 3v4M16 3v4" {...p}/></>,
    target: <><circle cx="12" cy="12" r="9" {...p}/><circle cx="12" cy="12" r="5" {...p}/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/></>,
    sparkle: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3" {...p}/></>,
    trophy: <><path d="M7 4h10v4a5 5 0 01-10 0V4z" {...p}/><path d="M4 5h3v3a2 2 0 01-2-2V5zM17 5h3v1a2 2 0 01-2 2h-1V5zM9 14h6v4H9zM8 20h8" {...p}/></>,
    flag: <><path d="M5 3v18M5 5h13l-2 4 2 4H5" {...p}/></>,
    x: <><path d="M6 6l12 12M6 18L18 6" {...p}/></>,
    info: <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 8v.01M12 11v5" {...p}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {paths[name]}
    </svg>
  );
}

// ─────────────────────────────────────────────
// App chrome
// ─────────────────────────────────────────────
function AppHeader({ greeting }) {
  return (
    <header className="app-header">
      <div className="app-logo">
        <span className="dot"/>テスト配分ノート
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="badge">匿名モード</span>
      </div>
    </header>
  );
}

function BottomNav({ active = "home" }) {
  const items = [
    { k: "home", label: "ホーム", icon: "home" },
    { k: "test", label: "テスト", icon: "book" },
    { k: "record", label: "記録", icon: "record" },
  ];
  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <button key={it.k} className="nav-item" data-active={active === it.k}>
          <span className="nav-icon"><Icon name={it.icon} size={20} /></span>
          {it.label}
        </button>
      ))}
    </nav>
  );
}

// ─────────────────────────────────────────────
// Home screens, per state
// ─────────────────────────────────────────────

// 1. 未作成
function HomeEmpty({ onCreate }) {
  return (
    <div className="section stack-lg" style={{ paddingTop: 8 }}>
      <div>
        <h1 className="h1">まずは次のテストを<br/>作成しましょう</h1>
        <p className="p" style={{ marginTop: 8 }}>
          テスト日程と科目を入れると、<br/>教科ごとの目安時間を出せます。
        </p>
      </div>

      <div className="card card-pad" style={{ padding: 20 }}>
        <div className="empty-illu">EMPTY</div>
        <h3 className="h3" style={{ textAlign: "center", marginBottom: 8 }}>3ステップで始まります</h3>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: "var(--fg-muted)", lineHeight: 1.9 }}>
          <li>テストを作る</li>
          <li>目標と日程を入れる</li>
          <li>毎日の学習プランを確認する</li>
        </ol>
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={onCreate}>
        <Icon name="plus" size={18}/> テストを作成する
      </button>
      <p className="p" style={{ textAlign: "center", fontSize: 12 }}>
        あとからログインすれば別端末でも使えます
      </p>
    </div>
  );
}

// 2. planning
function HomePlanning({ exam }) {
  return (
    <div className="section stack-lg" style={{ paddingTop: 8 }}>
      <div className="card card-pad" style={{
        background: "var(--accent-softer)",
        borderColor: "hsl(22, 55%, 88%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span className="label" style={{ color: "var(--accent-fg)" }}>準備中</span>
          <span className="subtle" style={{ fontSize: 11 }}>·</span>
          <span className="subtle" style={{ fontSize: 12 }}>{exam.name}</span>
        </div>
        <h1 className="h1" style={{ fontSize: 20 }}>
          目標点数と日程を入れて<br/>配分案を作りましょう
        </h1>
      </div>

      <div className="stack">
        <StepItem done label="テストを作成" sub={`${exam.name} · ${exam.range}`}/>
        <StepItem current label="目標点数を入力" sub={`${exam.subjects.length}科目`}/>
        <StepItem label="日程/予定を入力" sub="自動 or 手動"/>
        <StepItem label="学習プランを確認" sub="教科別の目安時間"/>
      </div>

      <button className="btn btn-primary btn-lg btn-block">
        日ごとの学習プランを作る
        <Icon name="chevron" size={16} color="#fff"/>
      </button>
    </div>
  );
}

function StepItem({ label, sub, done, current }) {
  return (
    <div className="card card-pad" style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px",
      opacity: done && !current ? 0.75 : 1,
      borderColor: current ? "hsl(22, 55%, 80%)" : "var(--border)",
      background: current ? "var(--card)" : done ? "var(--bg-sunken)" : "var(--card)",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        display: "grid", placeItems: "center",
        background: done ? "var(--ok)" : current ? "var(--accent)" : "var(--bg-sunken)",
        color: done || current ? "#fff" : "var(--fg-subtle)",
        border: done || current ? "none" : "1px solid var(--border-strong)",
        flexShrink: 0,
      }}>
        {done ? <Icon name="check" size={14} stroke={2.4} color="#fff"/> : null}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div className="subtle" style={{ fontSize: 12 }}>{sub}</div>
      </div>
      {current && <Icon name="chevron" size={16} color="var(--accent)"/>}
    </div>
  );
}

// 3. active
function HomeActive({ exam }) {
  return (
    <>
      {/* 状況カード（細め） */}
      <div className="section" style={{ paddingTop: 4, paddingBottom: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px",
          borderRadius: 12,
          background: "var(--accent-softer)",
          border: "1px solid hsl(22, 55%, 88%)",
        }}>
          <Icon name="calendar" size={16} color="var(--accent)"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-fg)" }}>
              {exam.name}まで <span className="num">あと{exam.daysLeft}日</span>
            </div>
            <div className="subtle" style={{ fontSize: 11 }}>{exam.startLabel}</div>
          </div>
        </div>
      </div>

      {/* 今日やること（主役） */}
      <div className="section" style={{ paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 className="h2">今日やること</h2>
          <span className="subtle num" style={{ fontSize: 12 }}>{exam.today.dateLabel}</span>
        </div>

        <div className="card" style={{ padding: 18, background: "var(--card)" }}>
          <div className="stack">
            {exam.today.tasks.map((t) => (
              <div key={t.subject} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <SubjDot subject={t.subject} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{t.subject}</div>
                  <div className="subtle" style={{ fontSize: 12 }}>
                    {t.reason}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{t.minutes}</span>
                  <span className="muted" style={{ fontSize: 13, marginLeft: 2 }}>分</span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            <Icon name="pencil" size={16} color="#fff"/> 記録する
          </button>
        </div>
      </div>

      {/* 進捗サマリー */}
      <div className="section">
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 className="h2">進捗サマリー</h2>
          <button className="btn-link">すべて見る</button>
        </div>
        <div className="card card-pad">
          <div className="stack">
            {exam.progress.map((p) => (
              <ProgressRow key={p.subject} {...p} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function ProgressRow({ subject, doneMin, targetMin }) {
  const ratio = Math.min(1, doneMin / targetMin);
  const pct = Math.round(ratio * 100);
  const remaining = Math.max(0, targetMin - doneMin);
  const h = (m) => `${Math.floor(m / 60)}時間${m % 60 ? ` ${m % 60}分` : ""}`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <SubjDot subject={subject} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="meta-row" style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{subject}</div>
          <div className="subtle num" style={{ fontSize: 12 }}>
            残り <b style={{ color: "var(--fg)", fontWeight: 700 }}>{h(remaining)}</b>
          </div>
        </div>
        <div className="progress"><span style={{ width: `${pct}%` }}/></div>
      </div>
      <span className="num" style={{ fontSize: 12, color: "var(--fg-muted)", minWidth: 32, textAlign: "right" }}>
        {pct}%
      </span>
    </div>
  );
}

// 4. finished, 結果未入力
function HomeFinishedPending({ exam }) {
  return (
    <div className="section stack-lg" style={{ paddingTop: 8 }}>
      <div className="card card-pad" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Icon name="flag" size={16} color="var(--accent)"/>
          <span className="label" style={{ color: "var(--accent-fg)" }}>おつかれさまでした</span>
        </div>
        <h1 className="h1" style={{ fontSize: 22 }}>
          {exam.name}が<br/>終了しました
        </h1>
        <p className="p" style={{ marginTop: 10 }}>
          今回の点数と実際の勉強時間を記録しましょう。
          次回のテスト作成時に引き継げます。
        </p>
      </div>

      <div className="card card-pad">
        <h3 className="h3" style={{ marginBottom: 10 }}>記録するもの</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {exam.subjects.map((s) => (
            <div key={s.name} className="row" style={{ paddingTop: 10, paddingBottom: 10 }}>
              <SubjDot subject={s.name}/>
              <div style={{ flex: 1, fontSize: 14 }}>{s.name}</div>
              <span className="subtle num" style={{ fontSize: 12 }}>目標 {s.target}点</span>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary btn-lg btn-block">
        <Icon name="pencil" size={18} color="#fff"/> 結果を入力する
      </button>
      <button className="btn btn-ghost btn-block">あとで入力する</button>
    </div>
  );
}

// 5. finished 入力済み → 次の planning/active を優先。なければ作成CTA。
function HomeFinishedDone({ exam, onCreate }) {
  return (
    <div className="section stack-lg" style={{ paddingTop: 8 }}>
      <div className="card card-pad" style={{
        background: "var(--ok-soft)",
        borderColor: "oklch(0.86 0.04 150)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="trophy" size={16} color="oklch(0.45 0.08 150)"/>
          <span className="label" style={{ color: "oklch(0.38 0.07 150)" }}>最新の結果</span>
        </div>
        <h1 className="h1" style={{ fontSize: 20 }}>{exam.name}</h1>
        <div className="stack-sm" style={{ marginTop: 12 }}>
          {exam.result.map((r) => (
            <div key={r.subject} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SubjDot subject={r.subject} size={20}/>
              <div style={{ flex: 1, fontSize: 13 }}>{r.subject}</div>
              <span className="num" style={{ fontSize: 13 }}>
                {r.actual}<span className="muted" style={{ fontSize: 11 }}>/{r.target}</span>
              </span>
              {r.actual >= r.target
                ? <span className="badge badge-ok">達成</span>
                : <span className="badge">未達</span>}
            </div>
          ))}
        </div>
        <button className="btn-link" style={{ marginTop: 12 }}>結果カードを見る →</button>
      </div>

      <div className="card card-pad" style={{ textAlign: "center", padding: 20 }}>
        <div className="empty-illu" style={{ width: 80, height: 56 }}>NEXT</div>
        <h3 className="h3" style={{ marginBottom: 6 }}>次のテストは？</h3>
        <p className="p" style={{ fontSize: 13 }}>
          前回の結果を引き継いで、配分の考え方を参考にできます。
        </p>
      </div>

      <button className="btn btn-primary btn-lg btn-block" onClick={onCreate}>
        <Icon name="plus" size={18} color="#fff"/> 次のテストを作成する
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// SAVE_PROMPT sheet (bottom sheet after save)
// ─────────────────────────────────────────────
function SavePrompt({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "var(--accent-soft)", display: "grid", placeItems: "center",
            flexShrink: 0,
          }}>
            <Icon name="info" size={20} color="var(--accent-fg)"/>
          </div>
          <div>
            <h2 className="h2" style={{ fontSize: 16 }}>この記録はこの端末に保存されています</h2>
            <p className="p" style={{ fontSize: 13, marginTop: 4 }}>
              ブラウザや端末を変えると見られなくなる場合があります。
              別の端末でも使いたい場合はログインしてください。
            </p>
          </div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <button className="btn btn-primary btn-block">ログインする</button>
          <button className="btn btn-ghost btn-block" onClick={onClose}>あとで</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────
const DATA = {
  empty: null,

  planning: {
    name: "2学期中間テスト",
    range: "10/14 - 10/17",
    subjects: [
      { name: "数学" }, { name: "英語" }, { name: "理科" }, { name: "国語" }, { name: "社会" },
    ],
  },

  active: {
    name: "2学期中間テスト",
    daysLeft: 6,
    startLabel: "10/14 開始 · 4日間",
    today: {
      dateLabel: "10/8 (水)",
      tasks: [
        { subject: "数学", minutes: 60, reason: "前回64点 · 目標差分が大きい" },
        { subject: "理科", minutes: 30, reason: "前回より少し増やす案" },
      ],
    },
    progress: [
      { subject: "数学", doneMin: 120, targetMin: 480 },
      { subject: "英語", doneMin: 180, targetMin: 300 },
      { subject: "理科", doneMin: 90, targetMin: 360 },
      { subject: "国語", doneMin: 60, targetMin: 180 },
      { subject: "社会", doneMin: 45, targetMin: 180 },
    ],
  },

  finishedPending: {
    name: "2学期中間テスト",
    subjects: [
      { name: "数学", target: 75 },
      { name: "英語", target: 80 },
      { name: "理科", target: 70 },
      { name: "国語", target: 70 },
      { name: "社会", target: 65 },
    ],
  },

  finishedDone: {
    name: "1学期期末テスト",
    result: [
      { subject: "数学", target: 70, actual: 72 },
      { subject: "英語", target: 80, actual: 76 },
      { subject: "理科", target: 65, actual: 58 },
      { subject: "国語", target: 70, actual: 74 },
      { subject: "社会", target: 65, actual: 68 },
    ],
  },
};

// ─────────────────────────────────────────────
// Root + state switcher (Tweaks-style left panel)
// ─────────────────────────────────────────────
const STATES = [
  { k: "empty", label: "テスト未作成", sub: "Exam が1件もない" },
  { k: "planning", label: "準備中 (planning)", sub: "目標/予定 未完了" },
  { k: "active", label: "進行中 (active)", sub: "今日やること・進捗サマリー" },
  { k: "finishedPending", label: "完了·結果未入力", sub: "結果入力CTA" },
  { k: "finishedDone", label: "完了·結果入力済み", sub: "次のテスト作成CTA" },
];

function App() {
  const [page, setPage] = useState(() => localStorage.getItem("stady.page") || "top");
  const [state, setState] = useState(() => localStorage.getItem("stady.home.state") || "active");
  const [savePrompt, setSavePrompt] = useState(false);
  const phoneRef = React.useRef(null);
  const [phoneEl, setPhoneEl] = useState(null);
  React.useEffect(() => { setPhoneEl(phoneRef.current); }, []);

  useEffect(() => { localStorage.setItem("stady.home.state", state); }, [state]);
  useEffect(() => { localStorage.setItem("stady.page", page); }, [page]);

  const go = (p) => setPage(p);

  return (
    <div className="stage">
      <div className="phone" ref={phoneRef} role="application" aria-label="stady mobile">
        <div className="phone-notch"/>
        <div className="phone-content">
          {page === "top" && window.TopPage && (
            <window.TopPage
              onStart={() => go("home")}
              onLogin={() => go("home")}
            />
          )}
          {page === "home" && <>
            <AppHeader/>
            {state === "empty" && <HomeEmpty onCreate={() => {}}/>}
            {state === "planning" && <HomePlanning exam={DATA.planning}/>}
            {state === "active" && <HomeActive exam={DATA.active}/>}
            {state === "finishedPending" && <HomeFinishedPending exam={DATA.finishedPending}/>}
            {state === "finishedDone" && <HomeFinishedDone exam={DATA.finishedDone} onCreate={() => {}}/>}
            <div style={{ height: 100 }}/>
          </>}
        </div>
        {page === "home" && <BottomNav active="home"/>}
        <SavePrompt open={savePrompt} onClose={() => setSavePrompt(false)}/>
      </div>

      <aside className="state-panel" aria-label="state switcher">
        <h4>画面</h4>
        <button className="state-opt" data-active={page === "top"} onClick={() => go("top")}>
          <span className="k">◉</span>トップ (TOP)
        </button>
        <button className="state-opt" data-active={page === "home"} onClick={() => go("home")}>
          <span className="k">◉</span>ホーム (HOME)
        </button>
        <div style={{ margin: "12px 0", borderTop: "1px solid var(--border)" }}/>
        {page === "home" && <>
          <h4>ホームの状態</h4>
          {STATES.map((s) => (
            <button
              key={s.k}
              className="state-opt"
              data-active={state === s.k}
              onClick={() => setState(s.k)}
            >
              <span className="k">{STATES.indexOf(s) + 1}.</span>
              <span>{s.label}</span>
              <div style={{ fontSize: 11, color: "var(--fg-subtle)", marginLeft: 20, marginTop: 2 }}>
                {s.sub}
              </div>
            </button>
          ))}
          <div style={{ margin: "12px 0", borderTop: "1px solid var(--border)" }}/>
          <button className="state-opt" onClick={() => setSavePrompt(true)}>
            <span className="k">+</span>保存案内ポップを表示
          </button>
        </>}
        <p>
          docs/PAGES の仕様に沿って画面を追加中。
        </p>
      </aside>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

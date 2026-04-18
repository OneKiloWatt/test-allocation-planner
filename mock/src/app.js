const state = {
  route: "home",
  history: [],
  homeState: "active",
  selectedExam: {
    name: "2学期中間",
    days: [
      { date: "9/18", subjects: ["数学", "英語"] },
      { date: "9/19", subjects: ["国語", "理科"] },
      { date: "9/20", subjects: ["社会"] },
    ],
  },
  previousExam: {
    name: "1学期期末",
    term: "1年 1学期期末",
    subjects: [
      { name: "数学", target: 70, score: 72, hours: 8 },
      { name: "英語", target: 80, score: 76, hours: 5 },
      { name: "理科", target: 65, score: 58, hours: 3 },
    ],
  },
};

function navigate(route) {
  state.history.push(state.route);
  state.route = route;
  render();
}

function goBack() {
  state.route = state.history.pop() || "home";
  render();
}

function shell(title, body, back = true) {
  const topLevel = ["home", "tests", "records"];
  const activeRoot = topLevel.includes(state.route)
    ? state.route
    : state.route === "review" || state.route === "test-create" || state.route === "target-score" || state.route === "plan-mode" || state.route === "daily-plan"
      ? "tests"
      : state.route === "progress-log" || state.route === "progress-summary" || state.route === "result-entry"
        ? "records"
        : "home";
  return `
    <div class="shell">
      <div class="header">
        ${back ? '<button class="back" data-action="back">戻る</button>' : ""}
        <h1>${title}</h1>
      </div>
      <div class="content">${body}</div>
      <div class="tabbar">
        <button class="tab ${activeRoot === "home" ? "active" : ""}" data-route="home">ホーム</button>
        <button class="tab ${activeRoot === "tests" ? "active" : ""}" data-route="tests">テスト</button>
        <button class="tab ${activeRoot === "records" ? "active" : ""}" data-route="records">記録</button>
      </div>
    </div>
  `;
}

function homePage() {
  if (state.homeState === "empty") {
    return shell(
      "ホーム",
      `
        <section class="card hero">
          <div class="eyebrow">はじめての設定</div>
          <h2 class="title">まずは次のテストを作成しましょう</h2>
          <div class="muted">テスト日程と科目を入れると、勉強プランを作れます。</div>
          <button class="button" data-route="test-create">テストを作成する</button>
        </section>
      `,
      false,
    );
  }

  if (state.homeState === "planning") {
    return shell(
      "ホーム",
      `
        <section class="card hero">
          <div class="eyebrow">準備中</div>
          <h2 class="title">目標点数と日程を入れましょう</h2>
          <div class="muted">配分プランを作ると、今日やることが表示されます。</div>
          <button class="button" data-route="target-score">プランを作る</button>
        </section>
      `,
      false,
    );
  }

  if (state.homeState === "finished-pending") {
    return shell(
      "ホーム",
      `
        <section class="card hero">
          <div class="eyebrow">テスト終了</div>
          <h2 class="title">2学期中間テストが終了しました</h2>
          <div class="muted">今回の点数と実際の勉強時間を記録しましょう。</div>
          <button class="button" data-route="result-entry">結果を入力する</button>
        </section>
      `,
      false,
    );
  }

  return shell(
    "ホーム",
    `
      <section class="card hero">
        <div class="eyebrow">進行中テスト</div>
        <h2 class="title">2学期中間テストまであと6日</h2>
        <div class="muted">9/18開始</div>
      </section>

      <section class="card">
        <div class="eyebrow">今日やること</div>
        <div class="stat-list">
          <div class="stat">
            <span>数学</span>
            <strong>45分</strong>
          </div>
          <div class="stat">
            <span>理科</span>
            <strong>30分</strong>
          </div>
        </div>
        <div class="button-row">
          <button class="button" data-route="progress-log">記録する</button>
          <button class="button secondary" data-route="daily-plan">プランを見る</button>
        </div>
      </section>

      <section class="card">
        <div class="eyebrow">進捗サマリー</div>
        <div class="stat-list">
          <div class="stat">
            <span>数学</span>
            <span class="muted">2 / 9時間</span>
          </div>
          <div class="stat">
            <span>英語</span>
            <span class="muted">1 / 6時間</span>
          </div>
          <div class="stat">
            <span>理科</span>
            <span class="muted">0 / 5時間</span>
          </div>
        </div>
      </section>
    `,
    false,
  );
}

function testsPage() {
  return shell(
    "テスト",
    `
      <section class="card hero">
        <div class="eyebrow">進行中</div>
        <h2 class="title">${state.selectedExam.name}</h2>
        <div class="muted">9/18開始 / 配分作成済み / のこり6日</div>
        <div class="button-row">
          <button class="button" data-route="daily-plan">プランを見る</button>
          <button class="button ghost" data-route="test-create">編集する</button>
        </div>
      </section>

      <section class="card">
        <div class="eyebrow">テスト一覧</div>
        <div class="stat-list">
          <button class="stat" data-route="test-detail-active"><span>2学期中間</span><span class="muted">進行中</span></button>
          <button class="stat" data-route="review"><span>${state.previousExam.term}</span><span class="muted">完了</span></button>
        </div>
        <button class="button ghost" data-route="test-create">新しく作成する</button>
        <div class="button-row">
          <button class="button ghost" data-action="show-finished">終了後ホームを確認</button>
          <button class="button ghost" data-action="show-empty">初回空状態を確認</button>
          <button class="button ghost" data-action="show-planning">準備中ホームを確認</button>
        </div>
      </section>
    `,
    false,
  );
}

function testDetailActivePage() {
  return shell(
    "2学期中間",
    `
      <section class="card hero">
        <div class="eyebrow">進行中テスト</div>
        <h2 class="title">2学期中間テストまであと6日</h2>
        <div class="muted">9/18開始 / 配分作成済み</div>
      </section>

      <section class="card">
        <div class="eyebrow">今日やること</div>
        <div class="stat-list">
          <div class="stat"><span>数学</span><strong>45分</strong></div>
          <div class="stat"><span>理科</span><strong>30分</strong></div>
        </div>
        <div class="button-row">
          <button class="button" data-route="progress-log">記録する</button>
          <button class="button ghost" data-route="daily-plan">プランを見る</button>
        </div>
      </section>

      <section class="card">
        <div class="eyebrow">進捗</div>
        <div class="stat-list">
          <div class="stat"><span>数学</span><span class="muted">2 / 9時間</span></div>
          <div class="stat"><span>英語</span><span class="muted">1 / 6時間</span></div>
          <div class="stat"><span>理科</span><span class="muted">0 / 5時間</span></div>
        </div>
      </section>
    `,
  );
}

function recordsPage() {
  return shell(
    "記録",
    `
      <section class="card hero">
        <div class="eyebrow">今日の記録</div>
        <h2 class="title">今日やった分を記録する</h2>
        <div class="muted">記録すると、達成率と残り時間が更新されます。</div>
        <button class="button" data-route="progress-log">記録する</button>
      </section>

      <section class="card">
        <div class="eyebrow">現在の進捗</div>
        <div class="stat-list">
          <div class="stat"><span>数学</span><span class="muted">2 / 9時間</span></div>
          <div class="stat"><span>英語</span><span class="muted">1 / 6時間</span></div>
          <div class="stat"><span>理科</span><span class="muted">0 / 5時間</span></div>
        </div>
      </section>

      <section class="card">
        <div class="eyebrow">直近の記録</div>
        <div class="muted">昨日: 数学 2時間 / ワークを2章進めた</div>
      </section>
    `,
    false,
  );
}

function testCreatePage() {
  return shell(
    "テスト作成",
    `
      <section class="card">
        <div class="field">
          <label>テスト名</label>
          <input value="2学期中間" />
        </div>
        <div class="schedule-day">
          <strong>1日目 9/18</strong>
          <div class="muted">数学 / 英語</div>
        </div>
        <div class="schedule-day">
          <strong>2日目 9/19</strong>
          <div class="muted">国語 / 理科</div>
        </div>
        <div class="schedule-day">
          <strong>3日目 9/20</strong>
          <div class="muted">社会</div>
        </div>
        <div class="footer-actions">
          <button class="button secondary">日程を追加</button>
          <button class="button" data-route="target-score">目標点数を入れる</button>
        </div>
      </section>
    `,
  );
}

function targetScorePage() {
  return shell(
    "目標点数入力",
    `
      <section class="card">
        <div class="eyebrow">目標点数</div>
        <div class="subject-grid">
          ${["数学", "英語", "国語", "理科", "社会"]
            .map(
              (name, i) => `
              <div class="subject-row">
                <div class="subject-head">
                  <strong>${name}</strong>
                  ${i < 2 ? '<span class="tag">前回あり</span>' : ""}
                </div>
                <div class="mini-grid">
                  <div class="field">
                    <label>目標点</label>
                    <input value="${name === "数学" ? "75" : "80"}" />
                  </div>
                  <div class="field">
                    <label>前回</label>
                    <input value="${name === "数学" ? "72" : name === "英語" ? "76" : "-"}" />
                  </div>
                </div>
              </div>`,
            )
            .join("")}
        </div>
        <button class="button" data-route="plan-mode">日程/予定を設定する</button>
      </section>
    `,
  );
}

function planModePage() {
  return shell(
    "日程・予定入力",
    `
      <section class="card">
        <div class="eyebrow">日程化の方法</div>
        <div class="button-row">
          <button class="button secondary">自動で組む</button>
          <button class="button ghost" data-route="daily-plan">手動で組む</button>
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">自動で組む場合の基本設定</div>
        <div class="mini-grid">
          <div class="field">
            <label>平日 部活あり</label>
            <input value="45分" />
          </div>
          <div class="field">
            <label>平日 部活なし</label>
            <input value="90分" />
          </div>
        </div>
        <div class="mini-grid">
          <div class="field">
            <label>土曜</label>
            <input value="180分" />
          </div>
          <div class="field">
            <label>日曜</label>
            <input value="120分" />
          </div>
        </div>
        <div class="field">
          <label>部活がある曜日</label>
          <input value="月, 火, 木, 金" />
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">こだわって設定する</div>
        <div class="field">
          <label>詳細設定</label>
          <input value="テスト1週間前は部活なし扱い: ON" />
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">特殊ケースを追加する</div>
        <div class="field">
          <label>例外日</label>
          <input value="9/14 は 0分, 9/18 は 120分" />
        </div>
        <button class="button" data-route="daily-plan">日ごとのプランを作る</button>
      </section>
    `,
  );
}

function dailyPlanPage() {
  return shell(
    "日ごとの学習プラン",
    `
      <section class="card">
        <div class="eyebrow">おすすめ配分サマリー</div>
        <div class="stat-list">
          <div class="stat">
            <div>
              <strong>数学</strong>
              <div class="muted">前回 8時間 → 今回目安 9時間</div>
            </div>
            <span class="tag warn">増やす</span>
          </div>
          <div class="stat">
            <div>
              <strong>英語</strong>
              <div class="muted">前回 5時間 → 今回目安 6時間</div>
            </div>
            <span class="tag">維持寄り</span>
          </div>
          <div class="stat">
            <div>
              <strong>理科</strong>
              <div class="muted">前回 3時間 → 今回目安 5時間</div>
            </div>
            <span class="tag warn">増やす</span>
          </div>
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">日付を押して追加/編集</div>
        <div class="calendar-grid">
          <button class="calendar-cell" data-route="daily-edit">
            <div class="calendar-date">9/10</div>
            <div class="calendar-item">数学 45分</div>
          </button>
          <button class="calendar-cell" data-route="daily-edit">
            <div class="calendar-date">9/11</div>
            <div class="calendar-item">英語 30分</div>
            <div class="calendar-item">理科 30分</div>
          </button>
          <button class="calendar-cell" data-route="daily-edit">
            <div class="calendar-date">9/12</div>
            <div class="calendar-item">数学 30分</div>
          </button>
          <button class="calendar-cell empty" data-route="daily-edit-empty">
            <div class="calendar-date">9/13</div>
            <div class="muted">未設定</div>
          </button>
          <button class="calendar-cell empty" data-route="daily-edit-empty">
            <div class="calendar-date">9/14</div>
            <div class="muted">未設定</div>
          </button>
          <button class="calendar-cell" data-route="daily-edit">
            <div class="calendar-date">9/15</div>
            <div class="calendar-item">理科 60分</div>
          </button>
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">確認</div>
        <div class="muted">まずはこのプランで進めます。残り時間は勉強記録をつけた後に表示されます。</div>
        <div class="button-row">
          <button class="button" data-route="home">このプランで進める</button>
          <button class="button ghost" data-route="plan-mode">条件を見直す</button>
        </div>
      </section>
    `,
  );
}

function dailyEditPage(empty = false) {
  return shell(
    empty ? "9/13 の追加" : "9/10 の編集",
    `
      <section class="card">
        <div class="eyebrow">${empty ? "まだ学習プランがありません" : "この日の学習プランを編集"}</div>
        <div class="muted">${empty ? "日付を押して、やる科目と目安時間を置いていきましょう。" : "その日の科目と目安時間を調整できます。"}</div>
        <div class="field">
          <label>科目</label>
          <select>
            <option>${empty ? "数学" : "数学"}</option>
            <option>英語</option>
            <option>理科</option>
            <option>国語</option>
            <option>社会</option>
          </select>
        </div>
        <div class="field">
          <label>目安時間</label>
          <input value="${empty ? "45分" : "45分"}" />
        </div>
        <div class="button-row">
          <button class="button" data-route="daily-plan">${empty ? "最初の1日を追加する" : "更新する"}</button>
          <button class="button ghost" data-route="daily-plan">戻る</button>
        </div>
      </section>
    `,
  );
}

function progressLogPage() {
  return shell(
    "進捗登録",
    `
      <section class="card">
        <div class="eyebrow">今日やった分を記録</div>
        <div class="field">
          <label>科目</label>
          <select>
            <option>数学</option>
            <option>英語</option>
            <option>理科</option>
            <option>国語</option>
            <option>社会</option>
          </select>
        </div>
        <div class="field">
          <label>今日やった時間</label>
          <input value="2時間" />
        </div>
        <div class="field">
          <label>メモ（任意）</label>
          <input value="ワークを2章進めた" />
        </div>
        <button class="button" data-route="progress-summary">保存する</button>
      </section>
    `,
  );
}

function progressSummaryPage() {
  return shell(
    "進捗反映",
    `
      <section class="card">
        <div class="eyebrow">数学の進捗</div>
        <strong>目標 8時間</strong>
        <div class="muted">今日 2時間を追加しました</div>
        <div class="progress-bar"><span style="width: 25%"></span></div>
        <div class="stat-list">
          <div class="stat"><span>実績</span><strong>2時間</strong></div>
          <div class="stat"><span>残り</span><strong>6時間</strong></div>
          <div class="stat"><span>進捗</span><strong>25%</strong></div>
        </div>
      </section>
      <section class="card">
        <div class="eyebrow">次に記録する候補</div>
        <div class="muted">今週は数学を優先。次は理科を1時間進めると配分に近づきます。</div>
        <div class="button-row">
          <button class="button" data-route="progress-log">別の進捗も記録する</button>
          <button class="button ghost" data-route="home">ホームへ戻る</button>
        </div>
      </section>
    `,
  );
}

function resultEntryPage() {
  return shell(
    "結果入力",
    `
      <section class="card">
        <div class="eyebrow">2学期中間 終了後</div>
        <div class="subject-grid">
          ${["数学", "英語", "国語", "理科", "社会"]
            .map(
              (name) => `
            <div class="subject-row">
              <strong>${name}</strong>
              <div class="mini-grid">
                <div class="field">
                  <label>点数</label>
                  <input value="${name === "数学" ? "74" : "78"}" />
                </div>
                <div class="field">
                  <label>勉強時間</label>
                  <input value="${name === "数学" ? "9" : "5"}時間" />
                </div>
              </div>
            </div>`,
            )
            .join("")}
        </div>
        <button class="button" data-route="review">振り返りを見る</button>
      </section>
    `,
  );
}

function reviewPage() {
  return shell(
    "振り返り",
    `
      <section class="card">
        <div class="eyebrow">テストごとの結果カード</div>
        <strong>1年1学期期末</strong>
        <div class="stat-list">
          <div class="stat"><span>数学</span><span class="muted">8時間 / 目標70 / 結果72</span></div>
          <div class="stat"><span>英語</span><span class="muted">5時間 / 目標80 / 結果76</span></div>
          <div class="stat"><span>理科</span><span class="muted">3時間 / 目標65 / 結果58</span></div>
        </div>
        <div>
          <span class="tag ok">数学は達成</span>
          <span class="tag warn">理科は未達</span>
        </div>
        <div class="muted">まとめ: 数学は達成、理科は時間不足傾向。</div>
        <div class="button-row">
          <button class="button" data-route="test-create">この結果を次回に引き継ぐ</button>
          <button class="button ghost" data-route="home">ホームへ戻る</button>
        </div>
      </section>
    `,
  );
}

function render() {
  const app = document.getElementById("app");
  const routes = {
    home: homePage,
    tests: testsPage,
    records: recordsPage,
    "test-detail-active": testDetailActivePage,
    "test-create": testCreatePage,
    "target-score": targetScorePage,
    "plan-mode": planModePage,
    "daily-plan": dailyPlanPage,
    "daily-edit": () => dailyEditPage(false),
    "daily-edit-empty": () => dailyEditPage(true),
    "progress-log": progressLogPage,
    "progress-summary": progressSummaryPage,
    "result-entry": resultEntryPage,
    review: reviewPage,
  };
  app.innerHTML = (routes[state.route] || homePage)();

  app.querySelectorAll("[data-route]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.route));
  });
  app.querySelectorAll("[data-action='back']").forEach((el) => {
    el.addEventListener("click", goBack);
  });
  app.querySelectorAll("[data-action='show-finished']").forEach((el) => {
    el.addEventListener("click", () => {
      state.homeState = "finished-pending";
      state.history.push(state.route);
      state.route = "home";
      render();
    });
  });
  app.querySelectorAll("[data-action='show-empty']").forEach((el) => {
    el.addEventListener("click", () => {
      state.homeState = "empty";
      state.history.push(state.route);
      state.route = "home";
      render();
    });
  });
  app.querySelectorAll("[data-action='show-planning']").forEach((el) => {
    el.addEventListener("click", () => {
      state.homeState = "planning";
      state.history.push(state.route);
      state.route = "home";
      render();
    });
  });
}

render();

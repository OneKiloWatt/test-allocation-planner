# IMPLEMENTATION_PLAN

テスプラの実装計画。依存関係の順に並べ、各フェーズが完結したら次に進める粒度で区切っています。

## 依存関係まとめ

```
Phase 0 → Phase 1 → Phase 2 → Phase 4 → 5 → 6 → 8 → 9 → 10 → 11 → 12
Phase 3 (Phase 2と並行可)          Phase 7 (Phase 5, 6と並行可)
Phase 13 → Phase 14 → Phase 15 → 16 → 17 → 18 → 19
Phase 17 → Phase 20
```

---

## Phase 0 — プロジェクト骨格

**ゴール**: 何も壊れない状態でフォルダ構成と共通基盤を整える

1. フォルダ構成の作成
   ```
   app/
   ├── pages/           # 画面（浅くフラット）
   ├── components/
   │   ├── ui/         # shadcn/ui
   │   └── layout/     # ヘッダー・ナビ
   ├── lib/
   │   ├── schemas/    # Zod スキーマ
   │   ├── repositories/ # ストレージ抽象
   │   ├── logic/      # 配分ロジック
   │   └── utils/      # 日付・UUID など
   └── stores/         # Zustand
   ```
2. shadcn/ui 初期設定（button, input, card, form 等を追加）
3. 共通レイアウト（ヘッダー・ボトムナビ・`<Layout>` コンポーネント）
4. Tailwind テーマ設定（DESIGN.md のカラー・フォント）

### Phase 0 追加仕様: ルート分類

| 分類 | 対象 | アクセス条件 | 遷移ルール |
| --- | --- | --- | --- |
| `publicRoutes` | 認証前の入口・法務ページ | 誰でも表示可 | ログイン済みでも表示可。アプリ利用中の導線を邪魔しないため、自動リダイレクトはしない |
| `guestOnlyRoutes` | 認証開始ページ | 未ログイン時のみ表示可 | ログイン済みユーザーが開いた場合は `HOME` へ `replace` 遷移する |
| `authenticatedRoutes` | 学習管理アプリ本体 | 「ログイン済み」または「ゲスト開始済み」のアプリセッションが必要 | セッションなしで直接アクセスした場合は `TOP` へ戻す。必要に応じて `AUTH` への導線を表示する |

| 画面 | ルート分類 | 備考 |
| --- | --- | --- |
| TOP | `publicRoutes` | LP兼アプリ入口 |
| HOME | `authenticatedRoutes` | ゲスト開始後も利用可 |
| テスト作成フロー | `authenticatedRoutes` | ゲスト開始済みまたはログイン済みが前提 |
| TARGET_SCORE | `authenticatedRoutes` | 対象テストの文脈が必要 |
| DAILY_PLAN | `authenticatedRoutes` | 学習プラン生成後の主画面 |
| PROGRESS_LOG | `authenticatedRoutes` | 記録対象テストが必要 |
| RESULT_ENTRY | `authenticatedRoutes` | 対象テストの結果入力 |
| REVIEW | `authenticatedRoutes` | 対象テストの振り返り |
| AUTH | `guestOnlyRoutes` | ログイン/新規登録。ログイン済みでは開かない |
| TERMS | `publicRoutes` | 法務ページ |
| PRIVACY | `publicRoutes` | 法務ページ |

### Phase 0 追加仕様: ゲスト開始済みセッション判定

- `ゲスト開始済み` は、localStorage 上の `guestSession` 名前空間にあるセッションメタデータを判定対象とする
- 判定に使う必須項目は `sessionId` `startedAt` `expiresAt` `storageVersion` とし、4項目が揃い、形式検証を通過した場合のみ有効セッション候補として扱う
- 追加で、ゲスト保存領域に `activeExamId` または 1件以上のゲストデータがある場合は `開始済みの利用痕跡あり` とみなすが、最終的なアクセス可否は `guestSession` の妥当性を優先する
- `authenticatedRoutes` の表示前に毎回 `guestSession` を読み、必須項目欠落・型不一致・日付不正・期限切れのいずれかがあれば `未開始` と判定する
- セッションが未開始または消失している場合は保護画面を描画せず、`TOP` へ `replace` 遷移する
- 対象テストIDなど画面文脈だけが残っていて `guestSession` が消えている場合も、復元は試みず `TOP` へ戻す
- localStorage 改ざんや不正値を検出した場合は、その値を信用せず、該当する `guestSession` 名前空間を破棄して `TOP` へ戻す
- 改ざん検出は例外扱いにせず、ユーザー向けには責めない案内に留める
  - 例: `保存データを確認できなかったため、最初の画面に戻りました`
- ゲストセッションの有効期限は `startedAt` から 30日を上限とする
- 有効期限内にゲスト利用を継続した場合は、保存系操作の成功時に `expiresAt` を 30日後へローリング延長してよい
- 期限切れセッションは自動失効とし、期限超過後は `authenticatedRoutes` へ入れない
- 期限切れ時の削除方針は即時物理削除を必須にせず、少なくともアクセス判定上は無効化する。実装では起動時または遷移時に関連 localStorage を掃除してよい

### Phase 0 追加仕様: ログアウト後のキャッシュ制御

- ログアウト時は認証ユーザーに紐づくメモリ上の状態、画面キャッシュ、再利用可能な取得結果を即時破棄する
- ログアウト完了後は `TOP` へ `replace` 遷移し、ブラウザバックで直前の認証画面に戻れない遷移を基本とする
- `authenticatedRoutes` は表示前にセッション有無を毎回判定し、セッション消失後は保護画面の内容を一瞬でも再表示しない
- ゲストデータを残す仕様を採る場合でも、ログインユーザー固有データと混在させない。保存領域の名前空間を分け、ログアウトで認証領域のみ確実に破棄する

### Phase 0 追加仕様: Layout・Header バリアント

#### Layout バリアント

| Layout | 用途 | 構成 |
| --- | --- | --- |
| `marketing` | `TOP` | ファーストビュー優先。ヘッダーは最小、ボトムナビなし |
| `app` | 日常利用の主画面 | ヘッダー + コンテンツ + ボトムナビ |
| `form` | 入力集中が必要な画面 | ヘッダー + コンテンツ。ボトムナビなし |
| `legal` | 利用規約・プライバシー | 戻る導線のみ。余計なCTAを置かない |

#### Header バリアント

| Header | 用途 | 構成 |
| --- | --- | --- |
| `TopHeader` | `TOP` | ロゴのみ |
| `AppHeader` | アプリ主画面 | 画面タイトル + アカウント導線 |
| `BackHeader` | フォーム・法務 | 戻る導線を最優先。必要なら短いタイトルを併記 |

| 画面 | Layout | Header | ボトムナビ |
| --- | --- | --- | --- |
| TOP | `marketing` | `TopHeader` | 非表示 |
| HOME | `app` | `AppHeader` | 表示 |
| テスト作成フロー | `form` | `BackHeader` | 非表示 |
| TARGET_SCORE | `form` | `BackHeader` | 非表示 |
| DAILY_PLAN | `app` | `AppHeader` | 表示 |
| PROGRESS_LOG | `form` | `BackHeader` | 非表示 |
| RESULT_ENTRY | `form` | `BackHeader` | 非表示 |
| REVIEW | `app` | `AppHeader` | 表示 |
| AUTH | `form` | `BackHeader` | 非表示 |
| TERMS | `legal` | `BackHeader` | 非表示 |
| PRIVACY | `legal` | `BackHeader` | 非表示 |

#### ボトムナビの状態定義

- アクティブ状態は「現在のルートが所属する機能セクション」と一致するタブにのみ付与する
- `HOME` 表示時は `Home` タブをアクティブにする
- `DAILY_PLAN` 表示時は `Plan` タブをアクティブにする
- `REVIEW` 表示時は `Review` タブをアクティブにする
- `PROGRESS_LOG` は入力完了を優先する `form` レイアウトのためボトムナビを非表示にし、タブのアクティブ状態は持たない
- `TOP`、`AUTH`、テスト作成フロー、`TARGET_SCORE`、`RESULT_ENTRY`、`TERMS`、`PRIVACY` ではボトムナビを出さない
- 破壊的確認ダイアログやボトムシート表示中も、誤タップ防止のため underlying navigation は操作不能にする

### Phase 0 追加仕様: 未保存確認

#### 未保存確認が必要な画面

- テスト作成フロー
- TARGET_SCORE
- PLAN_MODE の入力フォーム
- PROGRESS_LOG
- RESULT_ENTRY

#### 判定条件

- 初期表示値から変更がなく、保存もしていない場合は確認を出さずに離脱してよい
- 1項目でも変更があり、最新状態が保存されていない場合は、戻る・閉じる・別ルート遷移の前に確認を出す
- 保存完了直後、または保存済みデータを再読み込みした直後は dirty 状態を解除する
- クエリ変更のみで同一画面の表示を更新する場合は、フォーム値に変更がなければ確認不要とする

#### 文言方針

- 中高生に伝わる短さを優先し、責めない・脅さない表現にする
- 例: `まだ保存していない変更があります。ページを離れますか？`
- ボタンは `このまま離れる` / `編集を続ける` のように、結果がすぐ分かる文言に統一する

---

## Phase 1 — 型 & Zod スキーマ

**ゴール**: 全エンティティの TypeScript 型と Zod スキーマを確定させ、以降のフェーズで共有できる状態にする

1. TypeScript 型定義（`Exam`, `ExamSubject`, `StudyPlan`, `DailyPlan`, `ProgressLog`, `ExamResult`, `AvailabilityRule`）
2. Zod スキーマ（DB保存用 + フォームバリデーション用）
3. UUID 生成ユーティリティ（`crypto.randomUUID` ラッパー）
4. 日付ユーティリティ（残日数計算・weekday判定など）

---

## Phase 2 — localStorage リポジトリ層

**ゴール**: ゲストモードのデータ保存が動く状態にする。Supabaseなしで全フローを動かせる土台

1. `IExamRepository` インターフェース定義（全エンティティ分）
2. `LocalStorageRepository` 実装（全エンティティ）
3. Zustand ストア（`useExamStore`）— アクティブなテスト・画面間の状態
4. リポジトリをストアに接続するフック（`useRepository`）

---

## Phase 3 — Supabase ローカルスキーマ

**ゴール**: ローカル Supabase に全テーブルを作成し、RLS まで通った状態にする

> Phase 2 と並行して進められる

1. DDL 作成（`001_create_tables.sql`）
   - 7テーブル + CHECK制約 + UNIQUE制約 + CASCADE DELETE
2. インデックス作成（`002_create_indexes.sql`）
3. RLS ポリシー（`003_rls_policies.sql`）
   - `exams`: `user_id = auth.uid()`
   - 子テーブル: `exam_id IN (SELECT ...)` パターン
   - 孫テーブル: 2段 JOIN パターン
4. RLS の動作確認（別ユーザーでアクセスできないことを手動確認）

---

## Phase 4 — TOP ページ

**ゴール**: アプリの入口が動く

1. TOP ページ（`/`）
   - 「すぐ試す」→ ゲストとして HOME へ
   - 「ログイン」→ AUTH へ（未実装なのでリンクのみ）
2. ゲスト開始時の初期化処理（localStorage を初期化してホームへ遷移）

---

## Phase 5 — テスト作成フロー

**ゴール**: 科目登録〜保存まで動く

1. TEST_CREATE ページ（`/tests/new`）
   - テスト名・期間入力
   - テスト日程の科目割り当て（`schedule_days`）
   - 科目追加/削除 UI
2. フォームバリデーション（React Hook Form + Zod）
3. localStorage への保存
4. 完了後 → TARGET_SCORE へ遷移

---

## Phase 6 — 目標点数 + 前回引き継ぎ

**ゴール**: 今回の目標点が入力できる

1. TARGET_SCORE ページ（`/tests/[examId]/targets`）
   - 科目ごとの目標点入力
   - 前回点数・前回時間の表示エリア（ゲストは「前回データなし」）
   - 引き継ぎ候補表示（localStorage の `finished` テストから `normalized_name` でマッチング）
2. `normalized_name` 生成ユーティリティ（全角→半角、小文字化など）
3. localStorage への保存

---

## Phase 7 — 配分ロジック（純粋関数）

**ゴール**: 配分計算をUIと切り離した純粋関数として実装・テスト可能にする

> Phase 5, 6 と並行して進められる

1. `ALLOCATION_LOGIC.md` に基づき計算ステップを実装
   - 利用可能時間の合計計算（`AvailabilityRule` × 期間）
   - 科目ごとの重みづけ計算（目標差分・前回実績から）
   - 比率 → 分数への変換（10分刻み丸め）
   - 日程への割り付け（`auto` 行生成）
2. ユニットテスト記述

---

## Phase 8 — プランモード選択 + 自動配分

**ゴール**: 自動モードで学習プランが生成できる

1. PLAN_MODE ページ（`/tests/[examId]/plan-mode`）
   - 自動/手動 選択
   - 自動モード: `AvailabilityRule` 入力フォーム（部活曜日・平日時間・土日時間）
   - 詳細設定（「テスト1週間前は部活なし扱い」など）
2. 自動配分計算を呼び出して `StudyPlan` + `DailyPlan` を生成
3. localStorage への保存
4. 完了後 → DAILY_PLAN へ遷移

---

## Phase 9 — 日程・学習プラン表示

**ゴール**: 生成された学習プランが確認できる

1. DAILY_PLAN ページ（`/tests/[examId]/daily-plan`）
   - 上部: 教科ごとの配分サマリー（`StudyPlan` から）
   - 下部: 日付ごとの学習プラン一覧（`DailyPlan` から）
2. 配分サマリー UI（円グラフ or 棒グラフ）
3. 手動編集は Phase 20 に先送り（この時点では閲覧のみ）

---

## Phase 10 — ホーム画面（3状態）

**ゴール**: アプリの中心画面が機能する

1. HOME ページ（`/home`）
   - **空状態**: テストなし → 「テストを作成する」CTA
   - **進行中状態**: 残日数・今日やること・進捗サマリー
   - **テスト後・結果未入力**: 「結果を入力する」CTA
2. `exam.status` の遅延評価（`end_date < 今日` なら `finished` に更新）
3. 状態分岐ロジック（`finished_pending_result > active > planning > empty`）

---

## Phase 11 — 進捗記録

**ゴール**: 学習実績が記録できる

1. PROGRESS_LOG ページ（`/tests/[examId]/progress`）
   - 科目選択
   - 勉強時間入力
   - 任意メモ
2. localStorage への追記（append-only）
3. 進捗サマリー再計算（科目別: 目標 / 累計 / 残り / 進捗率）
4. 誤入力訂正 UI（削除 + 再登録）

---

## Phase 12 — 結果入力 & 振り返り

**ゴール**: テスト後のフローが完結する

1. RESULT_ENTRY ページ（`/tests/[examId]/results`）
   - 科目ごとの実際の点数入力
   - `actual_study_minutes` は `progress_logs` 集計を初期値表示
2. REVIEW ページ（`/tests/[examId]/review`）
   - 目標点 vs 実際の点数比較
   - 計画時間 vs 実際の勉強時間比較
   - 次回引き継ぎのための表示
3. SAVE_PROMPT ポップアップ（保存系操作後にゲストへ表示）

---

## Phase 13 — 認証

**ゴール**: ログイン/新規登録が動く

1. Supabase Auth 設定（メール/パスワード）
2. AUTH ページ（`/auth/login`, `/auth/signup`）
3. セッション管理（`_app.tsx` でセッション監視）
4. ログイン状態に応じたリポジトリ切り替え（ゲスト→Supabaseへ自動切替）

---

## Phase 14 — Supabase リポジトリ層

**ゴール**: ログインユーザーのデータが Supabase に保存される

1. `SupabaseRepository` 実装（Phase 2 の同インターフェース）
2. Phase 1 で定義した `IExamRepository` を実装
3. `useRepository` フックの切り替えロジック（ゲスト/ログイン）
4. 取得・保存の動作確認

---

## Phase 15 — サーバーAPI: ホームサマリー

**ゴール**: `GET /api/home/summary` が動く

1. API Route 実装
2. Bearer token 検証
3. `finished` 補正ロジック（遅延評価）
4. 状態別レスポンス形成

---

## Phase 16 — サーバーAPI: 配分保存 & 再計算

**ゴール**: 配分の一括保存・再計算が安全に動く

1. Supabase RPC（`SECURITY INVOKER` 関数）作成
   - `save_auto_allocation`
   - `recalculate_allocation`
2. `POST /api/allocations/save-auto` 実装
3. `POST /api/allocations/recalculate` 実装
4. 楽観的ロック（`expectedVersion`）の動作確認

---

## Phase 17 — サーバーAPI: 手動プラン保存

**ゴール**: 手動で日程を組めるようになる

1. `POST /api/allocations/save-manual-day` 実装
2. Supabase RPC 作成（`save_manual_day`）
3. `manual` 行 / `auto` 行の置換ロジック
4. 警告レスポンス（`subject_over_allocated`, `daily_capacity_exceeded`）

---

## Phase 18 — ゲスト移行

**ゴール**: ゲストからログイン後にデータが引き継がれる

1. `POST /api/guest-migration` 実装（Edge Function 優先）
2. service_role での一括書き込み
3. 冪等性保証（`ON CONFLICT DO NOTHING`）
4. 移行完了後の localStorage クリア
5. エラーハンドリング（`409 Conflict`）

---

## Phase 19 — アカウント削除

**ゴール**: 退会フローが完結する

1. `POST /api/account/delete` 実装
2. ACCOUNT_MENU（ヘッダーのドロップダウン）
3. 退会確認ダイアログ
4. `auth.users` 削除 + Cascade の順序保証

---

## Phase 20 — 手動プランモード UI

**ゴール**: 手動で日程を組む画面が動く

1. DAILY_PLAN の手動編集 UI（日ごとに科目・時間を直接入力）
2. `manual` 行の再計算スキップ確認
3. `save-manual-day` API の呼び出し

---

## Phase 21 — 仕上げ

**ゴール**: リリース可能な品質にする

1. レスポンシブ対応・スマホ実機確認
2. ローディング・エラー・空状態の UI
3. TERMS, PRIVACY ページ（静的）
4. Vercel デプロイ確認（Root Directory = `app/`）

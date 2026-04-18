# docs

設計書の置き場。AIに実装を依頼する際はこのディレクトリを渡す。

## 読む順番

1. [REQUIREMENTS.md](REQUIREMENTS.md) — ユーザー像・機能要件・やらないこと
2. [SECURITY.md](SECURITY.md) — データ方針・危険な仕様の定義
3. [DESIGN.md](DESIGN.md) — UIルール・カラーパレット・コンポーネント語彙
4. [ENTITIES.md](ENTITIES.md) — データエンティティの責務分担
5. [DATA_STRUCTURES.md](DATA_STRUCTURES.md) — フィールド定義・JSON形状
6. [STATE_TRANSITIONS.md](STATE_TRANSITIONS.md) — テストの状態遷移・ホームの表示分岐
7. [ALLOCATION_LOGIC.md](ALLOCATION_LOGIC.md) — 学習時間配分の計算ロジック
8. [STACK.md](STACK.md) — 技術スタック・ホスティング
9. [PAGES/](PAGES/) — 画面別仕様（下記）

## PAGES/

| ファイル | 画面 | 概要 |
|---|---|---|
| [TOP.md](PAGES/TOP.md) | トップページ | 匿名/ログイン導線 |
| [AUTH.md](PAGES/AUTH.md) | 認証 | ログイン・新規登録 |
| [HOME.md](PAGES/HOME.md) | ホーム | 状態別メイン画面 |
| [TEST_CREATE.md](PAGES/TEST_CREATE.md) | テスト作成 | 日程・科目入力 |
| [CARRY_OVER.md](PAGES/CARRY_OVER.md) | 前回引き継ぎ | 前回データの参照 |
| [TARGET_SCORE.md](PAGES/TARGET_SCORE.md) | 目標点数入力 | 教科別目標設定 |
| [PLAN_MODE.md](PAGES/PLAN_MODE.md) | 日程/予定入力 | 自動/手動モード選択 |
| [ALLOCATION_RESULT.md](PAGES/ALLOCATION_RESULT.md) | 配分サマリー | DAILY_PLAN上部に表示 |
| [DAILY_PLAN.md](PAGES/DAILY_PLAN.md) | 日ごとの学習プラン | 日付×科目×時間 |
| [PROGRESS_LOG.md](PAGES/PROGRESS_LOG.md) | 進捗登録 | 今日やった分を記録 |
| [SAVE_PROMPT.md](PAGES/SAVE_PROMPT.md) | 保存案内 | 匿名利用時のログイン促進 |
| [REVIEW.md](PAGES/REVIEW.md) | 振り返り | テスト結果カード |
| [RESULT_ENTRY.md](PAGES/RESULT_ENTRY.md) | 結果入力 | テスト後の点数・時間記録 |
| [TIPS.md](PAGES/TIPS.md) | 豆知識 | 画面別ローテーションtips（42個） |

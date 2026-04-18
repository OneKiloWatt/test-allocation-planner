# docs

このディレクトリは、Qiita記事で整理していた `最小必要ドキュメント` の型に合わせた設計書置き場です。

構成:

```text
docs/
├── STACK.md          ← 技術スタック
```



```text
docs/
├── REQUIREMENTS.md
├── SECURITY.md
├── DESIGN.md
├── DATA_STRUCTURES.md
├── ENTITIES.md
├── STATE_TRANSITIONS.md
└── PAGES/
    ├── TOP.md
    ├── AUTH.md
    ├── HOME.md
    ├── TEST_CREATE.md
    ├── CARRY_OVER.md
    ├── TARGET_SCORE.md
    ├── ALLOCATION_RESULT.md
    ├── PLAN_MODE.md
    ├── DAILY_PLAN.md
    ├── PROGRESS_LOG.md
    ├── SAVE_PROMPT.md
    ├── REVIEW.md
    └── RESULT_ENTRY.md
```

基本方針:
- まず `REQUIREMENTS.md` を固める
- 次に `SECURITY.md` で危険な仕様を止める
- `DESIGN.md` でUIルールを揃える
- `DATA_STRUCTURES.md` で保存単位を最小化する
- `ENTITIES.md` で実装前のデータ責務を分ける
- `STATE_TRANSITIONS.md` で1テスト周期の状態変化を揃える
- 複雑な画面だけ `PAGES/` に切り出す

この企画では、`全部の画面仕様を最初から書く` より、複雑な画面だけ先に詰める方針にする。

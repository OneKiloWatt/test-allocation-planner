# docs

設計書の本体。実装やレビューに入る前の参照起点です。

## まずここから

- 全体像を素早くつかむ: [REQUIREMENTS.md](REQUIREMENTS.md)
- 画面の流れを追う: [PAGES/README.md](PAGES/README.md)
- データとロジックを見る: [ENTITIES.md](ENTITIES.md), [DATA_STRUCTURES.md](DATA_STRUCTURES.md), [ALLOCATION_LOGIC.md](ALLOCATION_LOGIC.md)

## 用途別インデックス

### 1. 方向性を決める

1. [REQUIREMENTS.md](REQUIREMENTS.md) - ユーザー像、機能要件、やらないこと
2. [SECURITY.md](SECURITY.md) - データ方針、危険な仕様の定義
3. [STACK.md](STACK.md) - 技術スタック、ホスティング方針

### 2. UIと画面を詰める

1. [DESIGN.md](DESIGN.md) - UIルール、トーン、コンポーネント語彙
2. [STATE_TRANSITIONS.md](STATE_TRANSITIONS.md) - 状態遷移とホーム表示分岐
3. [PAGES/README.md](PAGES/README.md) - 画面一覧と利用フロー

### 3. 実装に落とす

1. [ENTITIES.md](ENTITIES.md) - エンティティ責務
2. [DATA_STRUCTURES.md](DATA_STRUCTURES.md) - フィールド定義、JSON形状
3. [ALLOCATION_LOGIC.md](ALLOCATION_LOGIC.md) - 学習時間配分ロジック

## ディレクトリ構成

| パス | 内容 |
|---|---|
| [`PAGES/`](PAGES/README.md) | 画面単位の仕様 |
| [`ARCHIVE/`](ARCHIVE/README.md) | 廃止済み・参考保持の仕様 |

## 読み順の推奨

- PMや仕様整理: `REQUIREMENTS -> SECURITY -> PAGES`
- デザイナーやUI実装: `DESIGN -> STATE_TRANSITIONS -> PAGES`
- アプリ実装: `REQUIREMENTS -> ENTITIES -> DATA_STRUCTURES -> ALLOCATION_LOGIC -> PAGES`

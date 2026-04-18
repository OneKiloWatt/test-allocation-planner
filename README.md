# TestAllocationPlanner

テスト前の学習計画を作り、進捗を記録し、結果を振り返るアプリの設計リポジトリ。
主資料は [`docs/`](docs/README.md)、画面モックは [`mock/`](mock/README.md) にまとめています。

## 入口

- 仕様全体を把握する: [`docs/README.md`](docs/README.md)
- 要件から読む: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- 画面仕様を見る: [`docs/PAGES/README.md`](docs/PAGES/README.md)
- モックを確認する: [`mock/README.md`](mock/README.md)

## 現在の方針

- 製品名は `テスト配分ノート`
- メニューは `ホーム / テスト / 記録`
- `おすすめ配分` は独立画面ではなく、`日ごとの学習プラン` 上部の `配分サマリー`
- 匿名で試せるが、保存系操作の後にログイン提案を出す

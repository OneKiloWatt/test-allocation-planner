# テスト対策プランナー（テスプラ）

定期テスト前の学習時間配分計画を作り、進捗を記録し、結果を振り返るWebアプリ。

## フォルダ構成

```
test-allocation-planner/
├── app/        # Next.jsアプリ本体（Pages Router + TypeScript + Tailwind）
├── docker/     # Dockerfile.dev
├── docs/       # 仕様書・設計ドキュメント
├── mock/       # デザインモック（静的HTML）
├── compose.yml
├── docker-in.sh
└── rebuild.sh
```

## 開発環境の起動

```bash
# 初回（イメージビルド）
./rebuild.sh

# コンテナに入って作業
./docker-in.sh

# 以降は http://localhost:3000 で確認
```

> Vercelデプロイ時は Root Directory を `app/` に設定すること

## ドキュメント

- 仕様全体: [`docs/README.md`](docs/README.md)
- 要件: [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md)
- 画面仕様: [`docs/PAGES/README.md`](docs/PAGES/README.md)
- デザインモック: [`mock/README.md`](mock/README.md)

## 技術スタック

| 役割 | 採用技術 |
|---|---|
| フレームワーク | Next.js 16 (Pages Router) + TypeScript |
| スタイリング | Tailwind CSS |
| UIコンポーネント | shadcn/ui |
| 状態管理 | Zustand |
| フォーム | React Hook Form + Zod |
| バックエンド/認証 | Supabase |
| ホスティング | Vercel |

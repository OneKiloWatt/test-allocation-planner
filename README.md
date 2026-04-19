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
# app を build して app + Supabase をまとめて起動
./rebuild.sh

# コンテナに入って作業
./docker-in.sh

# 以降は http://localhost:3000 と http://localhost:54323 で確認
```

> Vercelデプロイ時は Root Directory を `app/` に設定すること

## Supabase ローカル環境

`compose.yml` に app と Supabase をまとめています。起動は `./rebuild.sh`、app コンテナに入るときは `./docker-in.sh` だけ使います。`docker/supabase/.env.local` が無ければ、`docker/supabase/.env.example` から自動作成します。

既定の `docker/supabase/.env.example` のままでもローカル起動できます。値を変えたい場合に主に触る env:

- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `ANON_KEY`
- `SERVICE_ROLE_KEY`

内部サービスの DB 接続ユーザーは既定で `SUPABASE_DB_USER=supabase_admin` です。通常は変更不要です。
ローカルでは `GOTRUE_EXTERNAL_EMAIL_ENABLED=false` を既定にしているので、メール送信なしで Auth を起動できます。

`ANON_KEY` / `SERVICE_ROLE_KEY` は `JWT_SECRET` で署名した JWT です。`JWT_SECRET` を変更する場合だけ、2 つのキーも同じ secret で再生成してください。

```bash
node -e "const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'); const s='super-secret-jwt-token-with-at-least-32-characters'; const b=(r)=>Buffer.from(JSON.stringify(r)).toString('base64url'); const c=require('crypto'); const sign=(r)=>{const p=`${h}.${b(r)}`; const sig=c.createHmac('sha256',s).update(p).digest('base64url'); return `${p}.${sig}`}; console.log('ANON_KEY=' + sign({role:'anon',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10})); console.log('SERVICE_ROLE_KEY=' + sign({role:'service_role',iss:'supabase',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*365*10}));"
```

`docker/supabase/.env.example` にも同じ生成例を入れています。

### ポート

- `54321`: Supabase API Gateway (`kong`)
- `54322`: PostgreSQL
- `54323`: Supabase Studio
- app は既存どおり `3000`

### データ永続化

- PostgreSQL は `supabase-db-data` volume に永続化
- Storage API は `supabase-storage-data` volume に永続化
- `node_modules` は Docker volume に分けています。`./app` を bind mount しているので、これを外すとコンテナ内依存が mount に隠れます
- 初回起動時に `docker/supabase/init/` の SQL が流れます
- 完全に初期化したい場合は `docker compose ... down -v` を使う

### 併用メモ

- app と Supabase は常に同じ `compose.yml` から起動します
- ブラウザやホストマシンからは `localhost:3000`, `localhost:54321`, `localhost:54323` でアクセスできます
- `./rebuild.sh` は compose の healthcheck 完了まで待ってから終了します

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

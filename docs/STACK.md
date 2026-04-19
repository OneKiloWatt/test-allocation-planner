# STACK

## 技術スタック

| 役割 | 採用技術 |
|---|---|
| フレームワーク | Next.js (Pages Router) + TypeScript |
| スタイリング | Tailwind CSS |
| UIコンポーネント | shadcn/ui |
| 状態管理 | Zustand |
| フォーム | React Hook Form + Zod |
| バックエンド/認証 | Supabase |
| ホスティング | Vercel |

## Pages Router を選ぶ理由
- このアプリはlocalStorage・Zustand・フォーム操作がメイン
- App RouterのサーバーコンポーネントのメリットをMVPで活かす場面が少ない
- AIが実装する場合、`"use client"` 境界のミスが出にくい

## Supabaseの使い方
- 匿名ユーザー: localStorageで保持
- ログインユーザー: Supabaseに同期
- スキーマはMVP完了まで最小限に保つ
- MVPでも責務ごとにテーブルを分ける
- 基本テーブルは `exams` `exam_subjects` `study_plans` `daily_plans` `progress_logs` `exam_results` `availability_rules`
- `progress_logs` は追記型で別管理する
- `schedule_days` のような補助的で独立検索しない情報だけ JSON 保持を許可する
- `version` と `migration` を持ち、version不一致時は黙って上書きしない
- 保存形式は repository層で隠蔽し、保存前後は Zod で検証する

## フォルダ構成の方針
- `app/` や `pages/` は浅くフラットに保つ
- 複雑なロジックは `components/` と `lib/` に集める
- AI実装のドリフト（ズレの蓄積）を防ぐため、深いネストを避ける

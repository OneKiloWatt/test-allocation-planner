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

## Pages Router を選ぶ理由
- このアプリはlocalStorage・Zustand・フォーム操作がメイン
- App RouterのサーバーコンポーネントのメリットをMVPで活かす場面が少ない
- AIが実装する場合、`"use client"` 境界のミスが出にくい

## Supabaseの使い方
- 匿名ユーザー: localStorageで保持
- ログインユーザー: Supabaseに同期
- スキーマはMVP完了まで最小限に保つ
- 最初のテーブルは `exams` と `progress_logs` の2つだけ

## フォルダ構成の方針
- `app/` や `pages/` は浅くフラットに保つ
- 複雑なロジックは `components/` と `lib/` に集める
- AI実装のドリフト（ズレの蓄積）を防ぐため、深いネストを避ける

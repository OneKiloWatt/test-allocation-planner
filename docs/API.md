# API

## 目的
- MVPで必要な API 境界を明確にする
- `Supabase へ直接アクセスする処理` と `Next.js API Route / Supabase Edge Function を使う処理` を分ける
- 実装者が request / response / 認可方式 / 失敗時挙動を迷わないようにする

## 前提
- フロントエンドは Next.js Pages Router
- ログインユーザーの保存先は Supabase
- ゲストユーザーの保存先は `localStorage`
- MVPでは、**単一テーブル中心の単純 CRUD** は Supabase 直接アクセスを基本とする
- **複数テーブルの整合性をまとめて扱う処理**、**状態遷移を伴う処理**、**複数条件の検証を1か所で閉じたい処理**、**Service Role が必要な処理** は server API に寄せる

## API の分類

### 1. Supabase 直接アクセスで扱うもの
- `exams`
- `exam_subjects`
- `study_plans`
- `daily_plans`
- `progress_logs`
- `exam_results`
- `availability_rules`

用途:
- テスト作成
- 目標点数更新
- 進捗記録
- 結果入力

前提:
- 全テーブルで RLS を有効化する
- クライアントは本人データのみ read / write できる
- writable な全テーブルで `SELECT / INSERT / UPDATE / DELETE` を個別に確認する
- `USING` だけでなく `WITH CHECK` を明示し、本人所有データ以外を書き込めないことを保証する
- 入出力は repository 層で Zod 検証する
- `daily_plans` と `progress_logs` の `exam_id` / `exam_subject_id` 整合はアプリ層で必ず検証する

### 2. サーバー API で扱うもの
- アカウント削除
- ゲストデータのログイン移行
- 自動配分保存
- 手動プラン保存
- 自動配分の再計算
- 状態補正を伴うホーム取得

理由:
- `service_role` 権限が必要な処理がある
- 複数テーブルをまたぐ一括処理で失敗時制御が必要
- クライアントから直接持たせたくない権限を使う処理がある
- `planning -> active` など、複数条件で決まる状態遷移を1か所で扱いたい
- `manual/auto` の整合や警告判定を server 側で統一したい

## 認証・認可

### 認証方式
- ログインユーザー:
  - Supabase Auth のセッション/JWTを使う
- ゲストユーザー:
  - サーバー API の認証対象ではない
  - 基本は `localStorage` のみで完結する

### 認可方式
- 通常 CRUD:
  - Supabase RLS で `auth.uid()` を基準に制御する
- サーバー API:
  - リクエストの Bearer token からユーザーを検証する
  - サーバー側で `auth.uid()` 相当の本人確認を行う
  - リクエスト本文から受けた `user_id` は信頼しない

### CSRF 方針
- サーバー API は Bearer token 前提に寄せ、Cookie セッション前提の API は MVP では採用しない
- これにより、破壊的 API で Cookie ベースの CSRF 対策が必須になる構成を避ける
- 将来 Cookie ベース運用を採る場合は、別途 `SameSite`、CSRF token、`Origin/Referer` 検証を要件化する

## エラーレスポンスの方針
- バリデーションエラー: `400`
- 未認証: `401`
- 権限不足: `403`
- 対象なし: `404`
- 競合: `409`
- 想定外障害: `500`

共通レスポンス例:

```json
{
  "error": {
    "code": "version_conflict",
    "message": "他の操作が先に保存されました。最新の内容を読み直してください。"
  }
}
```

## バージョン競合
- `exams.version` を楽観的ロックに使う
- 配分保存、再計算、状態遷移を伴う一括更新時は `expectedVersion` を受け取る
- 更新条件に `WHERE id = ? AND version = ?` を含める
- 0件更新なら `409 Conflict` を返す

## 一括更新の実装方式
- `save-auto` / `save-manual-day` / `recalculate` は、**user context のまま一括更新できる DB 関数**で実装する
- MVP 推奨:
  - `SECURITY INVOKER` の Postgres function を作成し、Supabase RPC 経由で呼ぶ
- ねらい:
  - RLS を維持したまま
  - 複数テーブル更新を1トランザクションで実行し
  - `expectedVersion` を使った競合制御を1か所で扱う
- `service_role` はこれらの API では使わない
- `service_role` を使うのは、MVPでは `guest-migration` と `account/delete` のみ

## API 一覧

### A. クライアント -> Supabase 直接 CRUD

HTTP の独自 endpoint は作らず、Supabase client からテーブル操作する。

#### 1. テスト作成
- 対象:
  - `exams`
  - `exam_subjects`
- 使う画面:
  - `TEST_CREATE`
- 主な処理:
  - `exams` を1件作成
  - 同時に `exam_subjects` を複数作成
- 備考:
  - `status` 初期値は `planning`
  - `version` 初期値は `1`
  - MVPでは `exams` 作成後に `exam_subjects` 作成が失敗し、不完全な `planning` exam が残ることは許容する
  - この状態は `draft` 的に再編集で回復可能とする
  - `active` への昇格は client 直 CRUD では行わない

#### 2. 目標点数更新
- 対象:
  - `exam_subjects`
- 使う画面:
  - `TARGET_SCORE`
- 主な処理:
  - 科目ごとの `target_score` を更新
  - 参照表示として選ばれた前回値を current exam の `previous_score` / `previous_study_minutes` に確定保存する
- 備考:
  - `TARGET_SCORE` 保存は `target_score` と `previous_*` の確定を1契約として扱う
  - current exam 側にはスナップショットだけを保存し、参照元リンクまでは MVP で持たない

#### 3. 進捗記録
- 対象:
  - `progress_logs`
- 使う画面:
  - `PROGRESS_LOG`
- 主な処理:
  - 1件追記
- 備考:
  - 更新ではなく append-only
  - 訂正は削除 + 再登録
  - 保存後は `study_plans` 集計と突き合わせて、科目別サマリーを再取得する
  - 返すべき表示値は `目標時間 / 累計実績時間 / 残り時間 / 進捗率`

#### 4. 結果入力
- 対象:
  - `exam_results`
- 使う画面:
  - `RESULT_ENTRY`
- 主な処理:
  - 科目ごとの結果を upsert
- 備考:
  - `actual_study_minutes` は初回表示時に `progress_logs` 集計を初期値として使う
  - 保存後はスナップショットとして扱い、再集計で上書きしない

#### 5. テスト作成前後の引き継ぎ参照取得
- 対象:
  - `exams`
  - `exam_subjects`
  - `exam_results`
- 使う画面:
  - `TARGET_SCORE`
- 主な処理:
  - 直近の `finished` テスト候補を取得
  - `normalized_name` に基づく同名科目候補を組み立てる
  - 前回点数と前回勉強時間の参照表示データを返す
- 備考:
  - 同名科目だけ自動候補
  - 非同名は参考候補として別 UI で選ばせる

#### 6. ホーム・一覧表示取得
- 対象:
  - `exams`
  - `exam_subjects`
  - `study_plans`
  - `daily_plans`
  - `progress_logs`
  - `exam_results`
- 使う画面:
  - `HOME`
  - テスト一覧
  - `DAILY_PLAN`
  - `REVIEW`
- 主な処理:
  - 主状態判定に必要なテスト群取得
  - 今日のプラン取得
  - 進捗サマリー取得
  - 結果入力済み判定
- 備考:
  - `finished` 判定は server API 側で補正する方針とし、単なる client read にしない
  - ホームは `finished（結果未入力） > active > planning > 空状態` の優先順位で主状態を返す

### B. サーバー API

## 1. `POST /api/account/delete`

### 目的
- ログインユーザーのアカウント削除を安全に実行する

### 実装候補
- Next.js API Route
- Bearer token を受けて Supabase Admin API を呼べる server runtime

### 認証方式
- `Authorization: Bearer <access_token>`
- token から本人 uid を検証する
- Cookie ベース認証は MVP では採用しない

### 認証
- 必須
- Bearer token から本人確認する

### リクエスト

```json
{
  "reauthProof": "string",
  "reason": "string | null"
}
```

### フィールド説明
- `reauthProof`
  - 再認証済みであることを示す情報
  - 実際の形式は採用する認証方式に依存
- `reason`
  - 任意
  - 退会理由アンケート

### 正常レスポンス

```json
{
  "ok": true
}
```

### 処理内容
1. セッションから本人確認
2. 再認証状態を検証
3. DB 側で root 削除を実行
4. `auth.users` を削除
5. 全セッション失効

### DB 削除方針
- 学習データは `exams.user_id` を起点に削除する
- 子テーブルの削除は `ON DELETE CASCADE` を正とする
- API 実装で全表を手動 delete しない
- `auth.users` 削除だけは DB 削除完了後に行う

### エラー
- `401`
  - 未認証
- `403`
  - 再認証不足
- `500`
  - 一部削除失敗

### 備考
- `auth.users` を先に消さない
- DB 削除と `auth.users` 削除のどちらで失敗したかをログに残す
- DB 削除成功後に `auth.users` 削除だけ失敗した場合は、再試行可能な状態として扱う
- `reauthProof` は直近短時間のみ有効とする前提で、具体形式は別途確定する

## 2. `POST /api/guest-migration`

### 目的
- ゲスト利用中の `localStorage` データを、ログイン後に Supabase へ移行する

### 実装候補
- Supabase Edge Function を優先

### 認証
- 必須
- セッション/JWT からログイン中ユーザー本人を確認する

### リクエスト

```json
{
  "migrationVersion": 1,
  "payload": {
    "exams": [],
    "examSubjects": [],
    "studyPlans": [],
    "dailyPlans": [],
    "progressLogs": [],
    "examResults": [],
    "availabilityRules": []
  }
}
```

### フィールド説明
- `migrationVersion`
  - クライアント送信形式の版
- `payload`
  - ゲスト保存済みデータ一式
- 注意:
  - `user_id` はクライアント入力値を信頼しない
  - サーバー側で現在ログイン中の uid を付与する
  - root の `exam` 単位で allowlist 化し、payload 外参照を受け入れない

### 正常レスポンス

```json
{
  "ok": true,
  "imported": {
    "exams": 1,
    "examSubjects": 5,
    "studyPlans": 5,
    "dailyPlans": 18,
    "progressLogs": 3,
    "examResults": 0,
    "availabilityRules": 1
  }
}
```

### 処理内容
1. JWT から uid を取得
2. payload を Zod で検証
3. payload 内の `exam_id` / `exam_subject_id` の参照関係を検証
4. 既存データとの ID 衝突を検証する
5. 採用する ID 戦略に従って書き込み用 ID を確定する
6. uid を付与して書き込み
7. 再送時は同一 import 単位で冪等に扱う

### エラー
- `400`
  - payload 不正
- `401`
  - 未認証
- `409`
  - 参照整合性エラー
- `500`
  - 移行処理失敗

### 備考
- `service_role` は RLS を迂回するため、ownership/conflict 検証を必須にする
- 再送可能にする
- 同じ payload が重複送信されても壊れないことを優先する
- **MVP 推奨方針**:
  - ゲスト保存時点で全テーブルに client-generated UUID を持たせる
  - import はそれらの ID をそのまま使う
  - 既存 ID が他ユーザー所有物と衝突した場合は `409` を返す
  - `ON CONFLICT DO NOTHING` は「同一 import の完全再送」にだけ使う

## 3. `POST /api/allocations/save-auto`

### 目的
- 自動配分の保存を、整合性を保った一括処理として実行する

### 認証方式
- `Authorization: Bearer <access_token>`

### 実行コンテキスト
- `service_role` は使わない
- Bearer token から解決した本人の user context で実行する
- server API に寄せる理由は、RLS 迂回ではなく一括整合性と競合制御のため
- 実装は `SECURITY INVOKER` RPC を前提とする

### リクエスト

```json
{
  "examId": "uuid",
  "expectedVersion": 3,
  "availabilityRules": {},
  "studyPlans": [],
  "dailyPlans": []
}
```

### 処理内容
1. `examId` の所有権確認
2. `expectedVersion` の競合確認
3. `availability_rules` を upsert
4. `study_plans` を置き換え
5. `daily_plans` のうち `auto` 行を置き換え
6. `manual` 行を保持
7. `planning -> active` 条件を満たすか確認
8. `exams.status` と `version` を更新

### `planning -> active` 判定
- 目標点数入力済み
- `planning_mode` が確定済み
- 自動モードなら `availability_rules` が保存済み
- `daily_plans` が最低1件以上ある

### 正常レスポンス

```json
{
  "ok": true,
  "exam": {
    "id": "uuid",
    "status": "active",
    "version": 4
  }
}
```

### エラー
- `401`
  - 未認証
- `403`
  - 他人の exam
- `409`
  - version 競合
- `500`
  - 一括保存失敗

## 4. `POST /api/allocations/save-manual-day`

### 目的
- 1日単位で manual 行を保存し、その日の確定状態を server 側で決める

### 認証方式
- `Authorization: Bearer <access_token>`

### 実行コンテキスト
- `service_role` は使わない
- Bearer token から解決した本人の user context で実行する
- 実装は `SECURITY INVOKER` RPC を前提とする

### リクエスト

```json
{
  "examId": "uuid",
  "date": "2026-06-10",
  "expectedVersion": 3,
  "manualRows": [
    {
      "examSubjectId": "uuid-a",
      "plannedMinutes": 45
    },
    {
      "examSubjectId": "uuid-b",
      "plannedMinutes": 30
    }
  ]
}
```

### 契約
- payload は**その日付の manual 行の最終 desired state**を表す
- server 側は**その日付の既存 manual 行のみ**を全置換する
- `auto` 行はこの API では直接再配分しない
- ただし `(exam_id, exam_subject_id, date)` の UNIQUE 制約に抵触する同日同科目の `auto` 行がある場合は、その行を削除して `manual` 行で置き換える
- `source` は client から受け取らず、server 側で常に `manual` を設定する
- `manualRows = []` は「その日の manual 行をすべて削除する」を意味する
- `manual` 行を削除しても **元の `auto` 行は即復元しない**
- `auto` 行の再生成は `recalculate` または `save-auto` の責務とする

### 処理内容
1. `examId` の所有権確認
2. `expectedVersion` の競合確認
3. `examSubjectId` がすべて同じ `examId` 配下に属することを確認
4. 対象日の既存 `manual` 行を削除
5. 競合する対象日の `auto` 行を必要に応じて削除
6. `manualRows` を `source=manual` で挿入
7. exam 全体を見て `planning -> active` 条件を再判定
8. 警告を組み立てる
9. `exams.status` と `version` を更新

### `planning -> active` 判定
- 目標点数入力済み
- 日程/予定入力済み（MVP では `planning_mode` が確定済みであることをもって判定する）
- 日ごとの学習プランが最低1件以上ある
- 自動モードなら `availability_rules` が保存済み

### 警告と保存拒否
- `blockingErrors`
  - 未認証
  - 他人の `exam`
  - `examSubjectId` の所属不整合
  - version 競合
- `warnings`
  - `subject_over_allocated`
  - `daily_capacity_exceeded`
- `daily_capacity_exceeded` は `availability_rules` が存在する場合のみ返す
- 警告は保存成功と両立する

### 正常レスポンス

```json
{
  "ok": true,
  "exam": {
    "id": "uuid",
    "status": "active",
    "version": 4
  },
  "dayPlans": [
    {
      "date": "2026-06-10",
      "examSubjectId": "uuid-a",
      "subjectName": "数学",
      "plannedMinutes": 45,
      "source": "manual",
      "displayOrder": 1
    }
  ],
  "warnings": [
    {
      "code": "subject_over_allocated",
      "message": "数学の手動入力が必要総時間を超えています。"
    }
  ]
}
```

## 5. `POST /api/allocations/recalculate`

### 目的
- 既存の自動配分を再計算し、`manual` 行を保持したまま `auto` 行だけ再生成する

### 認証方式
- `Authorization: Bearer <access_token>`

### リクエスト

```json
{
  "examId": "uuid",
  "expectedVersion": 3
}
```

### 処理内容
- `availability_rules`, `exam_subjects`, `progress_logs`, `daily_plans` をもとに再計算
- `manual` 行を保持しつつ `auto` 行のみ再生成
- `expectedVersion` による競合検知

### 正常レスポンス

```json
{
  "ok": true,
  "exam": {
    "id": "uuid",
    "status": "active",
    "version": 4
  },
  "studyPlans": [],
  "dailyPlans": [],
  "warnings": []
}
```

## 6. `GET /api/home/summary`

### 目的
- ホーム画面が必要とする主状態と表示データを1回で返す

### 認証方式
- `Authorization: Bearer <access_token>`

### 処理内容
1. 本人の `planning / active / finished` テストを取得
2. `end_date < 今日` のテストは `finished` へ補正する
3. `finished` かつ結果未入力テストを最優先で選ぶ
4. 次に `active`
5. 次に `planning`
6. なければ空状態

### レスポンス型

```ts
type HomeSummaryResponse =
  | {
      state: "empty";
      headline: string;
      cta: { label: string; href: string };
    }
  | {
      state: "planning";
      examId: string;
      headline: string;
      nextAction: { label: string; href: string };
    }
  | {
      state: "active";
      examId: string;
      headline: string;
      daysUntilExam: number;
      todayPlans: Array<{
        examSubjectId: string;
        subjectName: string;
        plannedMinutes: number;
        source: "auto" | "manual";
      }>;
      progressSummary: Array<{
        examSubjectId: string;
        subjectName: string;
        plannedMinutes: number;
        loggedMinutes: number;
        remainingMinutes: number;
        progressRatio: number;
      }>;
    }
  | {
      state: "finished_pending_result";
      examId: string;
      headline: string;
      resultEntryCta: { label: string; href: string };
    };
```

### 状態判定
- `finished_pending_result`
  - `status = finished` かつ、対応する `exam_subjects` 全件分の `exam_results` が揃っていない
- `active`
  - `status = active`
- `planning`
  - `status = planning`
- `empty`
  - 表示対象の exam がない
- 不完全な `planning`
  - `exam_subjects` が 0 件の `planning` exam も、MVP では `planning` として扱う
  - 再編集で回復可能な draft 状態として扱う

## データ取得パターン

### ホーム表示
- 取得対象:
  - 主状態候補のテスト群
  - 当日 `daily_plans`
  - 科目別の `study_plans`
  - `progress_logs` 集計
  - `exam_results` の有無
 - 実装方針:
  - `GET /api/home/summary` を正とする
  - 単純なテーブル read を画面ごとに分散させない

### テスト詳細表示
- 取得対象:
  - `exams`
  - `exam_subjects`
  - `study_plans`
  - `daily_plans`
  - `availability_rules`

### 結果入力画面
- 取得対象:
  - `exam_subjects`
  - 科目別 `progress_logs` 集計
  - 既存 `exam_results`

## 非 API 領域
- ゲスト利用中の保存
  - `localStorage` のみ
- 端末内データ削除
  - クライアントのみで完結
- 匿名利用ポップアップ制御
  - クライアント状態で完結

## 実装メモ
- repository 層で DB 形と UI 形を分離する
- Zod schema は API 入出力と画面フォームで使い回せる粒度に分ける
- MVP ではアプリ独自の `users` テーブルを持たない
- 所有者識別は `exams.user_id = auth.users.id` を前提にする
- `progress_logs` は append-only 前提のため update API を作らない
- RLS テストは全テーブルで `SELECT / INSERT / UPDATE / DELETE` を確認する
- writable table は `USING` と `WITH CHECK` の両方をレビュー対象にする
- `save-auto` と `recalculate` は server API を正とし、client 直 CRUD に戻さない
- `save-manual-day` も server API を正とし、client 直 CRUD に戻さない
- 高コスト API にはレート制限、監査ログ、再試行方針を実装時に追加する

## 未確定事項
- 再認証情報 `reauthProof` の具体形式

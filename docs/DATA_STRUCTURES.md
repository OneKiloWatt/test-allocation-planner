# DATA_STRUCTURES

## 方針
- 保存単位は `テスト` を中心にする
- 日次の細かすぎる行動ログはMVPでは持たない
- 次回提案に必要な最小構造だけを持つ
- MVPの保存モデルは `exams` 集約 + `progress_logs` 別とする

## DB可視化

### MVPの保存モデル

```mermaid
erDiagram
    USERS ||--o{ EXAMS : owns
    USERS ||--o{ PROGRESS_LOGS : records
    EXAMS ||--o{ PROGRESS_LOGS : has

    USERS {
        uuid id PK
        string email
    }

    EXAMS {
        uuid id PK
        uuid user_id FK
        int version
        string name
        string term_type
        date start_date
        date end_date
        string status
        string planning_mode
        jsonb schedule_days
        jsonb subjects
        jsonb study_plans
        jsonb daily_plans
        jsonb exam_results
        jsonb availability_rule
        timestamptz created_at
        timestamptz updated_at
    }

    PROGRESS_LOGS {
        uuid id PK
        uuid user_id FK
        uuid test_id FK
        string subject_id
        int logged_minutes
        string memo
        timestamptz logged_at
        timestamptz created_at
    }
```

### 集約の中身

`exams` は 1テスト = 1レコード を基本にして、画面で一緒に使う構造を JSON で集約して持つ。

```mermaid
flowchart TD
    EXAM["exams 1行<br/>1つのテスト"] --> SCHEDULE["schedule_days[]<br/>いつ勉強できるか"]
    EXAM --> SUBJECTS["subjects[]<br/>各教科の前回点・目標点"]
    EXAM --> STUDY["study_plans[]<br/>教科ごとの総勉強時間"]
    EXAM --> DAILY["daily_plans[]<br/>日ごとの学習プラン"]
    EXAM --> RESULT["exam_results[]<br/>テスト後の結果"]
    EXAM --> AVAIL["availability_rule<br/>生活パターン"]
```

### ねらい

- `exams`
  - テスト作成から結果入力までの主データをまとめて保存する
- `progress_logs`
  - 実績は追記型で別保存する
- 導出値
  - `logged_minutes` の累計
  - `remaining_minutes`
  - 進捗率
  は保存せず、`progress_logs` 集計で出す

### 将来の正規化候補

MVP後に検索性・集計性・更新競合が問題になったら、次を独立テーブル化する余地がある。

- `exam_subjects`
- `study_plans`
- `daily_plans`
- `exam_results`

## Test
- id
- version
- name
- term_type
  - 中間 / 期末 / その他
- start_date
- end_date
- schedule_days[]
- status
  - planning / active / finished / archived
- planning_mode
  - auto / manual
- subjects[]
- study_plans[]
- daily_plans[]
- exam_results[]
- availability_rule

## ScheduleDay
- date
- subjects[]

## Subject
- subject_id
- subject_name
- normalized_name
- previous_score
- previous_study_minutes
- target_score

## StudyPlan
- subject_id
- recommended_minutes
- recommended_ratio
- reason

## UserAvailability
- weekday_club_minutes
- weekday_no_club_minutes
- weekend_minutes
- club_days[]
- study_start_date
- pre_exam_rest_mode
  - true / false

## ProgressLog
- id
- test_id
- subject_id
- logged_minutes
- memo
- logged_at

## DailyPlan
- plan_row_id
- date
- subject_id
- planned_minutes
- source
  - auto / manual

## ExamResult
- subject_id
- actual_score
- actual_study_minutes
- note

## Migration
- from_version
- to_version
- migrated_at

## SpecialCase（MVPでは未実装）
- date
- override_minutes
- override_mode
  - none / less / more / no_club
- memo

## 計算に使う入力
- 前回点数
- 前回勉強時間
- 今回目標点数
- 利用可能時間
- 勉強開始日
- テスト日程
- 進捗登録済み時間
- 部活日

## 計算に使わないもの
- 他人の点数
- 偏差値
- 学校順位
- 性格推定値

## 補足
- `logged_minutes` と `remaining_minutes` は保存値として持たず、`progress_logs` 集計から導出する
- `subject_id` は表示名変更後も不変とする
- 同一 `test` 内で科目重複を禁止する
- `manual` 行の追加は既存 `subject_id` に対してのみ許可する
- `manual` 行は再計算で上書きしない
- 後で複雑化しやすいのは `単元`, `日次ログ`, `通知`, `外部カレンダー連携`
- MVPでは持たない

# ENTITIES

## 目的
- このアプリで扱うデータを、実装前に整理する
- 画面ごとの見え方ではなく、`中で何を持つか` を分ける

## なぜ必要か
この企画では、少なくとも次の4種類の情報がある。

- テストそのもの
- 日ごとの学習プラン
- 勉強した実績
- テスト結果

これを分けないと、`ホームの進捗`、`テスト詳細`、`記録画面`、`結果カード` が同じデータを別の意味で使い始めて崩れやすい。

## 1. Exam
意味:
- 1回の中間/期末テストそのもの

持つもの:
- id
- name
  - 例: `2学期中間`
- term_type
  - 中間 / 期末 / その他
- start_date
- end_date
- status
  - planning / active / finished
- subjects
- schedule_days

使う画面:
- テスト一覧
- 進行中テスト詳細
- ホーム上部の `あと何日`

## 2. ExamSubject
意味:
- そのテストに含まれる各教科

持つもの:
- exam_id
- subject_id
- subject_name
- previous_score
- previous_study_minutes
- target_score

使う画面:
- 前回引き継ぎ
- 目標点数入力
- 結果カード

## 3. StudyPlan
意味:
- 今回テストに向けた、教科ごとの目安時間

持つもの:
- exam_id
- subject_id
- planned_minutes
- planned_ratio
- reason
  - 例: `前回未達で目標差分が大きい`

使う画面:
- 日ごとの学習プラン上部の配分サマリー
- テスト詳細

## 4. DailyPlan
意味:
- 日付ごとに何の科目をどのくらいやるか

持つもの:
- exam_id
- plan_row_id
- date
- subject_id
- planned_minutes
- source
  - auto / manual

使う画面:
- 日ごとの学習プラン
- ホームの `今日やること`

## 5. ProgressLog
意味:
- 実際に今日どれだけ勉強したか

持つもの:
- exam_id
- date
- subject_id
- logged_minutes
- memo

使う画面:
- 記録
- ホームの進捗サマリー
- テスト詳細

## 6. ExamResult
意味:
- テスト終了後の結果

持つもの:
- exam_id
- subject_id
- actual_score
- actual_study_minutes
- note

使う画面:
- 結果入力
- 結果カード
- 振り返り

## 7. AvailabilityRule
意味:
- 自動モードで日程を組むための生活パターン

持つもの:
- exam_id
- weekday_club_minutes
- weekday_no_club_minutes
- weekend_minutes
- club_days
- study_start_date
- pre_exam_rest_mode

使う画面:
- 日程/予定入力

## 8. SpecialCase（MVPでは未実装）
意味:
- 週の型で表せない例外日

持つもの:
- exam_id
- date
- override_mode
  - none / less / more / no_club
- override_minutes
- memo

使う画面:
- 日程/予定入力

## 9. 画面との対応
### ホーム
- Exam
- DailyPlan
- ProgressLog

### テスト一覧 / テスト詳細
- Exam
- StudyPlan
- DailyPlan
- ProgressLog
- ExamResult

### 記録
- ProgressLog
- StudyPlan

### 結果入力 / 結果カード
- ExamSubject
- ExamResult

## 10. 実装で特に大事な分離
- `StudyPlan`
  - 教科ごとの総量
- `DailyPlan`
  - 日ごとの割り当て
- `ProgressLog`
  - 実際にやった記録
- `ExamResult`
  - テスト後の結果

この4つは似て見えるが役割が違う。  
ここを混ぜないことが重要。

## 11. MVPで削れるもの
- `SpecialCase` の複雑なパターン
- `DailyPlan` の過度な手動上書き
- 高度な分析用の集計専用データ

## 12. MVPの最低ライン
最低限必要なのは次。

- Exam
- ExamSubject
- StudyPlan
- DailyPlan
- ProgressLog
- ExamResult

これがあれば、今の画面はだいたい成立する。

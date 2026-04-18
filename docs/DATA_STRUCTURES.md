# DATA_STRUCTURES

## 方針
- 保存単位は `テスト` を中心にする
- 日次の細かい勉強ログはMVPでは持たない
- 次回提案に必要な最小構造だけを持つ

## Test
- id
- name
- term_type
  - 中間 / 期末 / その他
- start_date
- end_date
- subjects[]
- schedule_days[]
- status
  - planning / active / finished / archived
- planning_mode
  - auto / manual

## ScheduleDay
- date
- subjects[]

## SubjectPlan
- subject_name
- previous_score
- previous_study_minutes
- target_score
- recommended_minutes
- recommended_ratio
- logged_minutes
- remaining_minutes
- actual_score
- actual_study_minutes

## UserAvailability
- weekday_club_minutes
- weekday_no_club_minutes
- saturday_minutes
- sunday_minutes
- club_days[]
- pre_exam_rest_mode
  - true / false
- blocked_dates[]

## ProgressLog
- id
- test_id
- subject_name
- logged_minutes
- memo
- logged_at

## BlockedDate
- date
- reason
  - 部活 / 習い事 / 休み / その他

## SpecialCase
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
- テスト日程
- 進捗登録済み時間
- 部活日
- 特殊ケース

## 計算に使わないもの
- 他人の点数
- 偏差値
- 学校順位
- 性格推定値

## 補足
- 後で複雑化しやすいのは `単元`, `日次ログ`, `通知`, `外部カレンダー連携`
- MVPでは持たない

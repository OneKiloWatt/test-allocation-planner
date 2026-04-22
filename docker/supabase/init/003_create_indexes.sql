CREATE INDEX IF NOT EXISTS exams_user_id_idx
    ON public.exams (user_id);

CREATE INDEX IF NOT EXISTS exams_user_id_status_idx
    ON public.exams (user_id, status);

CREATE INDEX IF NOT EXISTS exam_subjects_exam_id_idx
    ON public.exam_subjects (exam_id);

CREATE INDEX IF NOT EXISTS daily_plans_exam_id_date_idx
    ON public.daily_plans (exam_id, date);

CREATE INDEX IF NOT EXISTS progress_logs_exam_id_logged_date_idx
    ON public.progress_logs (exam_id, logged_date);

CREATE INDEX IF NOT EXISTS progress_logs_exam_subject_id_idx
    ON public.progress_logs (exam_subject_id);

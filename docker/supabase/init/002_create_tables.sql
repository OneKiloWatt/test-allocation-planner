CREATE TABLE IF NOT EXISTS public.exams (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL,
    version integer NOT NULL DEFAULT 1,
    name text NOT NULL,
    term_type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text NOT NULL,
    planning_mode text NOT NULL,
    schedule_days jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exams_end_date_check CHECK (end_date >= start_date),
    CONSTRAINT exams_status_check CHECK (status IN ('planning', 'active', 'finished')),
    CONSTRAINT exams_planning_mode_check CHECK (planning_mode IN ('auto', 'manual'))
);

CREATE TABLE IF NOT EXISTS public.exam_subjects (
    id uuid PRIMARY KEY,
    exam_id uuid NOT NULL,
    subject_id text NOT NULL,
    subject_name text NOT NULL,
    normalized_name text NOT NULL,
    previous_score integer,
    previous_study_minutes integer,
    target_score integer NOT NULL,
    display_order integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exam_subjects_exam_id_fkey
        FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE,
    CONSTRAINT exam_subjects_exam_id_subject_id_key UNIQUE (exam_id, subject_id),
    CONSTRAINT exam_subjects_target_score_check CHECK (target_score BETWEEN 0 AND 100),
    CONSTRAINT exam_subjects_previous_score_check CHECK (previous_score BETWEEN 0 AND 100),
    CONSTRAINT exam_subjects_previous_study_minutes_check CHECK (previous_study_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS public.study_plans (
    id uuid PRIMARY KEY,
    exam_subject_id uuid NOT NULL,
    planned_minutes integer NOT NULL,
    planned_ratio numeric(5,4) NOT NULL,
    reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT study_plans_exam_subject_id_fkey
        FOREIGN KEY (exam_subject_id) REFERENCES public.exam_subjects (id) ON DELETE CASCADE,
    CONSTRAINT study_plans_exam_subject_id_key UNIQUE (exam_subject_id),
    CONSTRAINT study_plans_planned_minutes_check CHECK (planned_minutes >= 10),
    CONSTRAINT study_plans_planned_ratio_check CHECK (planned_ratio BETWEEN 0 AND 1)
);

CREATE TABLE IF NOT EXISTS public.daily_plans (
    id uuid PRIMARY KEY,
    exam_id uuid NOT NULL,
    exam_subject_id uuid NOT NULL,
    date date NOT NULL,
    planned_minutes integer NOT NULL,
    source text NOT NULL,
    display_order integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT daily_plans_exam_id_fkey
        FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE,
    CONSTRAINT daily_plans_exam_subject_id_fkey
        FOREIGN KEY (exam_subject_id) REFERENCES public.exam_subjects (id) ON DELETE CASCADE,
    CONSTRAINT daily_plans_exam_id_exam_subject_id_date_key UNIQUE (exam_id, exam_subject_id, date),
    CONSTRAINT daily_plans_planned_minutes_check CHECK (planned_minutes >= 10),
    CONSTRAINT daily_plans_source_check CHECK (source IN ('auto', 'manual'))
);

CREATE TABLE IF NOT EXISTS public.progress_logs (
    id uuid PRIMARY KEY,
    exam_id uuid NOT NULL,
    exam_subject_id uuid NOT NULL,
    logged_minutes integer NOT NULL,
    memo text,
    logged_date date NOT NULL,
    logged_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT progress_logs_exam_id_fkey
        FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE,
    CONSTRAINT progress_logs_exam_subject_id_fkey
        FOREIGN KEY (exam_subject_id) REFERENCES public.exam_subjects (id) ON DELETE CASCADE,
    CONSTRAINT progress_logs_logged_minutes_check CHECK (logged_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS public.exam_results (
    id uuid PRIMARY KEY,
    exam_subject_id uuid NOT NULL,
    actual_score integer NOT NULL,
    actual_study_minutes integer,
    note text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT exam_results_exam_subject_id_fkey
        FOREIGN KEY (exam_subject_id) REFERENCES public.exam_subjects (id) ON DELETE CASCADE,
    CONSTRAINT exam_results_exam_subject_id_key UNIQUE (exam_subject_id),
    CONSTRAINT exam_results_actual_score_check CHECK (actual_score BETWEEN 0 AND 100),
    CONSTRAINT exam_results_actual_study_minutes_check CHECK (actual_study_minutes >= 0)
);

CREATE TABLE IF NOT EXISTS public.availability_rules (
    id uuid PRIMARY KEY,
    exam_id uuid NOT NULL,
    weekday_club_minutes integer NOT NULL,
    weekday_no_club_minutes integer NOT NULL,
    weekend_minutes integer NOT NULL,
    club_days jsonb NOT NULL,
    study_start_date date NOT NULL,
    pre_exam_rest_mode boolean NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT availability_rules_exam_id_fkey
        FOREIGN KEY (exam_id) REFERENCES public.exams (id) ON DELETE CASCADE,
    CONSTRAINT availability_rules_exam_id_key UNIQUE (exam_id),
    CONSTRAINT availability_rules_weekday_club_minutes_check CHECK (weekday_club_minutes >= 0),
    CONSTRAINT availability_rules_weekday_no_club_minutes_check CHECK (weekday_no_club_minutes >= 0),
    CONSTRAINT availability_rules_weekend_minutes_check CHECK (weekend_minutes >= 0)
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

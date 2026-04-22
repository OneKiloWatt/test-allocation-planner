DROP POLICY IF EXISTS exams_select ON public.exams;
CREATE POLICY exams_select
    ON public.exams
    FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS exams_insert ON public.exams;
CREATE POLICY exams_insert
    ON public.exams
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exams_update ON public.exams;
CREATE POLICY exams_update
    ON public.exams
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS exams_delete ON public.exams;
CREATE POLICY exams_delete
    ON public.exams
    FOR DELETE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS exam_subjects_select ON public.exam_subjects;
CREATE POLICY exam_subjects_select
    ON public.exam_subjects
    FOR SELECT
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS exam_subjects_insert ON public.exam_subjects;
CREATE POLICY exam_subjects_insert
    ON public.exam_subjects
    FOR INSERT
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS exam_subjects_update ON public.exam_subjects;
CREATE POLICY exam_subjects_update
    ON public.exam_subjects
    FOR UPDATE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS exam_subjects_delete ON public.exam_subjects;
CREATE POLICY exam_subjects_delete
    ON public.exam_subjects
    FOR DELETE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS study_plans_select ON public.study_plans;
CREATE POLICY study_plans_select
    ON public.study_plans
    FOR SELECT
    USING (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS study_plans_insert ON public.study_plans;
CREATE POLICY study_plans_insert
    ON public.study_plans
    FOR INSERT
    WITH CHECK (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS study_plans_update ON public.study_plans;
CREATE POLICY study_plans_update
    ON public.study_plans
    FOR UPDATE
    USING (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS study_plans_delete ON public.study_plans;
CREATE POLICY study_plans_delete
    ON public.study_plans
    FOR DELETE
    USING (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS daily_plans_select ON public.daily_plans;
CREATE POLICY daily_plans_select
    ON public.daily_plans
    FOR SELECT
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS daily_plans_insert ON public.daily_plans;
CREATE POLICY daily_plans_insert
    ON public.daily_plans
    FOR INSERT
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS daily_plans_update ON public.daily_plans;
CREATE POLICY daily_plans_update
    ON public.daily_plans
    FOR UPDATE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS daily_plans_delete ON public.daily_plans;
CREATE POLICY daily_plans_delete
    ON public.daily_plans
    FOR DELETE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS progress_logs_select ON public.progress_logs;
CREATE POLICY progress_logs_select
    ON public.progress_logs
    FOR SELECT
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS progress_logs_insert ON public.progress_logs;
CREATE POLICY progress_logs_insert
    ON public.progress_logs
    FOR INSERT
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS progress_logs_update ON public.progress_logs;
CREATE POLICY progress_logs_update
    ON public.progress_logs
    FOR UPDATE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (false);

DROP POLICY IF EXISTS progress_logs_delete ON public.progress_logs;
CREATE POLICY progress_logs_delete
    ON public.progress_logs
    FOR DELETE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS exam_results_select ON public.exam_results;
CREATE POLICY exam_results_select
    ON public.exam_results
    FOR SELECT
    USING (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS exam_results_insert ON public.exam_results;
CREATE POLICY exam_results_insert
    ON public.exam_results
    FOR INSERT
    WITH CHECK (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS exam_results_update ON public.exam_results;
CREATE POLICY exam_results_update
    ON public.exam_results
    FOR UPDATE
    USING (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS exam_results_delete ON public.exam_results;
CREATE POLICY exam_results_delete
    ON public.exam_results
    FOR DELETE
    USING (
        exam_subject_id IN (
            SELECT es.id
            FROM public.exam_subjects AS es
            WHERE es.exam_id IN (
                SELECT e.id
                FROM public.exams AS e
                WHERE e.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS availability_rules_select ON public.availability_rules;
CREATE POLICY availability_rules_select
    ON public.availability_rules
    FOR SELECT
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS availability_rules_insert ON public.availability_rules;
CREATE POLICY availability_rules_insert
    ON public.availability_rules
    FOR INSERT
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS availability_rules_update ON public.availability_rules;
CREATE POLICY availability_rules_update
    ON public.availability_rules
    FOR UPDATE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS availability_rules_delete ON public.availability_rules;
CREATE POLICY availability_rules_delete
    ON public.availability_rules
    FOR DELETE
    USING (
        exam_id IN (
            SELECT id
            FROM public.exams
            WHERE user_id = auth.uid()
        )
    );

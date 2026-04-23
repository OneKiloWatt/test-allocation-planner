import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { BackHeader, Layout, routePaths } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { getValidGuestSessionStorage } from "@/lib/guest-session";
import { examFormSchema, type ExamFormInput, type ScheduleDay } from "@/lib/schemas";
import { cn, formatDateToString, generateUuid } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

const termTypeOptions = [
  { value: "midterm", label: "中間" },
  { value: "final", label: "期末" },
  { value: "other", label: "その他" },
] as const;

type ExamFormValues = z.input<typeof examFormSchema>;

function buildDefaultValues(): ExamFormValues {
  const today = new Date();

  return {
    name: "",
    term_type: "midterm",
    start_date: formatDateToString(today),
    end_date: formatDateToString(new Date(today.getTime() + 24 * 60 * 60 * 1000)),
    planning_mode: "auto",
    schedule_days: [],
  };
}

export default function NewTestPage() {
  const router = useRouter();
  const repository = useRepository();
  const setActiveExamId = useExamStore((state) => state.setActiveExamId);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pendingSubjects, setPendingSubjects] = useState<Record<string, string>>({});
  const [subjectError, setSubjectError] = useState<string | null>(null);

  const form = useForm<ExamFormValues, undefined, ExamFormInput>({
    resolver: zodResolver(examFormSchema),
    defaultValues: buildDefaultValues(),
  });
  const { control, handleSubmit, watch, getValues, setValue, setError } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "schedule_days",
  });
  const startDate = watch("start_date");
  const scheduleDays = watch("schedule_days") ?? [];

  useEffect(() => {
    const session = getValidGuestSessionStorage();
    if (session == null) {
      void router.replace(routePaths.top());
      return;
    }

    setIsAuthorized(true);
  }, [router]);

  useEffect(() => {
    const endDate = getValues("end_date");
    if (endDate < startDate) {
      setValue("end_date", startDate, { shouldDirty: true, shouldValidate: true });
    }
  }, [getValues, setValue, startDate]);

  const handleAddScheduleDay = () => {
    append({
      date: startDate,
      subjects: [],
    });
  };

  const handlePendingSubjectChange = (fieldId: string, value: string) => {
    setPendingSubjects((current) => ({
      ...current,
      [fieldId]: value,
    }));
  };

  const handleAddSubject = (index: number, fieldId: string) => {
    const rawValue = pendingSubjects[fieldId] ?? "";
    const nextSubject = rawValue.trim();
    const normalizedNextSubject = nextSubject.toLowerCase();
    if (nextSubject.length === 0) {
      return;
    }

    const currentSubjects = getValues(`schedule_days.${index}.subjects`);
    const isDuplicate = currentSubjects.some(
      (subject) => subject.trim().toLowerCase() === normalizedNextSubject,
    );

    if (isDuplicate) {
      setPendingSubjects((current) => ({
        ...current,
        [fieldId]: "",
      }));
      return;
    }

    setValue(`schedule_days.${index}.subjects`, [...currentSubjects, nextSubject], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setPendingSubjects((current) => ({
      ...current,
      [fieldId]: "",
    }));
    setSubjectError(null);
  };

  const handleRemoveSubject = (index: number, subjectIndex: number) => {
    const currentSubjects = getValues(`schedule_days.${index}.subjects`);
    setValue(
      `schedule_days.${index}.subjects`,
      currentSubjects.filter((_, currentIndex) => currentIndex !== subjectIndex),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    if (values.name.trim().length === 0) {
      setError("name", {
        type: "manual",
        message: "テストに名前をつけてから進めましょう",
      });
      return;
    }

    const normalizedScheduleDays: ScheduleDay[] = values.schedule_days
      .map((scheduleDay: ScheduleDay) => ({
        date: scheduleDay.date,
        subjects: scheduleDay.subjects
          .map((subject: string) => subject.trim())
          .filter((subject: string) => subject.length > 0),
      }))
      .filter((scheduleDay: ScheduleDay) => scheduleDay.subjects.length > 0);

    const subjectCount = normalizedScheduleDays.reduce(
      (total: number, scheduleDay: ScheduleDay) => total + scheduleDay.subjects.length,
      0,
    );
    if (subjectCount === 0) {
      setSubjectError("科目を1つ追加してから進めましょう");
      return;
    }

    setSubjectError(null);

    const session = getValidGuestSessionStorage();
    if (session == null) {
      void router.replace(routePaths.top());
      return;
    }

    const timestamp = new Date().toISOString();
    const examId = generateUuid();
    const exam = {
      id: examId,
      user_id: session.sessionId,
      version: 1,
      name: values.name.trim(),
      term_type: values.term_type,
      start_date: values.start_date,
      end_date: values.end_date,
      planning_mode: "auto" as const,
      schedule_days: normalizedScheduleDays,
      status: "planning" as const,
      created_at: timestamp,
      updated_at: timestamp,
    };

    await repository.createExam(exam);

    const uniqueSubjects = new Map<string, string>();
    normalizedScheduleDays.forEach((scheduleDay: ScheduleDay) => {
      scheduleDay.subjects.forEach((subject: string) => {
        const normalizedName = subject.trim().toLowerCase();
        if (!uniqueSubjects.has(normalizedName)) {
          uniqueSubjects.set(normalizedName, subject);
        }
      });
    });

    let displayOrder = 1;
    for (const [normalizedName, subjectName] of uniqueSubjects.entries()) {
      await repository.createExamSubject({
        id: generateUuid(),
        exam_id: examId,
        subject_id: generateUuid(),
        subject_name: subjectName,
        normalized_name: normalizedName,
        target_score: 0,
        previous_score: undefined,
        previous_study_minutes: undefined,
        display_order: displayOrder,
        created_at: timestamp,
        updated_at: timestamp,
      });
      displayOrder += 1;
    }

    setActiveExamId(examId);
    void router.push(routePaths.targetScore(examId));
  });

  if (!isAuthorized) {
    return null;
  }

  return (
    <Layout variant="form" header={<BackHeader title="テストを作成" />}>
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">テスト情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>テスト名</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2学期中間テスト" />
                    </FormControl>
                    {form.formState.errors.name ? (
                      <p className="text-sm font-medium text-destructive">
                        テストに名前をつけてから進めましょう
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="term_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>テスト区分</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {termTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始日</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了日</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" min={startDate} />
                      </FormControl>
                      <FormDescription>開始日以降の日付が選べます</FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 gap-4">
              <CardTitle className="text-xl">日程と科目</CardTitle>
              <Button type="button" variant="outline" onClick={handleAddScheduleDay}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                日程を追加
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  「+ 日程を追加」からテスト日程と科目を登録できます。
                </div>
              ) : null}

              {fields.map((field, index) => {
                const currentSubjects = scheduleDays[index]?.subjects ?? [];

                return (
                  <div key={field.id} className="rounded-2xl border border-border p-4 space-y-4">
                    <FormField
                      control={control}
                      name={`schedule_days.${index}.date`}
                      render={({ field: dateField }) => (
                        <FormItem>
                          <FormLabel>日付</FormLabel>
                          <FormControl>
                            <Input {...dateField} type="date" min={startDate} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                          value={pendingSubjects[field.id] ?? ""}
                          placeholder="英語"
                          onChange={(event) =>
                            handlePendingSubjectChange(field.id, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              handleAddSubject(index, field.id);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleAddSubject(index, field.id)}
                          className="sm:w-auto"
                        >
                          追加
                        </Button>
                      </div>

                      {currentSubjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {currentSubjects.map((subject, subjectIndex) => (
                            <span
                              key={`${field.id}-${subject}-${subjectIndex}`}
                              className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                            >
                              {subject}
                              <button
                                type="button"
                                className="rounded-full text-muted-foreground transition-colors hover:text-text"
                                onClick={() => handleRemoveSubject(index, subjectIndex)}
                                aria-label={`${subject} を削除`}
                              >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">科目を追加してください。</p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" onClick={() => remove(index)}>
                        この日程を削除
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {subjectError ? (
            <p className={cn("text-sm font-medium text-destructive")} role="alert">
              {subjectError}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full">
            目標点数の設定へ進む
          </Button>
        </form>
      </Form>
    </Layout>
  );
}

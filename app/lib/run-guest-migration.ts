import { clearGuestSessionStorage, getValidGuestSessionStorage } from "@/lib/guest-session";

export async function runGuestMigration(accessToken: string): Promise<void> {
  const guestData = getValidGuestSessionStorage();
  if (guestData == null) {
    return;
  }

  const hasAnyData =
    guestData.exams.length > 0 ||
    guestData.examSubjects.length > 0 ||
    guestData.studyPlans.length > 0 ||
    guestData.dailyPlans.length > 0 ||
    guestData.progressLogs.length > 0 ||
    guestData.examResults.length > 0 ||
    guestData.availabilityRules.length > 0;

  if (!hasAnyData) {
    clearGuestSessionStorage();
    return;
  }

  const body = {
    migrationVersion: 1,
    payload: {
      exams: guestData.exams,
      examSubjects: guestData.examSubjects,
      studyPlans: guestData.studyPlans,
      dailyPlans: guestData.dailyPlans,
      progressLogs: guestData.progressLogs,
      examResults: guestData.examResults,
      availabilityRules: guestData.availabilityRules,
    },
  };

  try {
    const res = await fetch("/api/guest-migration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok || res.status === 409) {
      clearGuestSessionStorage();
    }
  } catch {
    // Network error — leave localStorage intact for next attempt
  }
}

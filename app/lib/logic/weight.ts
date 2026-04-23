export function calculateWeight(
  targetScore: number,
  previousScore: number | null | undefined,
  previousStudyMinutes: number | null | undefined,
) {
  const prevScore = previousScore ?? 50;
  const prevMinutes = previousStudyMinutes ?? 0;
  const gap = Math.max(targetScore - prevScore, 5);
  const difficulty = 1 + prevScore / 100;
  const efficiency = 1 / (1 + Math.log(1 + prevMinutes / 30));

  return gap * difficulty * efficiency;
}

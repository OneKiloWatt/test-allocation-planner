import { describe, expect, it } from "vitest";

import { calculateWeight } from "../weight";

describe("calculateWeight", () => {
  it("returns a positive number for a standard case", () => {
    expect(calculateWeight(80, 60, 120)).toBeGreaterThan(0);
  });

  it("fills null previous score with 50", () => {
    expect(calculateWeight(80, null, 120)).toBe(calculateWeight(80, 50, 120));
  });

  it("applies the gap floor of 5", () => {
    expect(calculateWeight(70, 80, 0)).toBe(calculateWeight(85, 80, 0));
  });

  it("always returns a finite positive number", () => {
    const result = calculateWeight(100, undefined, undefined);

    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});

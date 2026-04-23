import { describe, expect, it } from "vitest";

import { calculateShares, minutesFromShares } from "../share";

describe("calculateShares", () => {
  it("returns equal shares for equal weights", () => {
    const shares = calculateShares([1, 1, 1]);

    expect(shares).toHaveLength(3);
    expect(shares.reduce((sum, share) => sum + share, 0)).toBeCloseTo(1, 10);
    expect(shares[0]).toBeCloseTo(1 / 3, 10);
    expect(shares[1]).toBeCloseTo(1 / 3, 10);
    expect(shares[2]).toBeCloseTo(1 / 3, 10);
  });

  it("caps a dominant subject at or below 0.40", () => {
    const shares = calculateShares([100, 1, 1]);

    expect(Math.max(...shares)).toBeLessThanOrEqual(0.4);
  });
});

describe("minutesFromShares", () => {
  it("splits evenly when shares are equal", () => {
    expect(minutesFromShares(120, [0.5, 0.5])).toEqual([60, 60]);
  });

  it("returns values that are multiples of 10", () => {
    const result = minutesFromShares(200, [0.34, 0.33, 0.33]);

    expect(result.every((minutes) => minutes % 10 === 0)).toBe(true);
  });

  it("ensures tiny shares still receive at least 10 minutes", () => {
    const result = minutesFromShares(100, [0.01, 0.99]);

    expect(result[0]).toBeGreaterThanOrEqual(10);
  });
});

function roundToNearestTen(value: number) {
  return Math.round(value / 10) * 10;
}

export function calculateShares(weights: number[]) {
  if (weights.length === 0) {
    return [];
  }

  const normalizedWeights = weights.map((weight) => Math.max(weight, 0));
  const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight, 0);

  if (totalWeight <= 0) {
    return weights.map(() => 1 / weights.length);
  }

  const shares = normalizedWeights.map((weight) => weight / totalWeight);
  const remaining = new Set(shares.map((_, index) => index));
  let remainingTotal = 1;

  while (remaining.size > 0) {
    const remainingWeight = [...remaining].reduce(
      (sum, index) => sum + normalizedWeights[index],
      0,
    );

    if (remainingWeight <= 0) {
      const equalShare = remainingTotal / remaining.size;

      for (const index of remaining) {
        shares[index] = equalShare;
      }
      break;
    }

    let cappedAny = false;

    for (const index of [...remaining]) {
      const proposedShare = (normalizedWeights[index] / remainingWeight) * remainingTotal;

      if (proposedShare > 0.4) {
        shares[index] = 0.4;
        remainingTotal -= 0.4;
        remaining.delete(index);
        cappedAny = true;
      }
    }

    if (!cappedAny) {
      for (const index of remaining) {
        shares[index] = (normalizedWeights[index] / remainingWeight) * remainingTotal;
      }
      break;
    }
  }

  return shares;
}

export function minutesFromShares(totalMinutes: number, shares: number[]) {
  if (shares.length === 0) {
    return [];
  }

  const rounded = shares.map((share) => {
    const planned = totalMinutes * share;
    const roundedValue = roundToNearestTen(planned);

    if (planned > 0 && roundedValue === 0) {
      return 10;
    }

    return roundedValue;
  });

  let diff = totalMinutes - rounded.reduce((sum, minutes) => sum + minutes, 0);
  const maxIndex = shares.reduce(
    (bestIndex, share, index, arr) => (share > arr[bestIndex] ? index : bestIndex),
    0,
  );

  while (diff !== 0) {
    if (diff > 0) {
      const adjustment = diff >= 10 ? 10 : diff;
      rounded[maxIndex] += adjustment;
      diff -= adjustment;
      continue;
    }

    const removable = rounded[maxIndex] - 10;
    if (removable <= 0) {
      break;
    }

    const adjustment = Math.min(removable, Math.abs(diff), Math.abs(diff) >= 10 ? 10 : Math.abs(diff));
    rounded[maxIndex] -= adjustment;
    diff += adjustment;
  }

  return rounded;
}

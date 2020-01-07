const goldenRatio = 0.618033988749895;

function getGoldenRatioNumberFunc(
  min: number = 0,
  max: number = 1,
  seed: number = 0,
): () => number {
  let current = seed;
  const diff = max - min;
  return () => {
    current += goldenRatio;
    current %= 1;
    return min + current * diff;
  };
}

export { getGoldenRatioNumberFunc };

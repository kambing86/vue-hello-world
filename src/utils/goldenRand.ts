const goldenRatio = 0.618033988749895;

function getRandom(min: number, max: number, seed: number = 0): () => number {
  let current = seed;
  const diff = max - min;
  return () => {
    current += goldenRatio;
    current %= 1;
    return min + current * diff;
  };
}

export { getRandom };

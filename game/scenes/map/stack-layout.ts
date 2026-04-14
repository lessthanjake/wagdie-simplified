/**
 * Deterministic ring layout offsets for stacked character markers.
 */
export function getStackOffset(index: number): { dx: number; dy: number } {
  if (index === 0) return { dx: 0, dy: 0 };

  const baseRadius = 14;
  const ringStep = 10;
  const ringSize = 8;

  const adjustedIndex = index - 1;
  const ring = Math.floor(adjustedIndex / ringSize);
  const positionInRing = adjustedIndex % ringSize;
  const radius = baseRadius + ring * ringStep;
  const angle = (2 * Math.PI * positionInRing) / ringSize;

  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
  };
}

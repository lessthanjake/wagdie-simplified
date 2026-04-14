import { getStackOffset } from '@/game/scenes/map/stack-layout';

describe('getStackOffset', () => {
  it('keeps the first marker at the center', () => {
    expect(getStackOffset(0)).toEqual({ dx: 0, dy: 0 });
  });

  it('places the first ring at deterministic compass offsets', () => {
    expect(getStackOffset(1)).toEqual({ dx: 14, dy: 0 });
    expect(getStackOffset(3).dx).toBeCloseTo(0);
    expect(getStackOffset(3).dy).toBeCloseTo(14);
    expect(getStackOffset(5).dx).toBeCloseTo(-14);
    expect(getStackOffset(5).dy).toBeCloseTo(0);
  });

  it('moves to the next ring after eight surrounding markers', () => {
    expect(getStackOffset(9)).toEqual({ dx: 24, dy: 0 });
  });
});

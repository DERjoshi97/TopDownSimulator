import { describe, expect, it } from 'vitest';
import { isFiniteVec2, normalizeRotation } from './geometry';

describe('normalizeRotation', () => {
  it.each([
    [0, 0],
    [90, 90],
    [360, 0],
    [450, 90],
    [-90, 270],
    [-360, 0],
    [-720, 0],
  ])('%d° → %d°', (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected);
  });
});

describe('isFiniteVec2', () => {
  it('akzeptiert normale Koordinaten', () => {
    expect(isFiniteVec2({ x: 12.5, y: -3 })).toBe(true);
  });

  it('lehnt NaN und Unendlich ab', () => {
    expect(isFiniteVec2({ x: NaN, y: 0 })).toBe(false);
    expect(isFiniteVec2({ x: 0, y: Infinity })).toBe(false);
  });
});

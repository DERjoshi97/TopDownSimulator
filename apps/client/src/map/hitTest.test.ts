import { describe, expect, it } from 'vitest';
import type { Unit } from '@tds/engine';
import { hitTestUnits } from './hitTest';

const viewport = { width: 800, height: 600 };
const camera = { center: { x: 0, y: 0 }, scale: 10 };

const unit = (id: string, x: number, y: number): Unit => ({
  id,
  unitType: 'HLF',
  position: { x, y },
  rotation: 0,
});

describe('hitTestUnits', () => {
  // Einheit bei (0|0) liegt in der Fenstermitte (400|300).
  const units = [unit('a', 0, 0)];

  it('trifft eine Einheit in der Mitte ihres Zeichens', () => {
    expect(hitTestUnits(units, camera, viewport, { x: 400, y: 300 })?.id).toBe('a');
  });

  it('trifft auch knapp neben dem Rand', () => {
    expect(hitTestUnits(units, camera, viewport, { x: 400 + 24, y: 300 })?.id).toBe('a');
  });

  it('trifft nichts weiter weg', () => {
    expect(hitTestUnits(units, camera, viewport, { x: 400 + 40, y: 300 })).toBeUndefined();
  });

  it('wählt bei Überlappung die oben liegende Einheit', () => {
    const overlapping = [unit('unten', 0, 0), unit('oben', 1, 0)];
    expect(hitTestUnits(overlapping, camera, viewport, { x: 405, y: 300 })?.id).toBe('oben');
  });
});

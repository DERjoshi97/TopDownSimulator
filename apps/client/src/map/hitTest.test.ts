import { describe, expect, it } from 'vitest';
import type { Unit } from '@tds/engine';
import {
  ROTATION_HANDLE_OFFSET,
  hitTestRotationHandle,
  hitTestUnits,
  rotationHandlePosition,
  rotationTowards,
} from './hitTest';

const viewport = { width: 800, height: 600 };
const camera = { center: { x: 0, y: 0 }, scale: 10 };

const unit = (id: string, x: number, y: number, rotation = 0): Unit => ({
  id,
  unitType: 'HLF',
  position: { x, y },
  rotation,
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

  it('berücksichtigt die Drehung des Zeichens', () => {
    // Um 90° gedreht steht das 44 × 26 px breite Zeichen hochkant.
    const rotated = [unit('a', 0, 0, 90)];
    expect(hitTestUnits(rotated, camera, viewport, { x: 400, y: 300 + 24 })?.id).toBe('a');
    expect(hitTestUnits(rotated, camera, viewport, { x: 400 + 24, y: 300 })).toBeUndefined();
  });
});

describe('Drehgriff', () => {
  const center = { x: 400, y: 300 };

  it('liegt ohne Drehung über dem Zeichen', () => {
    expect(rotationHandlePosition(center, 0)).toEqual({ x: 400, y: 300 - ROTATION_HANDLE_OFFSET });
  });

  it('wandert bei 90° nach rechts', () => {
    const handle = rotationHandlePosition(center, 90);
    expect(handle.x).toBeCloseTo(400 + ROTATION_HANDLE_OFFSET);
    expect(handle.y).toBeCloseTo(300);
  });

  it('wird nur in seiner Nähe getroffen', () => {
    expect(hitTestRotationHandle(center, 0, { x: 403, y: 300 - ROTATION_HANDLE_OFFSET })).toBe(
      true,
    );
    expect(hitTestRotationHandle(center, 0, center)).toBe(false);
  });
});

describe('rotationTowards', () => {
  const center = { x: 400, y: 300 };

  it.each([
    [{ x: 400, y: 200 }, 0],
    [{ x: 500, y: 300 }, 90],
    [{ x: 400, y: 400 }, 180],
    [{ x: 300, y: 300 }, 270],
  ])('Punkt %o ergibt %i°', (point, expected) => {
    expect(rotationTowards(center, point)).toBeCloseTo(expected);
  });

  it('passt zur Lage des Drehgriffs', () => {
    expect(rotationTowards(center, rotationHandlePosition(center, 135))).toBeCloseTo(135);
  });
});

import { describe, expect, it } from 'vitest';
import {
  hitTestHandle,
  hitTestItems,
  resizeHandlePosition,
  rotationHandleOffset,
  rotationHandlePosition,
  rotationTowards,
} from './hitTest';
import { situationObjectItem, unitItem, type MapItem } from './mapItems';

const viewport = { width: 800, height: 600 };
const camera = { center: { x: 0, y: 0 }, scale: 10 };

const unit = (id: string, x: number, y: number, rotation = 0): MapItem =>
  unitItem({ id, unitType: 'HLF', position: { x, y }, rotation });

const fire = (id: string, x: number, y: number, radius: number): MapItem =>
  situationObjectItem({
    id,
    objectType: 'fire',
    position: { x, y },
    rotation: 0,
    radius,
    visibility: 'everyone',
  });

describe('hitTestItems', () => {
  // Einheit bei (0|0) liegt in der Fenstermitte (400|300).
  const items = [unit('a', 0, 0)];

  it('trifft eine Einheit in der Mitte ihres Zeichens', () => {
    expect(hitTestItems(items, camera, viewport, { x: 400, y: 300 })?.ref.id).toBe('a');
  });

  it('trifft auch knapp neben dem Rand', () => {
    expect(hitTestItems(items, camera, viewport, { x: 400 + 24, y: 300 })?.ref.id).toBe('a');
  });

  it('trifft nichts weiter weg', () => {
    expect(hitTestItems(items, camera, viewport, { x: 400 + 40, y: 300 })).toBeUndefined();
  });

  it('wählt bei Überlappung das oben liegende Objekt', () => {
    const overlapping = [unit('unten', 0, 0), unit('oben', 1, 0)];
    expect(hitTestItems(overlapping, camera, viewport, { x: 405, y: 300 })?.ref.id).toBe('oben');
  });

  it('berücksichtigt die Drehung des Zeichens', () => {
    // Um 90° gedreht steht das 44 × 26 px breite Zeichen hochkant.
    const rotated = [unit('a', 0, 0, 90)];
    expect(hitTestItems(rotated, camera, viewport, { x: 400, y: 300 + 24 })?.ref.id).toBe('a');
    expect(hitTestItems(rotated, camera, viewport, { x: 400 + 24, y: 300 })).toBeUndefined();
  });

  it('trifft eine Fläche innerhalb ihres Radius', () => {
    // 5 m Radius bei 10 px/m = 50 px
    const area = [fire('f', 0, 0, 5)];
    expect(hitTestItems(area, camera, viewport, { x: 400 + 45, y: 300 })?.ref.id).toBe('f');
    expect(hitTestItems(area, camera, viewport, { x: 400 + 55, y: 300 })).toBeUndefined();
  });

  it('bevorzugt eine Einheit, die auf einer Fläche steht', () => {
    const stacked = [fire('f', 0, 0, 5), unit('u', 0, 0)];
    expect(hitTestItems(stacked, camera, viewport, { x: 400, y: 300 })?.ref.id).toBe('u');
  });
});

describe('Drehgriff', () => {
  const center = { x: 400, y: 300 };
  const offset = rotationHandleOffset(unit('a', 0, 0).size.height);

  it('liegt ohne Drehung über dem Zeichen', () => {
    expect(rotationHandlePosition(center, unit('a', 0, 0))).toEqual({ x: 400, y: 300 - offset });
  });

  it('wandert bei 90° nach rechts', () => {
    const handle = rotationHandlePosition(center, unit('a', 0, 0, 90));
    expect(handle.x).toBeCloseTo(400 + offset);
    expect(handle.y).toBeCloseTo(300);
  });

  it('wird nur in seiner Nähe getroffen', () => {
    const handle = rotationHandlePosition(center, unit('a', 0, 0));
    expect(hitTestHandle(handle, { x: 403, y: 300 - offset })).toBe(true);
    expect(hitTestHandle(handle, center)).toBe(false);
  });
});

describe('Größen-Griff', () => {
  it('liegt rechts auf dem Kreisrand', () => {
    expect(resizeHandlePosition({ x: 400, y: 300 }, 50)).toEqual({ x: 450, y: 300 });
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
    const handle = rotationHandlePosition(center, unit('a', 0, 0, 135));
    expect(rotationTowards(center, handle)).toBeCloseTo(135);
  });
});

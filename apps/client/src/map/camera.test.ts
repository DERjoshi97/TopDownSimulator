import { describe, expect, it } from 'vitest';
import {
  MAX_SCALE,
  MIN_SCALE,
  formatDistance,
  gridStep,
  niceStepAtLeast,
  niceStepAtMost,
  panBy,
  scaleBar,
  screenToWorld,
  worldToScreen,
  zoomAt,
  type Camera,
} from './camera';

const viewport = { width: 800, height: 600 };
const camera: Camera = { center: { x: 100, y: 50 }, scale: 10 };

describe('worldToScreen / screenToWorld', () => {
  it('legt die Kameramitte in die Fenstermitte', () => {
    expect(worldToScreen(camera, viewport, { x: 100, y: 50 })).toEqual({ x: 400, y: 300 });
  });

  it('rechnet Meter in Pixel um', () => {
    // 5 m rechts, 2 m unterhalb der Mitte bei 10 px/m
    expect(worldToScreen(camera, viewport, { x: 105, y: 52 })).toEqual({ x: 450, y: 320 });
  });

  it('sind Umkehrungen voneinander', () => {
    const world = { x: 123.4, y: -56.7 };
    const back = screenToWorld(camera, viewport, worldToScreen(camera, viewport, world));
    expect(back.x).toBeCloseTo(world.x);
    expect(back.y).toBeCloseTo(world.y);
  });
});

describe('panBy', () => {
  it('verschiebt die Karte mit der Maus: nach rechts ziehen zeigt weiter links liegende Teile', () => {
    expect(panBy(camera, 100, 0).center).toEqual({ x: 90, y: 50 });
  });
});

describe('zoomAt', () => {
  it('hält den Punkt unter dem Mauszeiger fest', () => {
    const mouse = { x: 650, y: 120 };
    const before = screenToWorld(camera, viewport, mouse);
    const zoomed = zoomAt(camera, viewport, mouse, 2);
    const after = screenToWorld(zoomed, viewport, mouse);

    expect(zoomed.scale).toBe(20);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('bleibt innerhalb der Zoomgrenzen', () => {
    const center = { x: 400, y: 300 };
    expect(zoomAt(camera, viewport, center, 1e6).scale).toBe(MAX_SCALE);
    expect(zoomAt(camera, viewport, center, 1e-6).scale).toBe(MIN_SCALE);
  });
});

describe('runde Schrittweiten', () => {
  it.each([
    [1, 1],
    [1.1, 2],
    [3, 5],
    [7, 10],
    [0.3, 0.5],
    [0.2, 0.2],
    [240, 500],
  ])('niceStepAtLeast(%d) = %d', (input, expected) => {
    expect(niceStepAtLeast(input)).toBeCloseTo(expected);
  });

  it.each([
    [1, 1],
    [1.9, 1],
    [4.9, 2],
    [12, 10],
    [0.6, 0.5],
    [999, 500],
  ])('niceStepAtMost(%d) = %d', (input, expected) => {
    expect(niceStepAtMost(input)).toBeCloseTo(expected);
  });
});

describe('gridStep', () => {
  it('wählt bei 10 px/m ein 2-m-Raster (20 px Abstand)', () => {
    expect(gridStep(10)).toBe(2);
  });

  it('wird beim Herauszoomen gröber', () => {
    expect(gridStep(0.1)).toBe(200);
  });
});

describe('scaleBar', () => {
  it('liefert einen runden Wert, der ins Maximum passt', () => {
    expect(scaleBar(10, 120)).toEqual({ meters: 10, px: 100 });
  });
});

describe('formatDistance', () => {
  it.each([
    [0.5, '0,5 m'],
    [50, '50 m'],
    [1000, '1 km'],
    [2500, '2,5 km'],
  ])('%d m → %s', (input, expected) => {
    expect(formatDistance(input)).toBe(expected);
  });
});

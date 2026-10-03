import { describe, expect, it } from 'vitest';
import {
  hitTestHandle,
  hitTestItems,
  lengthHandlePosition,
  lengthTowards,
  pointInPolygon,
  resizeHandlePosition,
  rotationHandleOffset,
  rotationHandlePosition,
  rotationTowards,
} from './hitTest';
import {
  buildingItem,
  mapFeatureItem,
  situationObjectItem,
  unitItem,
  type MapItem,
} from './mapItems';

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
  // Ein HLF ist 8,5 × 2,5 m groß, bei 10 px/m also 85 × 25 px.
  const items = [unit('a', 0, 0)];

  it('trifft eine Einheit in der Mitte ihres Zeichens', () => {
    expect(hitTestItems(items, camera, viewport, { x: 400, y: 300 })?.ref.id).toBe('a');
  });

  it('trifft auch knapp neben dem Rand', () => {
    expect(hitTestItems(items, camera, viewport, { x: 400 + 45, y: 300 })?.ref.id).toBe('a');
  });

  it('trifft nichts weiter weg', () => {
    expect(hitTestItems(items, camera, viewport, { x: 400 + 50, y: 300 })).toBeUndefined();
  });

  it('wächst beim Hereinzoomen mit', () => {
    const zoomedIn = { ...camera, scale: 20 };
    expect(hitTestItems(items, zoomedIn, viewport, { x: 400 + 80, y: 300 })?.ref.id).toBe('a');
    const zoomedOut = { ...camera, scale: 2 };
    expect(hitTestItems(items, zoomedOut, viewport, { x: 400 + 20, y: 300 })).toBeUndefined();
  });

  it('wählt bei Überlappung das oben liegende Objekt', () => {
    const overlapping = [unit('unten', 0, 0), unit('oben', 1, 0)];
    expect(hitTestItems(overlapping, camera, viewport, { x: 405, y: 300 })?.ref.id).toBe('oben');
  });

  it('berücksichtigt die Drehung des Zeichens', () => {
    // Um 90° gedreht steht das 85 × 25 px große Zeichen hochkant.
    const rotated = [unit('a', 0, 0, 90)];
    expect(hitTestItems(rotated, camera, viewport, { x: 400, y: 300 + 45 })?.ref.id).toBe('a');
    expect(hitTestItems(rotated, camera, viewport, { x: 400 + 45, y: 300 })).toBeUndefined();
  });

  describe('Fläche mit 5 m Radius (bei 10 px/m = 50 px)', () => {
    const area = [fire('f', 0, 0, 5)];
    const hit = (x: number, y: number) => hitTestItems(area, camera, viewport, { x, y })?.ref.id;

    it('wird am Zeichen in der Mitte getroffen', () => {
      expect(hit(400, 300)).toBe('f');
    });

    it('wird knapp innerhalb und außerhalb des Kreisrands getroffen', () => {
      expect(hit(400 + 46, 300)).toBe('f');
      expect(hit(400, 300 - 54)).toBe('f');
    });

    it('lässt das Innere frei, damit man dort die Karte verschieben kann', () => {
      expect(hit(400 + 30, 300)).toBeUndefined();
    });

    it('wird weit außerhalb nicht getroffen', () => {
      expect(hit(400 + 60, 300)).toBeUndefined();
    });
  });

  it('bevorzugt eine Einheit, die auf einer Fläche steht', () => {
    const stacked = [fire('f', 0, 0, 5), unit('u', 0, 0)];
    expect(hitTestItems(stacked, camera, viewport, { x: 400, y: 300 })?.ref.id).toBe('u');
  });
});

describe('Drehgriff', () => {
  const center = { x: 400, y: 300 };
  const scale = camera.scale;
  const offset = rotationHandleOffset(unit('a', 0, 0).size.height * scale);

  it('liegt ohne Drehung über dem Zeichen', () => {
    expect(rotationHandlePosition(center, unit('a', 0, 0), scale)).toEqual({
      x: 400,
      y: 300 - offset,
    });
  });

  it('wandert bei 90° nach rechts', () => {
    const handle = rotationHandlePosition(center, unit('a', 0, 0, 90), scale);
    expect(handle.x).toBeCloseTo(400 + offset);
    expect(handle.y).toBeCloseTo(300);
  });

  it('wird nur in seiner Nähe getroffen', () => {
    const handle = rotationHandlePosition(center, unit('a', 0, 0), scale);
    expect(hitTestHandle(handle, { x: 403, y: 300 - offset })).toBe(true);
    expect(hitTestHandle(handle, center)).toBe(false);
  });
});

describe('Längen-Griff', () => {
  const center = { x: 400, y: 300 };
  const cordon = (rotation: number) =>
    situationObjectItem({
      id: 'c',
      objectType: 'cordon',
      position: { x: 0, y: 0 },
      rotation,
      length: 10,
      visibility: 'everyone',
    });

  it('liegt am rechten Ende und dreht sich mit', () => {
    expect(lengthHandlePosition(center, cordon(0), 10)).toEqual({ x: 450, y: 300 });
    const rotated = lengthHandlePosition(center, cordon(90), 10);
    expect(rotated.x).toBeCloseTo(400);
    expect(rotated.y).toBeCloseTo(350);
  });

  it('ergibt die doppelte Entfernung entlang der Achse als Länge', () => {
    // 100 px rechts der Mitte bei 10 px/m = 10 m je Seite = 20 m lang; seitlicher Versatz zählt nicht.
    expect(lengthTowards(center, 0, { x: 500, y: 330 }, 10)).toBeCloseTo(20);
    expect(lengthTowards(center, 90, { x: 400, y: 375 }, 10)).toBeCloseTo(15);
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
    const handle = rotationHandlePosition(center, unit('a', 0, 0, 135), camera.scale);
    expect(rotationTowards(center, handle)).toBeCloseTo(135);
  });
});

describe('Gebäude', () => {
  // L-förmiges Gebäude: 20 × 20 m, rechts oben fehlt ein 10 × 10 m großes Stück.
  const building = buildingItem({
    id: 'b',
    storeys: 2,
    outline: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ],
  });
  // Bei 10 px/m und Mitte (0|0) liegt der Weltpunkt (x|y) bei (400 + 10x | 300 + 10y).
  const hit = (x: number, y: number) =>
    hitTestItems([building], camera, viewport, { x: 400 + 10 * x, y: 300 + 10 * y })?.ref.id;

  it('wird innerhalb des Grundrisses getroffen', () => {
    expect(hit(5, 15)).toBe('b');
    expect(hit(15, 15)).toBe('b');
  });

  it('wird in der ausgesparten Ecke nicht getroffen', () => {
    expect(hit(15, 5)).toBeUndefined();
  });

  it('wird knapp außerhalb des Rands noch getroffen', () => {
    expect(hit(-0.3, 10)).toBe('b');
  });

  it('liegt unter Einheiten', () => {
    const items = [building, unit('u', 5, 15)];
    expect(hitTestItems(items, camera, viewport, { x: 450, y: 450 })?.ref.id).toBe('u');
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  it('unterscheidet innen und außen', () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
});

describe('Straßen und Beschriftungen', () => {
  // 6 m breite Straße von (0|0) nach (40|0): bei 10 px/m 60 px breit.
  const road = mapFeatureItem({
    kind: 'road',
    id: 'r',
    path: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
    ],
    width: 6,
  });
  const label = mapFeatureItem({
    kind: 'label',
    id: 'l',
    position: { x: -20, y: 0 },
    text: 'Eingang',
  });
  const hit = (items: MapItem[], x: number, y: number) =>
    hitTestItems(items, camera, viewport, { x, y })?.ref.id;

  it('trifft Straßen innerhalb der Fahrbahnbreite', () => {
    expect(hit([road], 600, 300 + 28)).toBe('r');
    expect(hit([road], 600, 300 + 40)).toBeUndefined();
  });

  it('trifft Beschriftungen in ihrer festen Bildschirmgröße – unabhängig vom Zoom', () => {
    // Beschriftung bei Weltpunkt (-20|0) = Bildschirm (200|300).
    expect(hit([label], 220, 305)).toBe('l');
    const zoomedOut = { ...camera, scale: 1 }; // jetzt bei (380|300)
    expect(hitTestItems([label], zoomedOut, viewport, { x: 400, y: 305 })?.ref.id).toBe('l');
  });
});

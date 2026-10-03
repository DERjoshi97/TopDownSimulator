import { describe, expect, it } from 'vitest';
import { replay } from '@tds/engine';
import { findMapItem, mapItemsFromState, pointAlongPath, typeName } from './mapItems';

const state = replay([
  {
    type: 'UnitPlaced',
    exerciseTime: 0,
    unitId: 'hlf-1',
    unitType: 'HLF',
    position: { x: 0, y: 0 },
    rotation: 90,
  },
  {
    type: 'SituationObjectPlaced',
    exerciseTime: 0,
    objectId: 'fire-1',
    objectType: 'fire',
    position: { x: 5, y: 5 },
    rotation: 45,
    radius: 3,
    visibility: 'director',
  },
  {
    type: 'SituationObjectPlaced',
    exerciseTime: 0,
    objectId: 'cordon-1',
    objectType: 'cordon',
    position: { x: 1, y: 1 },
    rotation: 30,
    visibility: 'everyone',
  },
]);

describe('mapItemsFromState', () => {
  it('legt Einheiten über die Lageobjekte', () => {
    expect(mapItemsFromState(state).map((item) => item.ref.id)).toEqual([
      'fire-1',
      'cordon-1',
      'hlf-1',
    ]);
  });

  it('macht Flächen nicht drehbar und blendet sie für die Übungsleitung halb aus', () => {
    const fire = findMapItem(state, { kind: 'situationObject', id: 'fire-1' });
    expect(fire).toMatchObject({ radius: 3, rotation: 0, rotatable: false, dimmed: true });
  });

  it('behandelt Symbole wie Einheiten', () => {
    const cordon = findMapItem(state, { kind: 'situationObject', id: 'cordon-1' });
    expect(cordon).toMatchObject({ rotation: 30, rotatable: true, dimmed: false });
    expect(cordon).not.toHaveProperty('radius');
  });

  it('findet nichts zu unbekannten Verweisen', () => {
    expect(findMapItem(state, { kind: 'unit', id: 'fire-1' })).toBeUndefined();
    expect(findMapItem(state, undefined)).toBeUndefined();
  });
});

describe('typeName', () => {
  it('liest den Namen aus dem passenden Katalog', () => {
    expect(typeName('unit', 'DLK')).toBe('Drehleiter mit Korb');
    expect(typeName('situationObject', 'hazardous-material')).toBe('Gefahrstoff');
    expect(typeName('situationObject', 'unbekannt')).toBe('unbekannt');
  });
});

describe('maßstäbliche Größen', () => {
  it('übernimmt die Fahrzeugmaße aus dem Katalog', () => {
    expect(findMapItem(state, { kind: 'unit', id: 'hlf-1' })?.size).toEqual({
      width: 8.5,
      height: 2.5,
    });
  });

  it('nimmt bei einstellbarer Länge die Länge des Objekts', () => {
    const withLength = replay([
      {
        type: 'SituationObjectPlaced',
        exerciseTime: 0,
        objectId: 'c',
        objectType: 'cordon',
        position: { x: 0, y: 0 },
        rotation: 0,
        length: 25,
        visibility: 'everyone',
      },
    ]);
    expect(findMapItem(withLength, { kind: 'situationObject', id: 'c' })).toMatchObject({
      length: 25,
      size: { width: 25, height: 0.3 },
    });
  });
});

describe('pointAlongPath', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 40 },
  ];
  it('findet die Mitte eines geknickten Verlaufs', () => {
    // Gesamtlänge 70 m, die Mitte liegt 35 m weit – also 5 m hinter dem Knick.
    expect(pointAlongPath(path, 0.5)).toEqual({ x: 30, y: 5 });
  });
  it('liefert Anfang und Ende', () => {
    expect(pointAlongPath(path, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlongPath(path, 1)).toEqual({ x: 30, y: 40 });
  });
});

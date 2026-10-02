import { describe, expect, it } from 'vitest';
import { replay } from '@tds/engine';
import { findMapItem, mapItemsFromState, typeName } from './mapItems';

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

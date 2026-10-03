import { describe, expect, it } from 'vitest';
import {
  addBuildingCommand,
  moveCommand,
  placeCommand,
  removeCommand,
  rotateCommand,
} from './itemCommands';

const origin = { x: 0, y: 0 };

describe('placeCommand', () => {
  it('platziert Einheiten', () => {
    expect(placeCommand({ kind: 'unit', typeId: 'HLF' }, 'a', origin)).toEqual({
      type: 'PlaceUnit',
      unitId: 'a',
      unitType: 'HLF',
      position: origin,
    });
  });

  it('gibt Flächen den Standardradius aus dem Katalog', () => {
    expect(placeCommand({ kind: 'situationObject', typeId: 'fire' }, 'f', origin)).toEqual({
      type: 'PlaceSituationObject',
      objectId: 'f',
      objectType: 'fire',
      position: origin,
      radius: 3,
    });
  });

  it('lässt Radius und Länge bei festen Symbolen weg', () => {
    const command = placeCommand({ kind: 'situationObject', typeId: 'person' }, 'p', origin);
    expect(command).not.toHaveProperty('radius');
    expect(command).not.toHaveProperty('length');
  });

  it('gibt Absperrungen die Startlänge aus dem Katalog', () => {
    const command = placeCommand({ kind: 'situationObject', typeId: 'cordon' }, 'c', origin);
    expect(command).toMatchObject({ length: 10 });
  });
});

describe('Befehle für ausgewählte Objekte', () => {
  const unit = { kind: 'unit', id: 'u' } as const;
  const object = { kind: 'situationObject', id: 'o' } as const;

  it('wählt je nach Art den passenden Befehl', () => {
    expect(moveCommand(unit, origin, origin).type).toBe('MoveUnit');
    expect(moveCommand(object, origin, origin).type).toBe('MoveSituationObject');
    expect(rotateCommand(unit, 90).type).toBe('RotateUnit');
    expect(rotateCommand(object, 90).type).toBe('RotateSituationObject');
    expect(removeCommand(unit).type).toBe('RemoveUnit');
    expect(removeCommand(object).type).toBe('RemoveSituationObject');
  });
});

describe('Gebäude', () => {
  const building = { kind: 'building', id: 'b' } as const;

  it('werden mit zwei Geschossen angelegt', () => {
    const outline = [origin, { x: 5, y: 0 }, { x: 5, y: 5 }];
    expect(addBuildingCommand('b', outline)).toEqual({
      type: 'AddBuilding',
      buildingId: 'b',
      outline,
      storeys: 2,
    });
  });

  it('werden um die gerundete Differenz verschoben', () => {
    expect(moveCommand(building, { x: 13.04, y: 7.26 }, { x: 10, y: 5 })).toEqual({
      type: 'MoveBuilding',
      buildingId: 'b',
      offset: { x: 3, y: 2.3 },
    });
  });

  it('werden entfernt, aber nie gedreht', () => {
    expect(removeCommand(building)).toEqual({ type: 'RemoveBuilding', buildingId: 'b' });
    expect(() => rotateCommand(building, 90)).toThrow();
  });
});

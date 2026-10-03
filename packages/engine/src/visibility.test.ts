import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import type { Visibility } from './state';
import { presentationState } from './visibility';

const place = (objectId: string, visibility: Visibility) =>
  ({
    type: 'SituationObjectPlaced',
    exerciseTime: 0,
    objectId,
    objectType: 'fire',
    position: { x: 0, y: 0 },
    rotation: 0,
    radius: 3,
    visibility,
  }) as const;

describe('presentationState', () => {
  const state = replay([
    {
      type: 'UnitPlaced',
      exerciseTime: 0,
      unitId: 'hlf-1',
      unitType: 'HLF',
      position: { x: 0, y: 0 },
      rotation: 0,
    },
    place('versteckt', 'director'),
    place('erkundet', 'reconnoitered'),
    place('offen', 'everyone'),
  ]);

  it('entfernt Lageobjekte, die nur die Übungsleitung sieht', () => {
    expect(Object.keys(presentationState(state).situationObjects).sort()).toEqual([
      'erkundet',
      'offen',
    ]);
  });

  it('zeigt alle Einheiten und lässt die Uhr unverändert', () => {
    const shown = presentationState(state);
    expect(shown.units).toBe(state.units);
    expect(shown.clock).toBe(state.clock);
  });

  it('verändert den ursprünglichen Spielstand nicht', () => {
    presentationState(state);
    expect(Object.keys(state.situationObjects)).toHaveLength(3);
  });
});

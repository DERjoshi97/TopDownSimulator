import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import { decide } from './decide';
import type { GameEvent } from './events';
import { parseExercise, serializeExercise } from './exerciseFile';
import { Game } from './game';
import { pathLength } from './mapFeatures';
import type { MapFeature } from './state';

const road: MapFeature = {
  kind: 'road',
  id: 'road-1',
  path: [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 40 },
  ],
  width: 6,
  name: ' Hauptstraße ',
};
const hydrant: MapFeature = {
  kind: 'hydrant',
  id: 'h-1',
  position: { x: 5, y: 5 },
  hydrantType: 'underground',
};
const label: MapFeature = { kind: 'label', id: 'l-1', position: { x: 1, y: 1 }, text: 'Eingang' };

describe('Kartenelemente', () => {
  it('misst die Länge eines Straßenverlaufs', () => {
    expect(pathLength(road.kind === 'road' ? road.path : [])).toBe(70);
  });

  it('entfernt Leerzeichen am Rand des Namens', () => {
    const result = decide(replay([]), { type: 'AddMapFeature', feature: road }, 0);
    expect(result.ok && result.events[0]).toMatchObject({ feature: { name: 'Hauptstraße' } });
  });

  it.each([
    ['Straße mit nur einem Punkt', { ...road, path: [{ x: 0, y: 0 }] }, 'path'],
    ['zu schmale Straße', { ...road, width: 0.5 }, 'width'],
    ['unbekannter Hydrantentyp', { ...hydrant, hydrantType: 'wand' }, 'hydrantType'],
    ['leere Beschriftung', { ...label, text: '   ' }, 'text'],
  ])('lehnt %s ab', (_, feature, field) => {
    const result = decide(replay([]), { type: 'AddMapFeature', feature: feature as MapFeature }, 0);
    expect(result).toEqual({ ok: false, rejection: { code: 'invalid-map-feature', field } });
  });

  it('lässt nur passende Änderungen zu', () => {
    const state = replay([{ type: 'MapFeatureAdded', exerciseTime: 0, feature: hydrant }]);
    expect(
      decide(state, { type: 'ChangeMapFeature', featureId: 'h-1', changes: { width: 4 } }, 0),
    ).toEqual({ ok: false, rejection: { code: 'invalid-map-feature', field: 'width' } });
  });

  it('lassen sich verschieben, ändern und entfernen', () => {
    const game = new Game();
    for (const feature of [road, hydrant, label]) {
      game.execute({ type: 'AddMapFeature', feature }, 0);
    }
    game.execute({ type: 'MoveMapFeature', featureId: 'road-1', offset: { x: 1, y: 2 } }, 1);
    game.execute({ type: 'MoveMapFeature', featureId: 'h-1', offset: { x: -5, y: 0 } }, 1);
    game.execute(
      { type: 'ChangeMapFeature', featureId: 'road-1', changes: { width: 8, name: '' } },
      2,
    );
    game.execute(
      { type: 'ChangeMapFeature', featureId: 'h-1', changes: { hydrantType: 'above-ground' } },
      2,
    );
    game.execute({ type: 'ChangeMapFeature', featureId: 'l-1', changes: { text: 'Zufahrt' } }, 2);

    const { mapFeatures } = game.state;
    expect(mapFeatures['road-1']).toEqual({
      kind: 'road',
      id: 'road-1',
      path: [
        { x: 1, y: 2 },
        { x: 31, y: 2 },
        { x: 31, y: 42 },
      ],
      width: 8,
    });
    expect(mapFeatures['h-1']).toMatchObject({
      position: { x: 0, y: 5 },
      hydrantType: 'above-ground',
    });
    expect(mapFeatures['l-1']).toMatchObject({ text: 'Zufahrt' });
    expect(replay(game.events)).toEqual(game.state);

    game.execute({ type: 'RemoveMapFeature', featureId: 'l-1' }, 3);
    expect(Object.keys(game.state.mapFeatures).sort()).toEqual(['h-1', 'road-1']);
  });

  it('übersteht Speichern und Laden und erkennt kaputte Elemente', () => {
    const events: GameEvent[] = [{ type: 'MapFeatureAdded', exerciseTime: 0, feature: hydrant }];
    const ok = parseExercise(serializeExercise(events, 0, new Date()));
    expect(ok.ok && ok.file.events).toEqual(events);

    const broken = serializeExercise(
      [{ type: 'MapFeatureAdded', exerciseTime: 0, feature: { ...label, text: '' } }],
      0,
      new Date(),
    );
    expect(parseExercise(broken)).toEqual({
      ok: false,
      error: { code: 'invalid-event', index: 0 },
    });
  });
});

import { useEffect, useState } from 'react';
import {
  hydrantTypes,
  pathLength,
  polygonArea,
  visibilities,
  type Building,
  type MapFeature,
  type MapFeatureChanges,
  type Visibility,
} from '@tds/engine';
import { ROTATION_STEP } from '../map/hitTest';
import { DEFAULT_LABEL_TEXT, removeCommand, rotateCommand } from '../map/itemCommands';
import { findMapItem, isArea, typeName, type MapItemRef } from '../map/mapItems';
import { useGameStore } from '../store/gameStore';
import { useToolStore } from '../store/toolStore';

/** Schritt in Metern für die Knöpfe zum Vergrößern und Verkleinern von Radius und Länge. */
const SIZE_STEP = 1;

/** Kleinster Radius bzw. kleinste Länge, die die Knöpfe einstellen – passend zu den Griffen. */
const MIN_RADIUS = 0.5;
const MIN_LENGTH = 1;

const VISIBILITY_LABELS: Record<Visibility, string> = {
  director: 'Übungsleitung',
  reconnoitered: 'Erkundet',
  everyone: 'Alle',
};

/**
 * Zeigt das ausgewählte Objekt und bietet passende Aktionen an – per Knopf oder Tastatur
 * (R / Umschalt+R drehen, Entf / ⌫ entfernen, Esc abwählen).
 */
export function SelectionPanel() {
  const selection = useToolStore((s) => s.selection);
  const state = useGameStore((s) => s.state);
  const item = findMapItem(state, selection);
  const visibility =
    selection?.kind === 'situationObject'
      ? state.situationObjects[selection.id]?.visibility
      : undefined;
  const building = selection?.kind === 'building' ? state.buildings[selection.id] : undefined;
  const feature = selection?.kind === 'mapFeature' ? state.mapFeatures[selection.id] : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Tastenkürzel des Browsers (z. B. Cmd+R) und Eingaben in Textfeldern nicht abfangen.
      if (e.metaKey || e.ctrlKey || e.altKey || isTextInput(e.target)) return;
      const { selection, select } = useToolStore.getState();
      const item = findMapItem(useGameStore.getState().state, selection);
      if (!item) return;

      if (e.key === 'Escape') {
        select(undefined);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove(item.ref);
      } else if ((e.key === 'r' || e.key === 'R') && item.rotatable) {
        rotateBy(item.ref, item.rotation, e.shiftKey ? -ROTATION_STEP : ROTATION_STEP);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!item) return null;
  const name = typeName(item.ref.kind, item.symbolType);
  const { length } = item;

  return (
    <section className="selection-panel" aria-label="Auswahl">
      {item.ref.kind === 'unit' ? (
        <>
          <h2>{item.symbolType}</h2>
          <p className="selection-panel-name">{name}</p>
        </>
      ) : (
        <h2>{building?.name ?? (feature?.kind === 'road' ? feature.name : undefined) ?? name}</h2>
      )}

      {item.rotatable && (
        <div className="selection-panel-row">
          <span>Drehung {Math.round(item.rotation)}°</span>
          <button
            type="button"
            title="Gegen den Uhrzeigersinn drehen (Umschalt+R)"
            onClick={() => rotateBy(item.ref, item.rotation, -ROTATION_STEP)}
          >
            ↺ {ROTATION_STEP}°
          </button>
          <button
            type="button"
            title="Im Uhrzeigersinn drehen (R)"
            onClick={() => rotateBy(item.ref, item.rotation, ROTATION_STEP)}
          >
            ↻ {ROTATION_STEP}°
          </button>
        </div>
      )}

      {isArea(item) && (
        <div className="selection-panel-row">
          <span>Radius {formatMeters(item.radius)}</span>
          <button
            type="button"
            title="Verkleinern"
            aria-label="Radius verkleinern"
            disabled={item.radius <= MIN_RADIUS}
            onClick={() => resize(item.ref, Math.max(MIN_RADIUS, item.radius - SIZE_STEP))}
          >
            −
          </button>
          <button
            type="button"
            title="Vergrößern"
            aria-label="Radius vergrößern"
            onClick={() => resize(item.ref, item.radius + SIZE_STEP)}
          >
            +
          </button>
        </div>
      )}

      {length !== undefined && (
        <div className="selection-panel-row">
          <span>Länge {formatMeters(length)}</span>
          <button
            type="button"
            title="Kürzen"
            aria-label="Länge kürzen"
            disabled={length <= MIN_LENGTH}
            onClick={() => changeLength(item.ref, Math.max(MIN_LENGTH, length - SIZE_STEP))}
          >
            −
          </button>
          <button
            type="button"
            title="Verlängern"
            aria-label="Länge verlängern"
            onClick={() => changeLength(item.ref, length + SIZE_STEP)}
          >
            +
          </button>
        </div>
      )}

      {/* `key`: Bei einem anderen Gebäude beginnt das Namensfeld neu. */}
      {building && <BuildingFields key={building.id} building={building} />}
      {feature && <MapFeatureFields key={feature.id} feature={feature} />}

      {visibility && (
        <fieldset className="selection-panel-visibility">
          <legend>Sichtbar für</legend>
          {visibilities.map((v) => (
            <label key={v}>
              <input
                type="radio"
                name="visibility"
                checked={visibility === v}
                onChange={() => changeVisibility(item.ref, v)}
              />
              {VISIBILITY_LABELS[v]}
            </label>
          ))}
        </fieldset>
      )}

      <button
        type="button"
        className="selection-panel-remove"
        title="Entfernen (Entf)"
        onClick={() => remove(item.ref)}
      >
        Entfernen
      </button>
    </section>
  );
}

function rotateBy(ref: MapItemRef, current: number, degrees: number): void {
  useGameStore.getState().execute(rotateCommand(ref, current + degrees));
}

function resize(ref: MapItemRef, radius: number): void {
  // Auf 0,1 m runden, sonst ergibt z. B. 3,3 − 1 den Wert 2.2999999999999998.
  const rounded = Math.round(radius * 10) / 10;
  useGameStore
    .getState()
    .execute({ type: 'ResizeSituationObject', objectId: ref.id, radius: rounded });
}

function changeLength(ref: MapItemRef, length: number): void {
  useGameStore.getState().execute({
    type: 'ChangeSituationObjectLength',
    objectId: ref.id,
    length: Math.round(length * 10) / 10,
  });
}

function changeVisibility(ref: MapItemRef, visibility: Visibility): void {
  useGameStore
    .getState()
    .execute({ type: 'ChangeSituationObjectVisibility', objectId: ref.id, visibility });
}

/** Name, Geschosszahl und Grundfläche eines Gebäudes. */
function BuildingFields({ building }: { building: Building }) {
  const [name, setName] = useState(building.name ?? '');
  const commitName = () => {
    if (name.trim() !== (building.name ?? '')) {
      useGameStore.getState().execute({ type: 'ChangeBuilding', buildingId: building.id, name });
    }
  };
  const changeStoreys = (storeys: number) =>
    useGameStore.getState().execute({ type: 'ChangeBuilding', buildingId: building.id, storeys });

  return (
    <>
      <label className="selection-panel-field">
        <span>Name</span>
        <input
          type="text"
          value={name}
          maxLength={60}
          placeholder="z. B. Schule"
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      </label>
      <div className="selection-panel-row">
        <span>
          {building.storeys} {building.storeys === 1 ? 'Geschoss' : 'Geschosse'}
        </span>
        <button
          type="button"
          aria-label="Geschoss weniger"
          disabled={building.storeys <= 1}
          onClick={() => changeStoreys(building.storeys - 1)}
        >
          −
        </button>
        <button
          type="button"
          aria-label="Geschoss mehr"
          onClick={() => changeStoreys(building.storeys + 1)}
        >
          +
        </button>
      </div>
      <p className="selection-panel-info">
        Grundfläche {Math.round(polygonArea(building.outline)).toLocaleString('de-DE')} m²
      </p>
    </>
  );
}

/** Felder für Straße, Hydrant oder Beschriftung. */
function MapFeatureFields({ feature }: { feature: MapFeature }) {
  const change = (changes: MapFeatureChanges) =>
    useGameStore.getState().execute({ type: 'ChangeMapFeature', featureId: feature.id, changes });

  switch (feature.kind) {
    case 'road':
      return (
        <>
          <TextField
            label="Name"
            value={feature.name ?? ''}
            placeholder="z. B. Hauptstraße"
            maxLength={60}
            onCommit={(name) => change({ name })}
          />
          <div className="selection-panel-row">
            <span>{formatMeters(feature.width)} breit</span>
            <button
              type="button"
              aria-label="Schmaler"
              disabled={feature.width <= 1}
              onClick={() => change({ width: Math.max(1, feature.width - 1) })}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Breiter"
              onClick={() => change({ width: Math.min(50, feature.width + 1) })}
            >
              +
            </button>
          </div>
          <p className="selection-panel-info">Länge {formatMeters(pathLength(feature.path))}</p>
        </>
      );
    case 'hydrant':
      return (
        <fieldset className="selection-panel-visibility">
          <legend>Bauart</legend>
          {hydrantTypes.map((type) => (
            <label key={type}>
              <input
                type="radio"
                name="hydrantType"
                checked={feature.hydrantType === type}
                onChange={() => change({ hydrantType: type })}
              />
              {type === 'underground' ? 'Unterflur' : 'Überflur'}
            </label>
          ))}
        </fieldset>
      );
    case 'label':
      return (
        <TextField
          label="Text"
          value={feature.text}
          maxLength={80}
          // Frisch gesetzte Beschriftung: Text gleich zum Überschreiben markieren.
          autoSelect={feature.text === DEFAULT_LABEL_TEXT}
          onCommit={(text) => {
            if (text.trim()) change({ text });
          }}
        />
      );
  }
}

/** Textfeld, das erst beim Verlassen oder mit Enter übernommen wird – ein Befehl statt einer pro Taste. */
function TextField(props: {
  label: string;
  value: string;
  placeholder?: string;
  maxLength: number;
  autoSelect?: boolean;
  onCommit: (value: string) => void;
}) {
  const [value, setValue] = useState(props.value);
  return (
    <label className="selection-panel-field">
      <span>{props.label}</span>
      <input
        type="text"
        value={value}
        maxLength={props.maxLength}
        placeholder={props.placeholder}
        // Nur direkt nach dem Setzen einer Beschriftung, damit man gleich lostippen kann.
        autoFocus={props.autoSelect}
        onFocus={(e) => props.autoSelect && e.currentTarget.select()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => value.trim() !== props.value && props.onCommit(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}

function remove(ref: MapItemRef): void {
  const result = useGameStore.getState().execute(removeCommand(ref));
  if (result.ok) useToolStore.getState().select(undefined);
}

function formatMeters(meters: number): string {
  return `${meters.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`;
}

/** Auswahlknöpfe wie die Sichtbarkeit zählen nicht als Textfeld – dort sollen Kürzel weiter gehen. */
function isTextInput(target: EventTarget | null): boolean {
  if (target instanceof HTMLInputElement) return !['radio', 'checkbox'].includes(target.type);
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

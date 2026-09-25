import { Container, Graphics, Text } from 'pixi.js';
import { findUnitType, type Organization } from '@tds/catalog';
import { SYMBOL_SIZE } from './hitTest';

// Taktische Zeichen, vereinfacht nach DV 102. Werden im Code gezeichnet (keine Bilddateien):
// keine Lizenzfragen, scharf bei jeder Bildschirmauflösung, neue Typen nur per Katalogeintrag.

interface SymbolColors {
  fill: number;
  stroke: number;
  text: number;
}

const COLORS: Record<Organization, SymbolColors> = {
  fire: { fill: 0xc8102e, stroke: 0x1a1a1a, text: 0xffffff },
  ems: { fill: 0xffffff, stroke: 0x1a1a1a, text: 0x1a1a1a },
};

/** Für Einheitentypen, die (noch) nicht im Katalog stehen. */
const UNKNOWN_COLORS: SymbolColors = { fill: 0xb0b0b0, stroke: 0x1a1a1a, text: 0x1a1a1a };

/**
 * Erzeugt das Zeichen für einen Einheitentyp. Mittelpunkt des Rechtecks ist (0|0),
 * damit Position und Drehung sich auf die Mitte beziehen.
 */
export function createUnitSymbol(unitType: string): Container {
  const definition = findUnitType(unitType);
  const colors = definition ? COLORS[definition.organization] : UNKNOWN_COLORS;
  const { width, height } = SYMBOL_SIZE;
  const left = -width / 2;
  const top = -height / 2;

  const shape = new Graphics();

  if (definition?.shape === 'vehicle') {
    // Zwei Räder unter dem Rechteck
    for (const x of [left + 10, -left - 10]) {
      shape.circle(x, -top + 4, 3.5).fill(colors.stroke);
    }
  }
  if (definition?.shape === 'team') {
    // Ein Punkt über dem Rechteck = Truppstärke
    shape.circle(0, top - 6, 3).fill(colors.stroke);
  }

  shape
    .rect(left, top, width, height)
    .fill(colors.fill)
    .stroke({ color: colors.stroke, width: 1.5 });

  const label = new Text({
    text: unitType,
    style: {
      fontFamily: 'system-ui, sans-serif',
      fontSize: 13,
      fontWeight: 'bold',
      fill: colors.text,
    },
  });
  label.anchor.set(0.5);

  const symbol = new Container();
  symbol.addChild(shape, label);
  return symbol;
}

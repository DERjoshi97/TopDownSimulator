# Projektplan: TopDownSimulator – digitales Planspiel für die Feuerwehr

## Ziel

Eine Anwendung, mit der Feuerwehr-Führungskräfte aller Ebenen (Gruppe, Zug, Verband) Einsatzsituationen als Planspiel üben können – in der Draufsicht (top-down), gesteuert durch eine Übungsleitung. Die Software unterstützt den Führungsvorgang (Lagefeststellung → Planung → Befehlsgebung), übernimmt Darstellung, Zeitführung und Dokumentation und ermöglicht eine strukturierte Nachbesprechung.

## Leitentscheidungen

| Frage         | Entscheidung                                                | Folge für die Architektur                                                                       |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Einsatzebenen | Langfristig alle (Gruppe → Verband)                         | Hierarchisches Einheitenmodell, Karte muss von Raum- bis Stadtteilmaßstab skalieren             |
| Spielform     | Erst ein Rechner/Beamer, später Mehrspieler                 | Spiellogik unabhängig von der Oberfläche; läuft im Browser **und** später auf dem Server        |
| Karten        | Erst selbstgebaute Übungsobjekte, später echte Karten (OSM) | Eigenes Koordinatensystem in Metern, optional georeferenziert                                   |
| Simulation    | Erst alles manuell, später Automatik und generierte Inhalte | Alle Änderungen laufen als Ereignisse durch eine zentrale Engine, an die später Regeln andocken |

## Architektur

### Kernidee: Befehle → Ereignisse → Zustand

Jede Änderung am Spiel (Fahrzeug bewegen, Feuer einspielen, Befehl geben) ist ein **Befehl** (Command). Die Engine prüft ihn und erzeugt daraus ein oder mehrere **Ereignisse** (Events), z. B. `EinheitVerschoben` oder `LageobjektHinzugefuegt`. Der aktuelle **Spielstand** ergibt sich aus allen Ereignissen der Reihe nach.

Warum das wichtig ist:

- **Einsatztagebuch** – die Ereignisliste _ist_ das Protokoll.
- **Nachbesprechung** – Ereignisse bis Zeitpunkt X abspielen = Lage zu Zeitpunkt X.
- **Mehrspieler** – der Server verteilt Ereignisse an alle Geräte; die Logik bleibt dieselbe.
- **Automatik** – Regeln reagieren auf Ereignisse („wenn Trupp Raum betritt → Person gefunden“) und erzeugen neue. Manuelle Einspielungen und automatische Reaktionen sind technisch dasselbe.
- **Rückgängig/Sichtbarkeit** – einfach umsetzbar, weil jede Änderung einzeln vorliegt.

### Bausteine

```
packages/
  engine/     Spiellogik: Datenmodell, Befehle, Ereignisse, Zustand, Regeln.
              Reines TypeScript, keine Oberfläche → im Browser und auf dem Server nutzbar.
  catalog/    Stammdaten als JSON: taktische Zeichen, Fahrzeugtypen, Einheitenarten.
apps/
  client/     Web-Oberfläche: Karte, Werkzeuge, Ansichten für Übungsleitung/Übende.
  server/     (Phase 2) Mehrspieler-Server, führt die Engine und verteilt Ereignisse.
docs/         Planung, Fachkonzept, Entscheidungen.
```

### Datenmodell (Grundzüge)

- **Szenario** – Karte + Ausgangslage + vorbereitete Einspielungen.
- **Karte** – Ebenen (Gelände, Gebäude, Grundrisse/Etagen, Infrastruktur wie Hydranten). Koordinaten in Metern.
- **Einheit** – hierarchisch (Verband → Zug → Gruppe/Staffel → Trupp), mit Fahrzeug, Stärke, Status (FMS), Position.
- **Lageobjekt** – Feuer, Rauch, Person, Gefahrstoff, Absperrung … mit Sichtbarkeit (nur Übungsleitung / erkundet / alle).
- **Taktisches Zeichen** – Darstellung von Einheiten und Lageobjekten nach DV 102 bzw. FwDV, katalogbasiert.
- **Befehl/Funkspruch** – strukturiert (Einheit – Auftrag – Mittel – Ziel – Weg) plus Freitext.
- **Einsatzuhr** – Übungszeit, pausierbar, beschleunigbar.

## Tech-Stack

| Bereich                   | Wahl                                               | Begründung                                                                          |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Sprache                   | **TypeScript**                                     | Eine Sprache für Oberfläche, Engine und Server; Typen fangen viele Fehler früh ab   |
| Laufzeit / Pakete         | **Node.js (LTS) + npm Workspaces**                 | Standard, ein Repository für alle Bausteine                                         |
| Oberfläche                | **React** + **Vite**                               | Verbreitet, gute Dokumentation, schneller Entwicklungsserver                        |
| Kartendarstellung         | **PixiJS** (WebGL)                                 | Performant auch bei vielen Objekten (Verbandsebene), Zoomen/Verschieben flüssig     |
| Echte Karten (später)     | **MapLibre GL** + OpenStreetMap                    | Freie Kartendaten; Pixi-Ebene liegt darüber, dank Meter-Koordinaten mit Georeferenz |
| Zustand in der Oberfläche | **Zustand** (Bibliothek)                           | Schlank, verbindet Engine-Zustand mit React                                         |
| Mehrspieler (später)      | **WebSockets** (Socket.IO)                         | Engine läuft serverseitig, Clients erhalten Ereignisse                              |
| Speicherung               | Anfangs JSON-Dateien, später **SQLite/PostgreSQL** | Szenarien und Übungsprotokolle                                                      |
| Tests                     | **Vitest**                                         | Engine-Logik gut testbar, weil ohne Oberfläche                                      |
| Automatik/KI (später)     | Regel-Engine + optional Claude API                 | Generierte Rückmeldungen, Szenario-Vorschläge                                       |

## Phasen

### Phase 0 – Grundgerüst

- Projektstruktur (Workspaces), TypeScript, Linting, Tests
- Leere Web-App startet mit `npm run dev`

### Phase 1 – Lokales Planspiel (ein Rechner/Beamer)

1. **Karte**: Zoomen, Verschieben, Raster/Maßstab
2. **Engine-Grundlage**: Befehle, Ereignisse, Zustand, Ereignisliste
3. **Taktische Zeichen**: Katalog (erste Auswahl: HLF, LF, TLF, DLK, ELW, RTW, Trupps), platzieren, verschieben, drehen
4. **Lageobjekte**: Feuer, Rauch, Person, Gefahrstoff, Absperrung
5. **Einfacher Karteneditor**: Gebäude (Rechtecke/Polygone), Straßen, Hydranten, Beschriftungen
6. **Einsatzuhr** und **Einsatztagebuch** (automatisch aus Ereignissen)
7. **Szenario speichern/laden** (JSON-Datei)
8. **Ansichten**: Übungsleitung (alles sichtbar) vs. Präsentationsmodus für den Beamer (nur Freigegebenes)

### Phase 2 – Mehrspieler

- Server mit Engine, Übungsräume mit Beitrittscode
- Rollen: Übungsleitung, Übende (je Führungsebene/Einheit), Beobachter
- Sichtbarkeit je Rolle (Fog of War / Erkundung)
- Befehle und Funkverkehr zwischen Rollen

### Phase 3 – Szenarien und Ebenen

- Vollständiger Szenario-Editor, Szenario-Bibliothek
- Grundrisse mit mehreren Etagen
- Hierarchische Einheiten, Einsatzabschnitte, Führungsstruktur für Zug und Verband
- Zeitgesteuerte Einspielungen (Drehbuch)

### Phase 4 – Nachbesprechung

- Wiedergabe mit Zeitstrahl, Sprungmarken, Anmerkungen
- Export Einsatztagebuch/Lagekarten als PDF

### Phase 5 – Automatik und echte Karten

- Regeln/Auslöser („wenn … dann …“)
- Simulationsmodule: Brand-/Rauchausbreitung, Wasserversorgung, Anfahrtszeiten
- Generierte Inhalte (z. B. Lagemeldungen, Szenarien per KI)
- Echte Karten über OpenStreetMap

## Festgelegt für Phase 1

- **Erster Katalog**: HLF, LF, TLF, DLK, ELW, RTW sowie Trupps (Angriffs-, Wasser-, Schlauchtrupp).
- **Beispielszenario**: Zimmerbrand im Mehrfamilienhaus, Gruppenebene.

## Offene Punkte

- Taktische Zeichen: Quelle/Lizenz der Symbole klären (z. B. frei verfügbare SVG-Sammlungen) oder selbst zeichnen.

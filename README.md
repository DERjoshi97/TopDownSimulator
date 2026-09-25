# TopDownSimulator

Digitales Planspiel für die Feuerwehr: Einsatzsituationen in der Draufsicht darstellen, taktische und strategische Entscheidungen üben, Übungen nachbesprechen.

Status: Phase 0 (Grundgerüst). Planung und Architektur: [docs/PLAN.md](docs/PLAN.md).

## Voraussetzungen

- [Node.js](https://nodejs.org) (LTS, ab Version 24)

## Loslegen

```sh
npm install     # einmalig: Abhängigkeiten installieren
npm run dev     # Web-App starten → http://localhost:5173
```

## Befehle

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklungsserver mit automatischem Neuladen |
| `npm test` | Tests einmal ausführen (`npm run test:watch` für Dauerbetrieb) |
| `npm run typecheck` | TypeScript-Typprüfung aller Pakete |
| `npm run lint` | Code auf typische Fehler prüfen (ESLint) |
| `npm run format` | Code einheitlich formatieren (Prettier) |
| `npm run check` | Typprüfung, Linting und Tests zusammen |
| `npm run build` | Produktionsversion nach `apps/client/dist` bauen |

## Aufbau

```
packages/engine/   Spiellogik ohne Oberfläche (läuft im Browser und später auf dem Server)
apps/client/       Web-Oberfläche (React + Vite)
docs/              Planung und Konzepte
```

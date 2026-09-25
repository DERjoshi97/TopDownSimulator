# Arbeitsablauf: Feature-Branches

Jedes Feature wird auf einem eigenen Branch entwickelt. `main` enthält immer einen lauffähigen Stand, auf dem `npm run check` fehlerfrei durchläuft.

## Ablauf

```sh
# 1. Aktuellen Stand holen und neuen Branch anlegen
git switch main
git pull
git switch -c feature/engine-core

# 2. Entwickeln und in kleinen Schritten committen
npm run check
git add -A
git commit -m "Add command and event types"

# 3. Branch hochladen und Pull Request öffnen
git push -u origin feature/engine-core
gh pr create --fill

# 4. Nach Durchsicht in main übernehmen und Branch löschen
gh pr merge --squash --delete-branch
git switch main
git pull
```

## Branch-Namen

| Präfix     | Wofür                                | Beispiel            |
| ---------- | ------------------------------------ | ------------------- |
| `feature/` | Neue Funktion                        | `feature/map-zoom`  |
| `fix/`     | Fehlerbehebung                       | `fix/clock-jumps`   |
| `docs/`    | Nur Dokumentation                    | `docs/unit-concept` |
| `chore/`   | Werkzeuge, Abhängigkeiten, Aufräumen | `chore/vite-update` |

Namen auf Englisch, klein geschrieben, mit Bindestrichen.

## Regeln

- **Ein Branch = ein Feature.** Lieber mehrere kleine Branches als einen großen. Ein Punkt aus Phase 1 in [PLAN.md](PLAN.md) kann in mehrere Branches zerfallen.
- **Vor jedem Commit** `npm run check` ausführen.
- **Commit-Nachrichten** auf Englisch, im Imperativ, erste Zeile kurz: „Add MoveUnit command“.
- **Sprache**: Alles, was Code oder Git betrifft (Typen, Funktionen, Dateien, Branches, Commits), ist englisch benannt. Doku und Kommentare sind deutsch. Fachbegriffe werden nach dem [Glossar](GLOSSARY.md) übersetzt.
- **Squash-Merge**: Beim Übernehmen in `main` werden alle Commits eines Branches zu einem zusammengefasst. So bleibt der Verlauf von `main` übersichtlich: ein Eintrag pro Feature.
- Nie direkt auf `main` committen.

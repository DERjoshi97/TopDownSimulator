# Arbeitsablauf: Feature-Branches

Jedes Feature wird auf einem eigenen Branch entwickelt. `main` enthält immer einen lauffähigen Stand, auf dem `npm run check` fehlerfrei durchläuft.

## Ablauf

```sh
# 1. Aktuellen Stand holen und neuen Branch anlegen
git switch main
git pull
git switch -c feature/engine-grundlage

# 2. Entwickeln und in kleinen Schritten committen
npm run check
git add -A
git commit -m "Befehle und Ereignisse als Typen anlegen"

# 3. Branch hochladen und Pull Request öffnen
git push -u origin feature/engine-grundlage
gh pr create --fill

# 4. Nach Durchsicht in main übernehmen und Branch löschen
gh pr merge --squash --delete-branch
git switch main
git pull
```

## Branch-Namen

| Präfix     | Wofür                                | Beispiel                     |
| ---------- | ------------------------------------ | ---------------------------- |
| `feature/` | Neue Funktion                        | `feature/karte-zoom`         |
| `fix/`     | Fehlerbehebung                       | `fix/uhr-springt`            |
| `docs/`    | Nur Dokumentation                    | `docs/fachkonzept-einheiten` |
| `chore/`   | Werkzeuge, Abhängigkeiten, Aufräumen | `chore/vite-update`          |

Namen klein, mit Bindestrichen, ohne Umlaute (`ae`, `oe`, `ue`, `ss`).

## Regeln

- **Ein Branch = ein Feature.** Lieber mehrere kleine Branches als einen großen. Ein Punkt aus Phase 1 in [PLAN.md](PLAN.md) kann in mehrere Branches zerfallen.
- **Vor jedem Commit** `npm run check` ausführen.
- **Commit-Nachrichten** auf Deutsch, im Imperativ, erste Zeile kurz: „Einheit verschieben als Befehl umsetzen“.
- **Squash-Merge**: Beim Übernehmen in `main` werden alle Commits eines Branches zu einem zusammengefasst. So bleibt der Verlauf von `main` übersichtlich: ein Eintrag pro Feature.
- Nie direkt auf `main` committen.

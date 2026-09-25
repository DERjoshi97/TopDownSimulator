# Glossar: Fachbegriffe im Code

Im Code, in Dateinamen, Branches und Commits wird englisch benannt, Doku und Kommentare sind deutsch. Damit ein Fachbegriff überall gleich heißt, gilt diese Tabelle. Neue Begriffe hier eintragen, bevor sie im Code auftauchen.

Fahrzeug- und Einheitenkürzel (HLF, LF, TLF, DLK, ELW, RTW …) bleiben unverändert.

## Engine (Technik)

| Deutsch              | Englisch im Code | Bedeutung                                                             |
| -------------------- | ---------------- | --------------------------------------------------------------------- |
| Befehl (technisch)   | `Command`        | Wunsch, den Spielstand zu ändern – wird geprüft und ggf. abgelehnt    |
| Ereignis             | `GameEvent`      | Tatsache, die passiert ist – unveränderlich, Grundlage des Protokolls |
| Spielstand / Zustand | `GameState`      | Ergebnis aller Ereignisse der Reihe nach                              |
| Prüfen               | `decide`         | Befehl + Zustand → Ereignisse oder Ablehnung                          |
| Anwenden             | `applyEvent`     | Zustand + Ereignis → neuer Zustand                                    |
| Ablehnung            | `Rejection`      | Grund, warum ein Befehl nicht ausgeführt wurde                        |
| Übungszeit           | `exerciseTime`   | Zeit seit Übungsbeginn in Millisekunden                               |

> **Achtung, Verwechslungsgefahr:** Der _Befehl im Feuerwehr-Sinn_ (Einheit – Auftrag – Mittel – Ziel – Weg) heißt im Code `Order`, nicht `Command`.

## Feuerwehr (Fachlich)

| Deutsch            | Englisch im Code    |
| ------------------ | ------------------- |
| Einheit            | `Unit`              |
| Einheitentyp       | `UnitType`          |
| Fahrzeug           | `Vehicle`           |
| Trupp              | `Team`              |
| Staffel            | `Squad`             |
| Gruppe             | `Section`           |
| Zug                | `Platoon`           |
| Verband            | `Formation`         |
| Führungsebene      | `CommandLevel`      |
| Stärke             | `Strength`          |
| Fahrzeugstatus/FMS | `radioStatus`       |
| Befehl (Feuerwehr) | `Order`             |
| Funkspruch         | `RadioMessage`      |
| Lage               | `Situation`         |
| Lageobjekt         | `SituationObject`   |
| Taktisches Zeichen | `TacticalSymbol`    |
| Einsatzabschnitt   | `Sector`            |
| Erkundung          | `Reconnaissance`    |
| Absperrung         | `Cordon`            |
| Gefahrstoff        | `HazardousMaterial` |
| Hydrant            | `Hydrant`           |

## Übung

| Deutsch                   | Englisch im Code   |
| ------------------------- | ------------------ |
| Planspiel / Übung         | `Exercise`         |
| Szenario                  | `Scenario`         |
| Übungsleitung             | `Director`         |
| Übende                    | `Trainee`          |
| Beobachter                | `Observer`         |
| Einspielung               | `Inject`           |
| Einsatzuhr                | `ExerciseClock`    |
| Einsatztagebuch           | `Logbook`          |
| Nachbesprechung           | `Debriefing`       |
| Karte                     | `Map`              |
| Präsentationsmodus/Beamer | `PresentationView` |

## Katalog

| Deutsch                       | Englisch im Code     |
| ----------------------------- | -------------------- |
| Katalog / Stammdaten          | `Catalog`            |
| Einheitentyp (Katalogeintrag) | `UnitTypeDefinition` |
| Grundzeichen                  | `SymbolShape`        |
| Organisation                  | `Organization`       |
| Feuerwehr (Organisation)      | `fire`               |
| Rettungsdienst (Organisation) | `ems`                |
| Werkzeug (Oberfläche)         | `Tool`               |

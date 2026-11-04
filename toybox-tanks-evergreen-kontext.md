# Toybox Tanks – dauerhafter Spiel- und Designkontext

## Zweck und Verbindlichkeit

Dauerhafte Grundlage für Feature- und Designdiskussionen, kein Nachweis des Implementierungsstands.

Grundlage ist das Projekt-Handoff. Für exakte Parameter, Darstellung und Sonderfälle bleibt der originale HTML-Prototyp maßgeblich. Zahlen nicht schätzen; Änderungen am Spielgefühl ausdrücklich als Designentscheidung behandeln.

## 1. Identität und Prioritäten

Toybox Tanks ist ein kleines, zugängliches Browser-Panzerspiel mit gemeinsamem Bildschirm und lokalem Couch-Koop für zwei Personen; Solo ist ebenfalls vorgesehen. Ziel: kleines fertiges Spiel, keine Engine.

Gestaltung: Spielzeugpanzer auf warmer Tischoberfläche, Holzblöcke als Deckung, klare Silhouetten und lesbare Flugbahnen. Alle Inhalte bleiben eigenständig.

Prioritäten:
1. Angenehmes, zuverlässiges lokales Zweispielerspiel.
2. Verständliche Geschosse, Deckung und gezielte Einmal-Abpraller.
3. Fehlertoleranter Raumfortschritt und unkompliziertes Wiederholen.
4. Lesbare Spielzeugoptik auf unterschiedlichen Bildschirmgrößen.
5. Kleine, testbare Systeme; leicht editierbare Karten/Einstellungen.
6. Zusätzliche Inhalte erst auf abgesicherter bestehender Spielerfahrung.

Features sollen Kooperation, Lesbarkeit und Zugänglichkeit stärken, nicht Komplexität maximieren.

## 2. Plattform, Darstellung und Eingabe

- Browser ist die Zielplattform, Desktop-Tastaturspiel Pflicht. Optionale Unterstützung zweier Gamepads erhalten; Gerätekompatibilität nur nach tatsächlichen Tests behaupten.
- Gemeinsame Arena mit festen logischen Koordinaten. Breite Displays zeigen keinen zusätzlichen Spielbereich. Seitenverhältnis, Letterboxing und DPR-gerechte Canvas-Auflösung erhalten.
- Prozedurale Canvas-Grafik; blaue/orange Spieler, Gegner, Turmrichtung, HUD, Trefferfeedback und Ziel-/Abprallhilfen klar unterscheiden.
- Freie 2D-Bewegung statt realistischer Panzerlenkung; diagonale Bewegung normalisieren.
- Turm unabhängig drehen; Zielrichtung nach Loslassen beibehalten.
- P1: WASD Bewegung, Q/E Turm, F Feuer. P2: Pfeiltasten Bewegung, Komma/Punkt Turm, Enter Feuer.
- Escape pausiert/setzt fort; R wiederholt nach Niederlage.
- Fokusverlust/versteckter Tab pausieren und löschen gehaltene Eingaben. Keine klemmenden Tasten nach Fortsetzung.

## 3. Kampf- und Kooperationskern

### Treffer und Bewegung
- Spielergeschosse treffen ausschließlich Gegner; Gegnergeschosse ausschließlich Spieler. Kein Friendly Fire und keine Geschoss-Geschoss-Kollision.
- Normale Geschosse haben genau einen Wandabpraller; der nächste Wandkontakt entfernt sie.
- Schadensverursachender Panzertreffer verbraucht das Geschoss. Verhalten bei Kontakt mit temporär unverwundbaren Panzern am Original prüfen und erhalten.
- Standard: drei aktive Geschosse pro Spieler. Geschosslimit und Feuer-Cooldown sind unabhängige Beschränkungen.
- Wände blockieren Panzer; Panzer blockieren und schieben einander nicht.

### Überleben und Ablauf
- Standard: zwei Lebenspunkte je Spieler und Raum, kurze Unverwundbarkeit nach Treffer und sichtbares Trefferfeedback.
- Ausgeschaltete Spieler bleiben sichtbar deaktiviert bis zum Raumabschluss.
- Ein Überlebender kann den Raum beenden; im nächsten Raum werden beide Koop-Spieler wiederhergestellt.
- Koop hat zwei tatsächliche Spielerentitäten, Solo genau eine. Niederlage berücksichtigt nur vorhandene Spieler.
- Sind alle Spieler ausgeschaltet, folgt Niederlage. Bei gleichzeitigem letztem Gegner- und Spielertod hat Niederlage Vorrang.
- Ergebnis genau einmal festlegen, Kampf stoppen, verbleibende Geschosse entfernen.
- Ablauf: Menü, Solo/Koop, Pause, Neustart, Raumwechsel, Niederlage/Retry, Abschluss/Replay.
- Neustart setzt Entitäten, IDs, Timer, Geschosse, Effekte, Ergebnis und Eingabeadapter einschließlich geräteübergreifender Freigabesperren vollständig zurück.

## 4. Gegner und Karten

Bestehende Gegner sind stationäre Geschütztürme: Sie verfolgen sichtbare lebende Spieler, drehen sich allmählich, kündigen Schüsse an und feuern nur bei freier Sichtlinie. Zielwahl, Drehgeschwindigkeit, Ladeabbruch, Cooldowns und Geschossverhalten erhalten. Kein bestehendes vorausschauendes Abprall-Zielen; keine Schüsse durch Wände.

Originale Räume:
- First Bounce: zwei Gegner.
- Block Party: drei Gegner.
- Together Through: vier Gegner.

Sieg im dritten Raum führt zum Abschluss; Replay beginnt im ersten Raum. 

Karten bleiben editierbare Textgitter mit kleinen Metadatenobjekten und gemeinsamer Lade-/Simulationslogik. Dimensionen, Symbole, Rand, Spawns, Gegnerdaten und bestehende Erreichbarkeitsregeln validieren. Fehlerhafte Karten erzeugen auch beim ersten Start hilfreiche, stabile Fehleranzeigen statt Rendering-Abstürzen.

## 5. Physik und technische Leitplanken

- Fester Simulationszeitschritt, getrennt vom Rendering. Angesammelte Zeit nach Unterbrechungen und Aufholschritte begrenzen.
- Kreisbasierte Panzerkollision und Gleiten an Wänden erhalten.
- Gesamten Geschossweg prüfen, nicht nur die Endposition: frühester Treffer, Oberflächennormale, Restweg nach Reflexion und kleiner Abstand zur Oberfläche.
- Auch den Weg zur Mündung prüfen; keine Geschosse hinter naher Deckung erzeugen.
- Verarbeitung begrenzen; Ecken und mehrdeutige Kontakte sicher terminieren. Konservative Eckbehandlung des Originals nicht beiläufig ersetzen.
- Simulation besitzt expliziten Weltzustand und erhält Zeit/Befehle als Eingabe. Kein DOM, Node-Zugriff, Geräte-Polling, Zeichnen, Echtzeitlesen oder Scheduling darin.
- Eingabeadapter liefern Befehle; Rendering liest und verändert Gameplay nicht; UI enthält keine zweite Kampf-/Fortschrittslogik. Anwendungsschicht orchestriert.
- IDs/Timer gehören zum zurücksetzbaren Weltzustand. Gameplay-Zufall nur bei Bedarf, dann reproduzierbar injiziert und zurückgesetzt.
- Gleiche Ausgangslage/Befehle ergeben reproduzierbare Zustände im unterstützten Runtime-Kontext; keine Zusage plattformübergreifender Float-Deterministik.
- Kleine Module und einfache Daten/Funktionen; keine spekulative Infrastruktur.

Kein beiläufiger Engine-/Frameworkwechsel. Releases: statisch hostbare Version und eingebettete Einzel-HTML, per file:// ohne Server/externe Ressourcen spielbar.

## 6. Anforderungen an Änderungen und Nachweise

- Bestehendes Verhalten und Darstellung bewahren, außer eine Änderung wird bewusst beschlossen. Echte Fehler mit reproduzierbarem Test und kleinstem begründeten Fix behandeln.
- Jede Mechanik zusammen mit Deckung, Treffern, Kooperation, Raumabschluss, Pause und vollständigem Reset betrachten.
- Kritische Kollisionen, Trefferzuordnung, gleichzeitige Todesfälle, Kartenfehler, Reset und reproduzierbare Abläufe gezielt testen. Coverage ersetzt keine aussagekräftigen Fälle.
- Echte Eingaben und Echtzeitbetrieb zusätzlich zu kontrolliertem Simulations-Stepping prüfen.
- Visuelle Referenzen bewusst prüfen; erfolgreiche Tests beweisen keine gute Ästhetik.
- Synthetische Gamepadtests sind keine Hardwaretests; automatisiertes WebKit beweist keine reale Safari-/iOS-Kompatibilität.
- Prüfungen nicht still abschwächen. Nicht geprüfte oder blockierte Anforderungen ehrlich kennzeichnen.

## 7. Erweiterungsideen – noch keine fertigen Regeln

Zurückgestellt: bewegliche/taktische Gegner; temporäre, distanzbasiert erzeugte und verblassende Fahrspuren; schnellere nicht abprallende Raketen; Kontakt-/Fernzündminen; zerstörbare korkartige Blöcke; Audio; weitere Räume.

Bisherige Leitideen für spätere Entwürfe:
- Normale Abprallgeschosse und ihre taktische Rolle erhalten.
- Gegnerzustände und Gefahren lesbar halten.
- Materialdarstellung und Kollisionsverhalten unterscheiden.
- Geländeänderungen einheitlich für Bewegung, Geschosse, Sichtlinien und gegebenenfalls Navigation wirksam machen.
- Auch neue Waffen ohne Friendly Fire entwerfen.
- Explosionen und Kettenreaktionen in ihrer Verarbeitung begrenzen.

Leitideen sind keine fertige Spezifikation. Bestehende Regel, Regelwechsel, offene Option und belegten Implementierungsstand klar trennen.

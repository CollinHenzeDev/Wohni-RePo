# Wohni Writer

Eine Textverarbeitung nach dem Vorbild von **Microsoft Word (Desktop-App)**, die komplett im **Browser** läuft –
ohne Server, ohne Anmeldung, ohne Installation. Deine Dokumente verlassen den Browser nicht.

* Öffnet vorhandene **Word-Dateien (.docx)** und speichert sie wieder als `.docx` **auf deinem Rechner**
* Ribbon-Oberfläche mit den Registerkarten *Start, Einfügen, Entwurf, Layout, Verweise, Überprüfen, Ansicht*
* **Zweispaltige Seiten für den Lebenslauf**: *Links* (linke Spalte schmaler) und *Rechts* (rechte Spalte schmaler)
* **Formen, Bilder und Textfelder hinter den Text legen**, ohne dass sich der Text verändert

## Starten

Es gibt nichts zu installieren und keinen Build-Schritt.

1. Dieses Repository herunterladen oder klonen.
2. Die Datei **`index.html`** per Doppelklick im Browser öffnen (Chrome, Edge, Firefox oder Safari – jeweils aktuell).

Alternativ mit einem lokalen Server: `python3 -m http.server 8080` und dann <http://localhost:8080> öffnen.

> **Hinweis zum Speichern:** In Chrome und Edge öffnet *Speichern* den Dateidialog deines Rechners (Ordner und Name frei
> wählbar, weiteres *Speichern* überschreibt dieselbe Datei). In Firefox und Safari wird die `.docx` in den
> Downloads-Ordner geladen.

## Lebenslauf mit zwei Spalten

* **Layout → Spalten → „Links“**: linke Spalte schmal (z. B. Kontakt, Sprachen, Kenntnisse), rechte Spalte breit.
* **Layout → Spalten → „Rechts“**: rechte Spalte schmal, linke breit.
* Mit **Strg + Umschalt + Eingabe** (Spaltenumbruch) springst du in die nächste Spalte.
* **Layout → Spalten → Weitere Spalten …**: Spaltenbreiten in cm, Abstand, Trennlinie und eine **Hintergrundfarbe pro Spalte**
  (die farbige Seitenleiste reicht auf Wunsch bis zum Seitenrand). Mit „Auf Folgeseiten nur die breiteste Spalte verwenden“
  läuft ein langer Lebenslauf auf Seite 2 nur in der Hauptspalte weiter.
* **Datei → Neu** enthält fertige Vorlagen: *Lebenslauf – schmale linke Spalte*, *Lebenslauf – schmale rechte Spalte*,
  Brief, Bericht und Newsletter.
* Die Spalten werden in der `.docx` als echte Word-Spalten (`w:cols`, auch ungleich breit) gespeichert; die farbigen
  Seitenleisten als Formen in der Kopfzeile. Beides öffnet sich in Word und LibreOffice so, wie es im Editor aussieht.

## Formen und Bilder hinter den Text legen

* **Einfügen → Formen / Textfeld / Bilder**.
* Objekt anklicken (auch **hinter** dem Text: auf eine Stelle klicken, an der kein Text steht) und dann
  **Textumbruch → „Hinter den Text“** wählen – oder per **Rechtsklick → Textumbruch**.
* Weitere Umbrüche: *Mit Text in Zeile*, *Quadrat*, *Oben und unten*, *Vor den Text*.
* Verschieben mit der Maus (Pfeiltasten: 1 px, mit Umschalt 10 px), Größe und Drehen über die Anfasser,
  Füllung/Kontur/Schatten und Reihenfolge in der Registerkarte *Formformat*; der **Auswahlbereich** listet alle Objekte.
* Objekte hinter dem Text beeinflussen den Textfluss nicht – der Text wird weder verschoben noch umbrochen.

## Funktionen

| Bereich | Umfang |
| --- | --- |
| Text | Schriftart, -größe, Fett/Kursiv/Unterstrichen/Durchgestrichen, Hoch-/Tiefgestellt, Farben, Hervorhebung, Groß-/Kleinschreibung, Format übertragen |
| Absatz | Ausrichtung, Blocksatz, Einzüge, Zeilen-/Absatzabstand, Rahmen, Schattierung, Tabulatoren, Aufzählungen und Nummerierungen (mehrstufig) |
| Formatvorlagen | Standard, Überschrift 1–3, Titel, Untertitel, Zitat, Beschriftung u. a., Navigationsbereich, Inhaltsverzeichnis |
| Einfügen | Tabellen (verbinden/teilen, Rahmen, Schattierung, Spaltenbreite per Maus), Bilder, Formen, Textfelder, Links, Symbole, Datum, Linie, Seiten-/Spalten-/Abschnittsumbruch |
| Seite | Papierformate, Hoch-/Querformat, Ränder, Spalten, Kopf-/Fußzeile (erste Seite anders), Seitenzahlen, Wasserzeichen, Seitenrand, Seitenfarbe |
| Prüfen | Rechtschreibprüfung des Browsers, Suchen & Ersetzen, Wörter zählen |
| Ansicht | Drucklayout/Weblayout, Lineal (Ränder, Einzüge, Tabulatoren), Zoom, Navigationsbereich, Formatierungszeichen, dunkler Modus |
| Dateien | `.docx` öffnen/speichern/einfügen, `.txt`, `.html`, Drag & Drop, Drucken/PDF, automatische Zwischenspeicherung |

Tastenkürzel siehe *Hilfe* in der Registerkartenleiste (Strg+S, Strg+Z/Y, Strg+F/H, Strg+B/I/U, Strg+E/L/R/J …).

### Nicht enthalten

Kommentare, „Änderungen nachverfolgen“, Gleichungseditor, SmartArt/Diagramme (werden beim Import als Platzhalter angezeigt),
Fußnoten (beim Import als Text am Dokumentende), Serienbriefe, Makros und das alte `.doc`-Format.
Schriftarten stammen vom System; nicht installierte Schriften werden durch ähnliche ersetzt.

## Aufbau

```
index.html          Seitengerüst, lädt die Skripte (klassische <script>-Tags, läuft auch per file://)
css/doc.css         Dokumentdarstellung (Typografie, Listen, Tabellen, Objekte) – auch für den Druck
css/app.css         Oberfläche (Ribbon, Menüs, Dialoge, Statusleiste, dunkler Modus)
js/layout.js        Seitenumbruch-Engine: Seiten, Spalten, Textumfluss, weiche Teilung von Absätzen/Tabellen
js/selection.js     Cursor/Auswahl unabhängig vom DOM-Umbau (nötig wegen der Layout-Engine)
js/history.js       Rückgängig/Wiederholen (Schnappschüsse)
js/format.js        Formatierung, Formatvorlagen, Zwischenablage      js/lists.js    Listen als Absatzattribute
js/tables.js        Tabellen                                          js/floats.js   Formen/Bilder/Textfelder
js/docx-*.js        DOCX lesen/schreiben (js/zip.js: eigener ZIP-Leser/-Schreiber)
js/ribbon.js, dialogs.js, commands.js, ruler.js, find.js, files.js, templates.js, app.js
tests/              Browser-Tests (Playwright)
docs/adr/           Architekturentscheidungen;  CONTEXT.md: Begriffe
```

## Tests

Die Tests steuern einen echten Chromium-Browser per Playwright und prüfen Tippen, Formatieren, Tabellen, Spalten,
Objekte hinter dem Text, Dialoge, Drucken, Speichern/Öffnen sowie den DOCX-Roundtrip:

```
node tests/run-all.js            # alle Tests
node tests/features.js           # einzelne Tests
```

Voraussetzung: Node.js ≥ 18 und `playwright` (`npm i -g playwright`, Chromium vorhanden bzw. `npx playwright install chromium`).
Optional lassen sich exportierte Dateien mit LibreOffice (`soffice --convert-to pdf`) gegenprüfen.

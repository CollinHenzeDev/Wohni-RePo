# 0001 – Flacher contenteditable-Fluss, Seiten per Transform

**Status:** angenommen

## Kontext
Eine Textverarbeitung braucht echte Seiten, Spalten (auch ungleich breit) und Objekte, die sich hinter den Text legen lassen.
Der Browser kennt auf dem Bildschirm keine Seitenumbrüche. Die gängigen Wege sind: pro Seite ein eigenes `contenteditable`
(Auswahl/Kopieren über Seiten hinweg kaputt), eine komplett eigene Layout- und Eingabe-Engine auf `canvas`
(sehr groß, Rechtschreibung/IME/Zugänglichkeit müssten nachgebaut werden) oder CSS-Multicolumn (nur gleich breite
Spalten, horizontal statt vertikal).

## Entscheidung
Der gesamte Text liegt in **einem** `contenteditable` (`#flow`). Eine Layout-Engine misst die Blöcke, weist jedem Block
ein Segment (Seite, Spalte) zu und verschiebt ihn per CSS-`transform: translate()` plus `max-width`. Absätze und Tabellen,
die eine Segmentgrenze überschreiten, werden an einer Zeilen- bzw. Zeilengrenze **weich geteilt** (`data-cont`).
Diese Teilungen werden vor jeder strukturellen Bearbeitung, vor Snapshots, Kopieren und Export wieder zusammengeführt.
Der Cursor wird über logische Zeichenpositionen gesichert (`js/selection.js`), nicht über DOM-Knoten.

## Folgen
* Native Eingabe, Auswahl über Seiten, Rechtschreibprüfung und IME funktionieren weiter.
* Ungleich breite Spalten, Spaltenumbrüche und Textumfluss um Objekte sind „nur“ Geometrie in der Engine.
* Vor/nach Strukturänderungen muss `W.layout.beginEdit()` bzw. `W.edit()` verwendet werden.
* Ein Layoutlauf ist O(Blöcke); für sehr große Dokumente ist er das Hauptkostenfeld (80 Seiten ≈ 220 ms).

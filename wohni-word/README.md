# Wohni Word

Eine Textverarbeitung im Stil von Microsoft Word, die komplett im Browser läuft – ohne Server, ohne Konto, ohne Installation.
Vorhandene **.docx-Dateien lassen sich öffnen** und Dokumente werden als **.docx auf deinem Rechner gespeichert**.

## Starten

* **Einfachste Variante:** die Datei `wohni-word.html` im Browser öffnen (Doppelklick). Sie ist eigenständig und funktioniert auch offline.
* **Aus dem Ordner:** `index.html` öffnen oder einen beliebigen statischen Server starten, z. B.
  `python3 -m http.server 8000` im Ordner `wohni-word` und dann <http://localhost:8000> aufrufen.

Empfohlen: Chrome oder Edge. Dort wird „Speichern" direkt in die geöffnete Datei geschrieben (Dateidialog des Systems).
In Firefox und Safari wird beim Speichern die .docx-Datei in den Download-Ordner heruntergeladen.

## Funktionen

| Bereich | Umfang |
|---|---|
| **Datei** | Neu, Öffnen (.docx, .html, .txt, .md; auch per Drag & Drop), Speichern / Speichern unter (.docx), Export als HTML und Text, Drucken / PDF, automatischer Entwurf (lokal im Browser) |
| **Start** | Schriftart, Schriftgrad (frei wählbar), Fett / Kursiv / Unterstrichen / Durchgestrichen, Hoch- und Tiefgestellt, Schrift- und Hervorhebungsfarbe, Groß-/Kleinschreibung, Format übertragen, Formatierung löschen, Aufzählungen und Nummerierungen (Punkt, Kreis, Quadrat, 1. a. A. i. I.), Mehrfach-Verschachtelung, Einzüge, Ausrichtung (links, zentriert, rechts, Blocksatz), Zeilen- und Absatzabstand, Absatzschattierung, Formatvorlagen (Standard, Titel, Untertitel, Überschrift 1–3, Zitat), Suchen & Ersetzen, Formatierungszeichen |
| **Einfügen** | Seitenumbruch, Tabellen, Bilder (Datei, Einfügen aus der Zwischenablage, Drag & Drop; Größe per Ziehen), Text aus Datei, Trennlinie, Links, Inhaltsverzeichnis, Kopf- und Fußzeile, Seitenzahl, Datum/Uhrzeit, Sonderzeichen |
| **Tabelle** (erscheint in Tabellen) | Zeilen/Spalten einfügen und löschen, Zellen verbinden und teilen, Zellfarbe, Rahmenlinien, vertikale Ausrichtung |
| **Layout** | Papierformat (A3, A4, A5, Letter, Legal), Hoch-/Querformat, Ränder, Spalten |
| **Überprüfen** | Rechtschreibprüfung (Browser), Sprache, Wortzählung |
| **Ansicht** | Zoom, Lineal, Formatierungszeichen, dunkles Design, Vollbild |

Tastenkürzel (u. a. `Strg+S`, `Strg+O`, `Strg+F`, `Strg+H`, `Strg+K`, `Strg+Enter` für Seitenumbruch) stehen im Hilfe-Dialog (`?` oben rechts).

## Was beim .docx-Import/-Export erhalten bleibt

Absatz- und Zeichenformatierung, Überschriften, Listen (verschachtelt, nummeriert), Tabellen (inkl. verbundener Zellen und Zellfarben), Bilder,
Hyperlinks, Seitenumbrüche, Seitengröße/-ränder/-spalten, Kopf- und Fußzeile (inkl. Seitenzahl). Die erzeugten Dateien öffnen in Word, LibreOffice und Google Docs.

**Grenzen:** Kommentare, Änderungsverfolgung, Fußnoten, Formeln, Textfelder, Diagramme/SmartArt und Formen werden beim Öffnen übersprungen.
Altes Binärformat `.doc` sowie `.odt`/`.rtf` kann nicht gelesen werden (in Word/LibreOffice als .docx speichern).
Im Editor wird fortlaufend auf einer langen „Seite" geschrieben; die Seitenanzahl ist eine Schätzung und echte Seitenumbrüche entstehen beim Drucken bzw. in Word.

## Entwicklung

```
wohni-word/
  index.html   Oberfläche (Menüband, Statusleiste)
  style.css    Aussehen inkl. Druckformat
  app.js       Editor-Logik (Befehle, Verlauf, Tabellen, Suchen, Dateien)
  docx.js      .docx lesen und schreiben (JSZip, kein Build-Schritt)
  lib/         JSZip (MIT)
  build-single.js   erzeugt wohni-word.html (alles in einer Datei): node build-single.js
  tests/       Playwright-Tests (Server auf Port 8765 nötig: python3 -m http.server 8765)
```

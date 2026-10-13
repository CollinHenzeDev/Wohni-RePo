# 0002 – Kein Build-Schritt, klassische Skripte

**Status:** angenommen

Die App soll per Doppelklick auf `index.html` laufen (auch über `file://`). ES-Module werden dort von Browsern blockiert,
daher gibt es klassische `<script>`-Tags und einen globalen Namespace `W`. Es gibt keine Laufzeitabhängigkeiten:
ZIP (`js/zip.js`) nutzt `CompressionStream`/`DecompressionStream`, DOCX wird selbst gelesen und geschrieben.
Nachteil: Reihenfolge der Skripte in `index.html` ist relevant; Typprüfung gibt es nicht.

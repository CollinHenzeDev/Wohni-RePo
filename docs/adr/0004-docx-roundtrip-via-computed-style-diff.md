# 0004 – DOCX-Format über Differenz zur eigenen Darstellung

**Status:** angenommen

Import und Export vergleichen Formatierung mit der **eigenen CSS-Darstellung** des jeweiligen Absatztyps (Messung an einem
unsichtbaren Probe-Element). Nur Abweichungen werden als Inline-Stil (Import) bzw. direkte Formatierung (Export) geschrieben.
Die Formatvorlagen in `styles.xml` werden aus denselben Messwerten erzeugt, sodass Word und der Editor dasselbe zeigen.
Vorteile: kleines HTML, saubere `.docx`, robust gegenüber beliebigem eingefügtem HTML. Nachteil: Der Export braucht das
Browser-DOM (kein Node-Betrieb).

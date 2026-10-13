# Wohni Writer – Begriffe

Einheitliche Wörter für Code, Tests und Doku. Maße werden intern in **CSS-Pixeln bei 96 dpi** gehalten.

| Begriff | Bedeutung |
| --- | --- |
| **Dokument** (`W.doc`) | Das Modell: Seiteneinrichtung, Spalten, Kopf-/Fußzeile, freie Objekte, Ansicht. Der Fließtext liegt als HTML in `#flow`. |
| **Fluss** (`#flow`) | Ein einziges `contenteditable`-Element mit allen **Blöcken** (Absatz `p`, `h1–h6`, `table`, Umbruch `p.brk`). Kein Seitencontainer im DOM. |
| **Block** | Direktes Kind des Flusses. Wird von der Layout-Engine per `transform` auf seine **Seite/Spalte** geschoben. |
| **Segment** | Ein Platz, in den Blöcke laufen: eine Spalte auf einer Seite (bei Textumfluss in Teilstücke zerlegt). |
| **Weiche Teilung** (`data-cont`) | Ein Absatz/eine Tabelle, die über eine Segmentgrenze reicht, wird in Kopf und **Fortsetzung** geteilt und vor jeder Bearbeitung/Speicherung wieder vereint. |
| **Spaltenvorlage** | *Eine, Zwei, Drei, Links, Rechts*. „Links“ = linke Spalte schmaler, „Rechts“ = rechte Spalte schmaler. |
| **Hauptspalte-Modus** (`cols.mainOnly`) | Ab Seite 2 wird nur die breiteste Spalte gefüllt (Lebenslauf mit Seitenleiste). |
| **Abschnittsumbruch** (`p.brk[data-brk=sect]`) | Marker, ab dem eine neue Spaltenkonfiguration gilt (fortlaufend oder neue Seite). |
| **Freies Objekt** (`Float`) | Form, Bild oder Textfeld mit Seite + Position. Lebt in einer Ebene **hinter** (`behind`) oder **vor** (`front`) dem Text, oder verdrängt ihn (`square`, `topbottom`). |
| **Textumbruch** | Eigenschaft `wrap` eines Objekts: `inline` (Bild im Text), `square`, `topbottom`, `behind`, `front`. |
| **Wiederholtes Objekt** (`repeat`) | Objekt aus der Kopfzeile, das auf jeder Seite erscheint (z. B. farbige Seitenleiste). |
| **Listenabsatz** | Absatz mit `data-list="b|n"`, `data-lvl`, `data-lid`; die Marke (`data-mark`) wird berechnet, nicht gespeichert. |
| **Tabulator-Zeichen** (`.tabc`) | Tabulator in einem Absatz mit eigenen Tabstopps (`data-tabs`); seine Breite setzt die Layout-Engine. |
| **Snapshot** | Ein Schritt der Rückgängig-Historie: bereinigtes HTML + Modell + Cursor. |

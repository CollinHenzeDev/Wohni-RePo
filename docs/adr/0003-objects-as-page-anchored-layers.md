# 0003 – Freie Objekte sind seitenfest und liegen in Ebenen

**Status:** angenommen

Formen, Bilder und Textfelder gehören zu einer **Seite** und haben eine Position in Seitenkoordinaten. Sie liegen in einer
eigenen Ebene unter (`behind`) oder über (`front`) dem Fluss und sind nicht Teil des Textflusses; deshalb ändert „Hinter
den Text“ den Text nicht. Objekte hinter dem Text werden per Trefferprüfung ausgewählt (Klick ohne Text darunter).
`square`/`topbottom` werden als Hindernisse in die Segmentbildung der Layout-Engine eingerechnet.
Beim DOCX-Export werden Objekte als `wp:anchor` (relativ zur Seite) an einen Absatz der jeweiligen Seite gehängt; beim
Import wird der Anker nach dem ersten Layout in Seite + Position aufgelöst. Objekte aus Kopfzeilen werden `repeat`.
Nachteil: Wandert ein Objekt wegen Textänderungen auf eine andere Seite im Layout, bleibt es seiner Seite treu (wie
„Position auf der Seite fixieren“ in Word).

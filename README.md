# Wohni-Spiele

Gemeinschaftsspiele für den Handy-Browser. Ein Gerät startet den Server, alle
anderen öffnen die angezeigte Adresse und treten mit einem Raum-Code bei.
Eine App-Installation ist nicht nötig.

## Starten

Voraussetzung ist [Node.js](https://nodejs.org) ab Version 22.6.

```bash
npm install
npm start
```

Der Server zeigt beim Start seine Adressen an:

```
Wohni-Spiele läuft auf Port 3000
  Auf diesem Gerät:  http://localhost:3000
  Im WLAN/Netzwerk:  http://192.168.1.23:3000
```

- **Laptop als Server:** Alle Handys im selben WLAN öffnen die Adresse unter
  „Im WLAN/Netzwerk“. Fragt die Firewall nach, muss man den Zugriff für Node.js erlauben.
- **Eigener Server:** Genauso starten. Einen anderen Port stellt man mit `PORT=8080 npm start` ein.
  Hinter einem Reverse-Proxy (z. B. Caddy oder nginx) müssen WebSockets durchgereicht werden.

In der Lobby wählt der Gastgeber das Spiel über Kacheln und kann Mitspieler entfernen (✕) oder
die Gastgeber-Rolle übergeben (👑).

Einem Raum tritt man über den 4-stelligen Code bei oder über einen Link wie
`http://…:3000/?raum=ABCD`. Nach einem Neuladen der Seite oder einem kurzen
Verbindungsabbruch landet man automatisch wieder im laufenden Spiel.

> Räume liegen nur im Speicher. Startet man den Server neu, sind laufende Spiele weg.

## Entwickeln

```bash
npm test          # Regeltests
npm run typecheck
```

- `server/index.ts`: HTTP- und WebSocket-Server
- `server/rooms.ts`: Räume, Beitreten, Wiedereinstieg, Spielstart; gilt für alle Spiele gleich
- `server/games/<spiel>/logic.ts`: Die Regeln eines Spiels als reine Zustandsmaschine (`Game`-Schnittstelle in `server/games/types.ts`)
- `server/games/registry.ts`: Hier wird ein neues Spiel eingetragen
- `public/`: Oberfläche ohne Build-Schritt, `public/games/<spiel>.js` zeichnet ein Spiel
- `public/audio.js`: Töne und Musik, direkt im Browser erzeugt (keine Audiodateien)

## Spiele

### Würfel-Blackjack

- Jeder hat **4 Leben**. Wer 3 davon verloren hat und nur noch 1 Leben hat, ist **Schwimmer**
  und wird klein in Blau unter seinem Männchen so angezeigt. Gewinnt er wieder ein Leben, ist er es nicht mehr.
- Pro Runde ist man reihum am Zug und hat **maximal 3 Würfelversuche**. Bei jedem Versuch
  wählt man **1, 2 oder 3 Würfel**, die Augen werden addiert. Man muss mindestens einmal
  würfeln und kann dann jederzeit stehen bleiben; nach dem 3. Versuch bleibt man automatisch stehen.
- Wer über **21** kommt, hat sich **überkauft** und ist sofort mit dem Zug fertig:
  - 22–23 Augen kosten **1 Leben**
  - 24–26 Augen kosten **2 Leben**
  - ab 27 Augen kosten **3 Leben**
- Wer **genau 21** trifft, gewinnt **1 Leben** dazu (gedeckelt auf die 4 Start-Leben).
- Von den übrigen Spielern (weder überkauft noch genau 21) verliert die **niedrigste Summe**
  ein Leben, bei Gleichstand alle mit dieser Summe.
- Würden dadurch alle verbleibenden Spieler gleichzeitig ausscheiden, zählt die Runde nicht.
- Leben werden als bis zu 3 Herzen angezeigt. Das 4. (letzte) Leben zu verlieren zeigt sich nicht
  durch ein weiteres Herz, sondern dadurch, dass der Spieler ausgegraut wird und ausscheidet.
  Wer als Letzter übrig bleibt, gewinnt.
- Jede Runde beginnt der nächste Spieler. Nur der **Gastgeber** (wer den Raum eröffnet hat)
  kann die nächste Runde starten.
- **Menü im Spiel** (☰ oben rechts): Töne an/aus, Musik an/aus, Lautstärke und **Spiel verlassen**.
  Die Einstellungen merkt sich das Gerät. Die Musik ist standardmäßig aus.
- **Spiel verlassen**: Wer geht, scheidet sofort aus. Bleibt nur einer übrig, gewinnt er auf der Stelle.
  Geht der Gastgeber, übernimmt ein Mitspieler.
- *Offen:* Sonderregeln für den Schwimmer. Bisher wird der Schwimmer nur markiert, es gelten keine
  zusätzlichen Regeln.

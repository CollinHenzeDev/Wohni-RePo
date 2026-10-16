# Wohni-Spiele: Glossar

## Plattform

- **Raum**: Eine Spielgruppe mit 4-stelligem Code. Hat einen **Gastgeber**, der das Spiel startet und beendet.
- **Mitglied**: Eine Person in einem Raum. Über ein geheimes Token kann sie nach einem Verbindungsabbruch wieder einsteigen.
- **Spiel**: Die Regeln als reine Zustandsmaschine (`setup`, `apply`, `leave`, `view`). Ein Spiel weiß nichts von Netzwerk oder Räumen.

## Würfel-Blackjack

- **Zug**: Der Abschnitt, in dem ein Spieler würfelt, bis er stehen bleibt, sich überkauft,
  oder sein 3. und letzter Wurf verbraucht ist (dann automatisch stehen).
- **Wurf**: Ein Würfeln mit 1–3 selbst gewählten Würfeln. Die Augen kommen zur **Summe** dazu.
  Maximal 3 Würfe pro Zug.
- **Stehen bleiben**: Den Zug freiwillig beenden. Das geht erst nach mindestens einem Wurf.
- **Überkauft**: Die Summe ist über 21. Die Höhe entscheidet über den Lebensverlust:
  22–23 → 1 Leben, 24–26 → 2 Leben, ab 27 → 3 Leben.
- **Genau 21**: Bringt 1 Leben dazu (gedeckelt auf 4).
- **Runde**: Jeder lebende Spieler hat einmal einen Zug gehabt. Danach: Überkaufte verlieren
  wie oben, wer genau 21 hat gewinnt ein Leben, und von den restlichen Spielern verliert die
  **niedrigste Summe** ein Leben (bei Gleichstand alle mit dieser Summe). Würden dadurch alle
  verbleibenden Spieler gleichzeitig ausscheiden, zählt die Runde nicht.
- **Leben**: Jeder startet mit 4. Bei 0 scheidet man aus und wird ausgegraut.
- **Schwimmer**: Ein Spieler mit nur noch 1 Leben, also nachdem er 3 seiner 4 Leben verloren hat.
  Wird klein in Blau unter seinem Männchen angezeigt. Sonderregeln gibt es noch nicht, er wird bisher nur markiert.
- **Spiel verlassen**: Ein Spieler geht mitten im Spiel. Er scheidet sofort aus (wie bei 0 Leben) und ist
  nicht mehr im Raum. Bleibt nur einer übrig, gewinnt er sofort.
- **Gastgeber**: Wer den Raum eröffnet hat. Nur er kann die nächste Runde starten. Er kann in der
  Lobby die Rolle übergeben oder Mitspieler entfernen. Während eines laufenden Spiels bleibt er fest;
  nur wenn er das Spiel verlässt, geht die Rolle an einen Mitspieler.

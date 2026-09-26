# Wohni-Spiele: Glossar

## Plattform

- **Raum**: Eine Spielgruppe mit 4-stelligem Code. Hat einen **Gastgeber**, der das Spiel startet und beendet.
- **Mitglied**: Eine Person in einem Raum. Über ein geheimes Token kann sie nach einem Verbindungsabbruch wieder einsteigen.
- **Spiel**: Die Regeln als reine Zustandsmaschine (`setup`, `apply`, `view`). Ein Spiel weiß nichts von Netzwerk oder Räumen.

## Würfel-Blackjack

- **Zug**: Der Abschnitt, in dem ein Spieler würfelt, bis er stehen bleibt oder sich überkauft.
- **Wurf**: Ein Würfeln mit 1–3 selbst gewählten Würfeln. Die Augen kommen zur **Summe** dazu.
- **Stehen bleiben**: Den Zug freiwillig beenden. Das geht erst nach mindestens einem Wurf.
- **Überkauft**: Die Summe ist über 21.
- **Runde**: Jeder lebende Spieler hat einmal einen Zug gehabt. Danach verlieren die Verlierer je ein **Leben**.
- **Leben**: Jeder startet mit 4. Bei 0 ist man **raus**.
- **Schwimmer**: Ein Spieler mit nur noch 1 Leben. Für ihn gelten Sonderregeln, die noch nicht festgelegt sind.

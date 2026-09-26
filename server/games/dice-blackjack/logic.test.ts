import { test } from "node:test";
import assert from "node:assert/strict";
import { apply, setup, type Action, type State } from "./logic.ts";
import type { ActionContext, Rng } from "../types.ts";

/** RNG, der nacheinander die gegebenen Würfelaugen liefert. */
function dice(...faces: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= faces.length) throw new Error("Keine Würfel mehr in der Testfolge");
    return (faces[i++] - 1) / 6 + 0.01;
  };
}
const firstStarts: Rng = () => 0;
const asHost: ActionContext = { isHost: true };
const asGuest: ActionContext = { isHost: false };

function newGame(n = 3): State {
  const infos = ["anna", "ben", "carl", "dora"].slice(0, n).map((id) => ({ id, name: id }));
  return setup(infos, firstStarts);
}

// In den Tests ist "anna" immer der Gastgeber (erster Spieler in der Liste).
function act(state: State, playerId: string, action: Action, rng: Rng = firstStarts): State {
  const result = apply(state, playerId, action, rng, { isHost: playerId === "anna" });
  if (!result.ok) throw new Error(result.error);
  return result.state;
}

const player = (s: State, id: string) => s.players.find((p) => p.id === id)!;
const changeFor = (s: State, id: string) => s.lastResult?.changes.find((c) => c.playerId === id);

test("Jeder startet mit 4 Leben, der erste Spieler ist am Zug", () => {
  const s = newGame();
  assert.deepEqual(s.players.map((p) => p.lives), [4, 4, 4]);
  assert.equal(s.players[s.currentIndex].id, "anna");
});

test("Man wählt pro Wurf 1 bis 3 Würfel, die Augen werden addiert", () => {
  let s = newGame();
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 5, 4));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  assert.equal(player(s, "anna").total, 17);
  assert.deepEqual(player(s, "anna").rolls, [[6, 5, 4], [2]]);
});

test("Ungültige Würfelanzahl wird abgelehnt", () => {
  const s = newGame();
  assert.equal(apply(s, "anna", { type: "roll", dice: 4 }, firstStarts, asHost).ok, false);
  assert.equal(apply(s, "anna", { type: "roll", dice: 0 }, firstStarts, asHost).ok, false);
});

test("Nur der Spieler am Zug darf würfeln", () => {
  const s = newGame();
  assert.equal(apply(s, "ben", { type: "roll", dice: 1 }, dice(3), asGuest).ok, false);
});

test("Man muss mindestens einmal würfeln, bevor man stehen bleibt", () => {
  const s = newGame();
  assert.equal(apply(s, "anna", { type: "stand" }, firstStarts, asHost).ok, false);
});

test("Maximal 3 Würfelversuche pro Zug", () => {
  let s = newGame();
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  assert.equal(apply(s, "anna", { type: "roll", dice: 1 }, dice(2), asHost).ok, false);
});

test("Nach dem 3. Wurf bleibt man automatisch stehen und der Nächste ist dran", () => {
  let s = newGame();
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(2));
  assert.equal(player(s, "anna").status, "stood");
  assert.equal(s.players[s.currentIndex].id, "ben");
});

test("22–23 Augen kosten 1 Leben", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(5)); // 23
  assert.equal(player(s, "anna").status, "busted");
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(1));
  s = act(s, "ben", { type: "stand" });
  assert.equal(changeFor(s, "anna")?.delta, -1);
  assert.equal(player(s, "anna").lives, 3);
});

test("24–26 Augen kosten 2 Leben", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(6)); // 24
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(1));
  s = act(s, "ben", { type: "stand" });
  assert.equal(changeFor(s, "anna")?.delta, -2);
  assert.equal(player(s, "anna").lives, 2);
});

test("Ab 27 Augen kosten 3 Leben", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6)); // 18
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6)); // 36
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(1));
  s = act(s, "ben", { type: "stand" });
  assert.equal(changeFor(s, "anna")?.delta, -3);
  assert.equal(player(s, "anna").lives, 1);
});

test("Genau 21 bringt 1 Leben dazu", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(3)); // 21
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(1));
  s = act(s, "ben", { type: "stand" });
  assert.equal(changeFor(s, "anna")?.delta, 1);
  assert.equal(player(s, "anna").lives, 4); // an der Obergrenze gedeckelt
});


test("Ohne Überkaufte oder 21er verliert die niedrigste Summe ein Leben", () => {
  let s = newGame();
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6));
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 2 }, dice(1, 1));
  s = act(s, "ben", { type: "stand" });
  s = act(s, "carl", { type: "roll", dice: 3 }, dice(5, 5, 5));
  s = act(s, "carl", { type: "stand" });
  assert.equal(s.phase, "roundOver");
  assert.deepEqual(s.lastResult?.changes, [{ playerId: "ben", delta: -1, reason: "lowest" }]);
  assert.equal(player(s, "ben").lives, 3);
  assert.equal(player(s, "anna").lives, 4);
});

test("Gleichstand bei der niedrigsten Summe: alle Betroffenen verlieren", () => {
  let s = newGame();
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(3));
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(3));
  s = act(s, "ben", { type: "stand" });
  s = act(s, "carl", { type: "roll", dice: 1 }, dice(6));
  s = act(s, "carl", { type: "stand" });
  const losers = s.lastResult?.changes.filter((c) => c.reason === "lowest").map((c) => c.playerId);
  assert.deepEqual(losers?.sort(), ["anna", "ben"]);
});

test("Ein Überkaufter zählt nicht zusätzlich als niedrigste Summe", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(5, 5, 5));
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 3 }, dice(6, 6, 6));
  s = act(s, "ben", { type: "roll", dice: 3 }, dice(6, 6, 6)); // 36, überkauft
  assert.equal(s.lastResult?.changes.filter((c) => c.playerId === "ben").length, 1);
  assert.equal(changeFor(s, "ben")?.reason, "bust");
  assert.equal(changeFor(s, "anna")?.reason, "lowest");
});

test("Wer genau 21 trifft, zählt nicht als niedrigste Summe", () => {
  let s = newGame();
  s = act(s, "anna", { type: "roll", dice: 3 }, dice(6, 6, 6));
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(3)); // 21
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(2));
  s = act(s, "ben", { type: "stand" });
  s = act(s, "carl", { type: "roll", dice: 1 }, dice(4));
  s = act(s, "carl", { type: "stand" });
  assert.equal(changeFor(s, "anna")?.reason, "hit21");
  assert.equal(changeFor(s, "ben")?.reason, "lowest");
  assert.equal(changeFor(s, "carl"), undefined);
});

test("Nur der Gastgeber darf die nächste Runde starten", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(1));
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(6));
  s = act(s, "ben", { type: "stand" });
  assert.equal(s.phase, "roundOver");
  assert.equal(apply(s, "ben", { type: "nextRound" }, firstStarts, asGuest).ok, false);
  const result = apply(s, "ben", { type: "nextRound" }, firstStarts, asHost);
  assert.equal(result.ok, true);
});

test("Nächste Runde: Summen zurückgesetzt, der Startspieler rückt weiter", () => {
  let s = newGame(2);
  s = act(s, "anna", { type: "roll", dice: 1 }, dice(1));
  s = act(s, "anna", { type: "stand" });
  s = act(s, "ben", { type: "roll", dice: 1 }, dice(6));
  s = act(s, "ben", { type: "stand" });
  s = act(s, "anna", { type: "nextRound" });
  assert.equal(s.round, 2);
  assert.equal(s.players[s.currentIndex].id, "ben");
  assert.equal(player(s, "anna").total, 0);
});

function playRound(s: State, loser: string): State {
  if (s.phase === "roundOver") s = act(s, "anna", { type: "nextRound" });
  while (s.phase === "turn") {
    const id = s.players[s.currentIndex].id;
    s = act(s, id, { type: "roll", dice: 1 }, dice(id === loser ? 1 : 6));
    s = act(s, id, { type: "stand" });
  }
  return s;
}

test("Nach 3 verlorenen Leben ist man Schwimmer, nach dem 4. scheidet man aus", () => {
  let s = newGame(3);
  for (let i = 0; i < 3; i++) s = playRound(s, "ben");
  assert.equal(player(s, "ben").lives, 1);
  s = playRound(s, "ben");
  assert.equal(player(s, "ben").lives, 0);
  assert.deepEqual(s.lastResult?.eliminatedIds, ["ben"]);
  s = act(s, "anna", { type: "nextRound" });
  assert.ok(s.players.every((p) => p.id !== "ben" || p.status === "out"));
  assert.notEqual(s.players[s.currentIndex].id, "ben");
});

test("Der letzte Überlebende gewinnt", () => {
  let s = newGame(2);
  for (let i = 0; i < 4; i++) s = playRound(s, "ben");
  assert.equal(s.phase, "gameOver");
  assert.equal(s.winnerId, "anna");
});

test("Würden alle Übrigen ausscheiden, zählt die Runde nicht", () => {
  let s = newGame(2);
  for (let i = 0; i < 3; i++) s = playRound(s, "ben");
  for (let i = 0; i < 3; i++) s = playRound(s, "anna");
  s = act(s, "anna", { type: "nextRound" });
  while (s.phase === "turn") {
    const id = s.players[s.currentIndex].id;
    s = act(s, id, { type: "roll", dice: 1 }, dice(4));
    s = act(s, id, { type: "stand" });
  }
  assert.equal(s.lastResult?.voided, true);
  assert.deepEqual(s.players.map((p) => p.lives), [1, 1]);
  assert.equal(s.phase, "roundOver");
});

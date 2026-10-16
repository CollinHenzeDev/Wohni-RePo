import { test } from "node:test";
import assert from "node:assert/strict";
import { Rooms, gameList, type Room } from "./rooms.ts";

/** Raum mit Gastgeber "anna" und den übrigen Namen als Mitgliedern. */
function roomWith(...others: string[]): { rooms: Rooms; room: Room; id: (name: string) => string } {
  const rooms = new Rooms(() => 0);
  const { room } = rooms.create("anna");
  for (const name of others) {
    const res = rooms.join(room.code, name);
    assert.ok(res.ok);
  }
  const id = (name: string) => room.members.find((m) => m.name === name)!.id;
  return { rooms, room, id };
}

test("Die Spielliste enthält Beschreibung und Symbol für die Kacheln", () => {
  const [game] = gameList();
  assert.ok(game.description.length > 0);
  assert.ok(game.icon.length > 0);
});

// --- Spieler-Verwaltung in der Lobby ---

test("Der Gastgeber kann einen Spieler aus der Lobby entfernen", () => {
  const { rooms, room, id } = roomWith("ben", "carl");
  const res = rooms.kick(room, id("anna"), id("ben"));
  assert.ok(res.ok);
  assert.deepEqual(room.members.map((m) => m.name), ["anna", "carl"]);
});

test("Nur der Gastgeber darf entfernen, und nicht sich selbst", () => {
  const { rooms, room, id } = roomWith("ben", "carl");
  assert.equal(rooms.kick(room, id("ben"), id("carl")).ok, false);
  assert.equal(rooms.kick(room, id("anna"), id("anna")).ok, false);
  assert.equal(rooms.kick(room, id("anna"), "unbekannt").ok, false);
  assert.equal(room.members.length, 3);
});

test("Während eines Spiels kann niemand entfernt werden", () => {
  const { rooms, room, id } = roomWith("ben");
  rooms.start(room, id("anna"), "dice-blackjack");
  assert.equal(rooms.kick(room, id("anna"), id("ben")).ok, false);
});

test("Der Gastgeber kann die Rolle in der Lobby übergeben", () => {
  const { rooms, room, id } = roomWith("ben");
  const res = rooms.makeHost(room, id("anna"), id("ben"));
  assert.ok(res.ok);
  assert.equal(room.hostId, id("ben"));
});

test("Die Gastgeber-Rolle lässt sich nur vom Gastgeber und nicht im Spiel übergeben", () => {
  const { rooms, room, id } = roomWith("ben", "carl");
  assert.equal(rooms.makeHost(room, id("ben"), id("carl")).ok, false);
  assert.equal(rooms.makeHost(room, id("anna"), id("anna")).ok, false);
  rooms.start(room, id("anna"), "dice-blackjack");
  assert.equal(rooms.makeHost(room, id("anna"), id("ben")).ok, false);
  assert.equal(room.hostId, id("anna"));
});

// --- Verlassen ---

test("In der Lobby verlassen: Gastgeber-Rolle geht an den Nächsten", () => {
  const { rooms, room, id } = roomWith("ben", "carl");
  const ben = id("ben");
  rooms.leave(room, id("anna"));
  assert.equal(room.hostId, ben);
  assert.equal(room.members.length, 2);
});

test("Mitten im Spiel verlassen: Spieler scheidet aus und ist nicht mehr im Raum", () => {
  const { rooms, room, id } = roomWith("ben", "carl");
  rooms.start(room, id("anna"), "dice-blackjack");
  const carl = id("carl");
  const res = rooms.leave(room, carl);
  assert.ok(res.ok);
  assert.equal(room.members.some((m) => m.id === carl), false);
  const state = room.game!.state as { players: { id: string; lives: number }[] };
  assert.equal(state.players.find((p) => p.id === carl)!.lives, 0);
});

test("Verlässt der Gastgeber mitten im Spiel, übernimmt ein Mitspieler", () => {
  const { rooms, room, id } = roomWith("ben", "carl");
  rooms.start(room, id("anna"), "dice-blackjack");
  const ben = id("ben");
  rooms.leave(room, id("anna"));
  assert.equal(room.hostId, ben);
});

test("Verlässt der vorletzte Spieler das Spiel, gewinnt der Letzte", () => {
  const { rooms, room, id } = roomWith("ben");
  rooms.start(room, id("anna"), "dice-blackjack");
  rooms.leave(room, id("ben"));
  const state = room.game!.state as { phase: string; winnerId: string };
  assert.equal(state.phase, "gameOver");
  assert.equal(state.winnerId, id("anna"));
});

test("Verlässt der letzte Spieler den Raum, wird der Raum gelöscht", () => {
  const { rooms, room, id } = roomWith();
  rooms.leave(room, id("anna"));
  assert.equal(rooms.get(room.code), undefined);
});

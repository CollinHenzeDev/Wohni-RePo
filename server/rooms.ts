import { randomBytes, randomUUID } from "node:crypto";
import { games } from "./games/registry.ts";
import type { Rng } from "./games/types.ts";

export interface Member {
  id: string;
  name: string;
  /** Geheimer Schlüssel, mit dem ein Browser nach Verbindungsabbruch wieder einsteigt. */
  token: string;
  connected: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  members: Member[];
  game: { id: string; state: unknown } | null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // ohne I/O – leichter vorzulesen

export class Rooms {
  private rooms = new Map<string, Room>();
  private rng: Rng;

  constructor(rng: Rng = Math.random) {
    this.rng = rng;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  create(name: string): { room: Room; member: Member } {
    let code: string;
    do {
      code = Array.from(randomBytes(4), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
    } while (this.rooms.has(code));
    const member = newMember(name);
    const room: Room = { code, hostId: member.id, members: [member], game: null };
    this.rooms.set(code, room);
    return { room, member };
  }

  join(code: string, name: string): Result<{ room: Room; member: Member }> {
    const room = this.get(code);
    if (!room) return { ok: false, error: "Raum nicht gefunden." };
    if (room.game) return { ok: false, error: "Das Spiel läuft schon." };
    const trimmed = name.trim();
    if (room.members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, error: "Der Name ist im Raum schon vergeben." };
    }
    const member = newMember(trimmed);
    room.members.push(member);
    return { ok: true, value: { room, member } };
  }

  resume(code: string, token: string): Result<{ room: Room; member: Member }> {
    const room = this.get(code);
    const member = room?.members.find((m) => m.token === token);
    if (!room || !member) return { ok: false, error: "Sitzung abgelaufen." };
    return { ok: true, value: { room, member } };
  }

  leave(room: Room, memberId: string): Result<Room> {
    if (room.game) return { ok: false, error: "Während eines Spiels kannst du den Raum nicht verlassen." };
    room.members = room.members.filter((m) => m.id !== memberId);
    if (room.members.length === 0) {
      this.rooms.delete(room.code);
    } else if (room.hostId === memberId) {
      room.hostId = room.members[0].id;
    }
    return { ok: true, value: room };
  }

  start(room: Room, memberId: string, gameId: string): Result<Room> {
    if (room.hostId !== memberId) return { ok: false, error: "Nur der Gastgeber kann starten." };
    const game = games[gameId];
    if (!game) return { ok: false, error: "Unbekanntes Spiel." };
    const n = room.members.length;
    if (n < game.minPlayers || n > game.maxPlayers) {
      return { ok: false, error: `${game.name} braucht ${game.minPlayers}–${game.maxPlayers} Spieler.` };
    }
    const players = room.members.map(({ id, name }) => ({ id, name }));
    room.game = { id: gameId, state: game.setup(players, this.rng) };
    return { ok: true, value: room };
  }

  act(room: Room, memberId: string, action: unknown): Result<Room> {
    if (!room.game) return { ok: false, error: "Es läuft kein Spiel." };
    const result = games[room.game.id].apply(room.game.state, memberId, action, this.rng);
    if (!result.ok) return result;
    room.game.state = result.state;
    return { ok: true, value: room };
  }

  backToLobby(room: Room, memberId: string): Result<Room> {
    if (room.hostId !== memberId) return { ok: false, error: "Nur der Gastgeber kann das Spiel beenden." };
    room.game = null;
    return { ok: true, value: room };
  }

  /** Was ein bestimmtes Mitglied vom Raum sehen darf. */
  view(room: Room, memberId: string) {
    return {
      code: room.code,
      hostId: room.hostId,
      members: room.members.map(({ id, name, connected }) => ({ id, name, connected })),
      game: room.game && {
        id: room.game.id,
        view: games[room.game.id].view(room.game.state, memberId),
      },
    };
  }
}

function newMember(name: string): Member {
  return { id: randomUUID(), name: name.trim(), token: randomUUID(), connected: true };
}

export const gameList = () =>
  Object.values(games).map(({ id, name, minPlayers, maxPlayers }) => ({ id, name, minPlayers, maxPlayers }));

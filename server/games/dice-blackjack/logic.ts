import type { ActionResult, Game, PlayerInfo, Rng } from "../types.ts";

export const TARGET = 21;
export const START_LIVES = 4;
export const MAX_DICE = 3;

export type PlayerStatus = "waiting" | "playing" | "stood" | "busted" | "out";

export interface Player {
  id: string;
  name: string;
  lives: number;
  total: number;
  /** Alle Würfe dieser Runde, z. B. [[4, 2], [6]]. */
  rolls: number[][];
  status: PlayerStatus;
}

export interface RoundResult {
  round: number;
  loserIds: string[];
  eliminatedIds: string[];
  /** true, wenn alle verloren hätten und die Runde deshalb ohne Lebensverlust bleibt. */
  voided: boolean;
}

export interface State {
  players: Player[];
  round: number;
  /** Index des Spielers, der diese Runde begonnen hat. */
  starterIndex: number;
  /** Index des Spielers am Zug, oder -1 wenn die Runde vorbei ist. */
  currentIndex: number;
  phase: "turn" | "roundOver" | "gameOver";
  lastResult: RoundResult | null;
  winnerId: string | null;
}

export type Action =
  | { type: "roll"; dice: number }
  | { type: "stand" }
  | { type: "nextRound" };

export const isSwimmer = (p: Player) => p.lives === 1;

const rollDie = (rng: Rng) => Math.floor(rng() * 6) + 1;

function nextAliveIndex(players: Player[], from: number): number {
  for (let step = 1; step <= players.length; step++) {
    const i = (from + step) % players.length;
    if (players[i].lives > 0) return i;
  }
  return -1;
}

function startRound(state: State, starterIndex: number): State {
  const players = state.players.map((p): Player => ({
    ...p,
    total: 0,
    rolls: [],
    status: p.lives > 0 ? (p === state.players[starterIndex] ? "playing" : "waiting") : "out",
  }));
  return {
    ...state,
    players,
    round: state.round + 1,
    starterIndex,
    currentIndex: starterIndex,
    phase: "turn",
  };
}

export function setup(infos: PlayerInfo[], rng: Rng): State {
  const players: Player[] = infos.map((i) => ({
    id: i.id,
    name: i.name,
    lives: START_LIVES,
    total: 0,
    rolls: [],
    status: "waiting",
  }));
  const starter = Math.floor(rng() * players.length);
  const empty: State = {
    players,
    round: 0,
    starterIndex: starter,
    currentIndex: starter,
    phase: "turn",
    lastResult: null,
    winnerId: null,
  };
  return startRound(empty, starter);
}

/** Wer diese Runde ein Leben verliert: alle Überkauften, sonst die niedrigste Summe. */
export function roundLosers(players: Player[]): string[] {
  const active = players.filter((p) => p.status === "stood" || p.status === "busted");
  const busted = active.filter((p) => p.status === "busted");
  if (busted.length > 0) return busted.map((p) => p.id);
  const lowest = Math.min(...active.map((p) => p.total));
  return active.filter((p) => p.total === lowest).map((p) => p.id);
}

function endTurn(state: State): State {
  const next = nextAliveIndex(state.players, state.currentIndex);
  if (next !== state.starterIndex) {
    const players = state.players.map((p, i) => (i === next ? { ...p, status: "playing" as const } : p));
    return { ...state, players, currentIndex: next };
  }
  return finishRound(state);
}

function finishRound(state: State): State {
  const loserIds = roundLosers(state.players);
  const alive = state.players.filter((p) => p.lives > 0);
  const wouldEliminate = alive.filter((p) => loserIds.includes(p.id) && p.lives === 1);
  // Würden alle Übrigen gleichzeitig ausscheiden, zählt die Runde nicht.
  const voided = wouldEliminate.length === alive.length;

  const players = state.players.map((p) =>
    !voided && loserIds.includes(p.id) ? { ...p, lives: p.lives - 1 } : p,
  );
  const eliminatedIds = voided ? [] : wouldEliminate.map((p) => p.id);
  const survivors = players.filter((p) => p.lives > 0);
  const winnerId = survivors.length === 1 ? survivors[0].id : null;

  return {
    ...state,
    players,
    currentIndex: -1,
    phase: winnerId ? "gameOver" : "roundOver",
    lastResult: { round: state.round, loserIds, eliminatedIds, voided },
    winnerId,
  };
}

export function apply(state: State, playerId: string, action: Action, rng: Rng): ActionResult<State> {
  if (state.phase === "gameOver") return { ok: false, error: "Das Spiel ist vorbei." };

  if (action.type === "nextRound") {
    // Drücken mehrere gleichzeitig, startet nur der erste Klick die Runde.
    if (state.phase !== "roundOver") return { ok: true, state };
    return { ok: true, state: startRound(state, nextAliveIndex(state.players, state.starterIndex)) };
  }

  if (state.phase !== "turn") return { ok: false, error: "Die Runde ist vorbei." };
  const current = state.players[state.currentIndex];
  if (current.id !== playerId) return { ok: false, error: "Du bist nicht am Zug." };

  if (action.type === "stand") {
    if (current.rolls.length === 0) return { ok: false, error: "Du musst mindestens einmal würfeln." };
    const players = state.players.map((p) => (p.id === playerId ? { ...p, status: "stood" as const } : p));
    return { ok: true, state: endTurn({ ...state, players }) };
  }

  if (action.type === "roll") {
    const n = action.dice;
    if (!Number.isInteger(n) || n < 1 || n > MAX_DICE) {
      return { ok: false, error: `Wähle 1 bis ${MAX_DICE} Würfel.` };
    }
    const dice = Array.from({ length: n }, () => rollDie(rng));
    const total = current.total + dice.reduce((a, b) => a + b, 0);
    const busted = total > TARGET;
    const updated: Player = {
      ...current,
      total,
      rolls: [...current.rolls, dice],
      status: busted ? "busted" : "playing",
    };
    const players = state.players.map((p) => (p.id === playerId ? updated : p));
    const next = { ...state, players };
    return { ok: true, state: busted ? endTurn(next) : next };
  }

  return { ok: false, error: "Unbekannte Aktion." };
}

export const diceBlackjack: Game<State, Action> = {
  id: "dice-blackjack",
  name: "Würfel-Blackjack",
  minPlayers: 2,
  maxPlayers: 10,
  setup,
  apply,
  view: (state) => ({ ...state, target: TARGET, maxDice: MAX_DICE }),
};

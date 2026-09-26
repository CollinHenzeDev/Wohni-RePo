import type { ActionContext, ActionResult, Game, PlayerInfo, Rng } from "../types.ts";

export const TARGET = 21;
export const START_LIVES = 4;
export const MAX_DICE = 3;
/** Maximal 3 Würfelversuche pro Zug, danach muss man stehen bleiben. */
export const MAX_ROLLS = 3;

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

/** Grund und Höhe einer Lebensänderung am Rundenende. */
export interface RoundChange {
  playerId: string;
  delta: number;
  reason: "bust" | "hit21" | "lowest";
}

export interface RoundResult {
  round: number;
  changes: RoundChange[];
  eliminatedIds: string[];
  /** true, wenn dabei alle Übrigen gleichzeitig ausgeschieden wären – die Runde zählt dann nicht. */
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

/** Wie viele Leben ein Überkaufter verliert: 22–23 → 1, 24–26 → 2, ab 27 → 3. */
function bustPenalty(total: number): number {
  if (total >= 27) return 3;
  if (total >= 24) return 2;
  return 1;
}

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

/**
 * Lebensänderungen am Rundenende:
 * - Überkaufte verlieren je nach Höhe 1–3 Leben.
 * - Wer genau 21 trifft, gewinnt 1 Leben.
 * - Von den Übrigen (weder überkauft noch genau 21) verliert die niedrigste Summe 1 Leben,
 *   bei Gleichstand alle mit dieser Summe.
 */
export function roundChanges(players: Player[]): RoundChange[] {
  const active = players.filter((p) => p.status === "stood" || p.status === "busted");
  const changes: RoundChange[] = [];

  for (const p of active) {
    if (p.status === "busted") changes.push({ playerId: p.id, delta: -bustPenalty(p.total), reason: "bust" });
    else if (p.total === TARGET) changes.push({ playerId: p.id, delta: 1, reason: "hit21" });
  }

  const others = active.filter((p) => p.status === "stood" && p.total !== TARGET);
  if (others.length > 0) {
    const lowest = Math.min(...others.map((p) => p.total));
    for (const p of others.filter((p) => p.total === lowest)) {
      changes.push({ playerId: p.id, delta: -1, reason: "lowest" });
    }
  }

  return changes;
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
  const changes = roundChanges(state.players);
  const byId = new Map(changes.map((c) => [c.playerId, c.delta]));
  const alive = state.players.filter((p) => p.lives > 0);
  // Würden dadurch alle Übrigen gleichzeitig ausscheiden, zählt die Runde nicht.
  const voided = alive.every((p) => p.lives + (byId.get(p.id) ?? 0) <= 0);

  const players = state.players.map((p) => {
    const delta = byId.get(p.id);
    if (voided || delta === undefined) return p;
    return { ...p, lives: Math.max(0, Math.min(START_LIVES, p.lives + delta)) };
  });
  const eliminatedIds = voided ? [] : alive.filter((p) => p.lives + (byId.get(p.id) ?? 0) <= 0).map((p) => p.id);
  const survivors = players.filter((p) => p.lives > 0);
  const winnerId = survivors.length === 1 ? survivors[0].id : null;

  return {
    ...state,
    players,
    currentIndex: -1,
    phase: winnerId ? "gameOver" : "roundOver",
    lastResult: { round: state.round, changes, eliminatedIds, voided },
    winnerId,
  };
}

export function apply(
  state: State,
  playerId: string,
  action: Action,
  rng: Rng,
  ctx: ActionContext,
): ActionResult<State> {
  if (state.phase === "gameOver") return { ok: false, error: "Das Spiel ist vorbei." };

  if (action.type === "nextRound") {
    // Drücken mehrere gleichzeitig, startet nur der erste Klick die Runde.
    if (state.phase !== "roundOver") return { ok: true, state };
    if (!ctx.isHost) return { ok: false, error: "Nur der Gastgeber kann die nächste Runde starten." };
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
    if (current.rolls.length >= MAX_ROLLS) {
      return { ok: false, error: `Du hast schon ${MAX_ROLLS}-mal gewürfelt.` };
    }
    const n = action.dice;
    if (!Number.isInteger(n) || n < 1 || n > MAX_DICE) {
      return { ok: false, error: `Wähle 1 bis ${MAX_DICE} Würfel.` };
    }
    const dice = Array.from({ length: n }, () => rollDie(rng));
    const rolls = [...current.rolls, dice];
    const total = current.total + dice.reduce((a, b) => a + b, 0);
    const busted = total > TARGET;
    // Nach dem letzten erlaubten Wurf bleibt man automatisch stehen.
    const limitReached = !busted && rolls.length >= MAX_ROLLS;
    const updated: Player = {
      ...current,
      total,
      rolls,
      status: busted ? "busted" : limitReached ? "stood" : "playing",
    };
    const players = state.players.map((p) => (p.id === playerId ? updated : p));
    const next = { ...state, players };
    return { ok: true, state: busted || limitReached ? endTurn(next) : next };
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
  view: (state) => ({ ...state, target: TARGET, maxDice: MAX_DICE, maxRolls: MAX_ROLLS }),
};

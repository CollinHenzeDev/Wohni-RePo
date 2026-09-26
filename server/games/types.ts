/** Liefert eine Zufallszahl in [0, 1). In Tests durch eine feste Folge ersetzbar. */
export type Rng = () => number;

export interface PlayerInfo {
  id: string;
  name: string;
}

export type ActionResult<S> = { ok: true; state: S } | { ok: false; error: string };

/** Was der Raum über die Person weiß, die gerade eine Aktion schickt. */
export interface ActionContext {
  /** Der Spieler, der den Raum eröffnet hat (bleibt während eines laufenden Spiels fest). */
  isHost: boolean;
}

/**
 * Ein Spiel ist eine reine Zustandsmaschine: Der Server verwaltet Räume und
 * Verbindungen, das Spiel kennt nur Zustand und Aktionen.
 */
export interface Game<S, A> {
  id: string;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  setup(players: PlayerInfo[], rng: Rng): S;
  apply(state: S, playerId: string, action: A, rng: Rng, ctx: ActionContext): ActionResult<S>;
  /** Was ein bestimmter Spieler sehen darf (für Spiele mit verdeckten Infos). */
  view(state: S, playerId: string): unknown;
}

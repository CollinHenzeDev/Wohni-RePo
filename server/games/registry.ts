import type { Game } from "./types.ts";
import { diceBlackjack } from "./dice-blackjack/logic.ts";

// Neue Spiele hier eintragen.
export const games: Record<string, Game<any, any>> = {
  [diceBlackjack.id]: diceBlackjack,
};

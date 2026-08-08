/**
 * Pure SKATE game rules, kept separate from Supabase/UI so the win-condition
 * and turn-passing logic can be unit tested without a database.
 *
 * Round structure (no schema changes needed — everything is derived from
 * skate_games + skate_game_turns):
 *   1. SET    — the current setter records a trick. Turn is inserted with
 *               matched = null.
 *   2. RESPOND — the other player attempts to match it. Turn is inserted
 *               with the same trick_name, matched = null.
 *   3. JUDGE  — the setter marks the response as landed or missed
 *               (skate_game_turns.matched is set, never re-judged).
 *
 * On a landed response, the responder becomes the new setter (standard
 * SKATE rule — land it and you get to call the next trick). On a miss, the
 * responder is given the next letter and the setter keeps setting. There
 * are no retries: a judged miss is final for that round by design, to keep
 * the state machine derivable purely from turn history.
 */

export const SKATE_WORD = 'SKATE';

export interface GameLite {
  challenger_id: string;
  opponent_id: string;
  status: string;
  current_turn?: string | null;
  challenger_letters: string;
  opponent_letters: string;
}

export interface TurnLite {
  id: string;
  player_id: string;
  trick_name: string;
  matched?: boolean | null;
  turn_number: number;
}

export type GamePhase = 'set' | 'respond' | 'judge' | 'completed';

export interface DerivedGameState {
  phase: GamePhase;
  /** Player whose turn it currently is to set/respond/judge. Null once completed. */
  actorId: string | null;
  setterId: string | null;
  responderId: string | null;
  /** Trick name currently being attempted/judged, if any. */
  pendingTrick: string | null;
  /** The un-judged RESPOND turn, present only during the 'judge' phase. */
  pendingTurn: TurnLite | null;
}

function otherPlayer(game: GameLite, id: string): string {
  return id === game.challenger_id ? game.opponent_id : game.challenger_id;
}

/**
 * Derive whose turn it is and what they need to do from the game + its turn
 * history. Turns must alternate strictly SET, RESPOND, SET, RESPOND, ... —
 * i.e. an odd-indexed (1st, 3rd, ...) turn is always a SET and an
 * even-indexed turn is always a RESPOND to the immediately preceding SET.
 */
export function deriveGameState(game: GameLite, turns: TurnLite[]): DerivedGameState {
  if (game.status === 'completed') {
    return {
      phase: 'completed',
      actorId: null,
      setterId: null,
      responderId: null,
      pendingTrick: null,
      pendingTurn: null,
    };
  }

  const sorted = [...turns].sort((a, b) => a.turn_number - b.turn_number);
  const last = sorted[sorted.length - 1];

  if (!last) {
    const setterId = game.current_turn ?? game.challenger_id;
    return {
      phase: 'set',
      actorId: setterId,
      setterId,
      responderId: otherPlayer(game, setterId),
      pendingTrick: null,
      pendingTurn: null,
    };
  }

  const isSetTurn = sorted.length % 2 === 1;

  if (isSetTurn) {
    // `last` is an un-responded SET — waiting on the other player to respond.
    const setterId = last.player_id;
    return {
      phase: 'respond',
      actorId: otherPlayer(game, setterId),
      setterId,
      responderId: otherPlayer(game, setterId),
      pendingTrick: last.trick_name,
      pendingTurn: null,
    };
  }

  if (last.matched === null || last.matched === undefined) {
    // `last` is a RESPOND turn awaiting judgment by the setter.
    const responderId = last.player_id;
    const setterId = otherPlayer(game, responderId);
    return {
      phase: 'judge',
      actorId: setterId,
      setterId,
      responderId,
      pendingTrick: last.trick_name,
      pendingTurn: last,
    };
  }

  // `last` (a RESPOND turn) has already been judged — start a new round.
  // The setter of that just-finished round is whoever set it (the SET turn
  // immediately before `last`).
  const priorSetTurn = sorted[sorted.length - 2];
  const priorSetterId = priorSetTurn ? priorSetTurn.player_id : game.challenger_id;
  const responderIdOfLastRound = last.player_id;
  const nextSetterId = last.matched ? responderIdOfLastRound : priorSetterId;

  return {
    phase: 'set',
    actorId: nextSetterId,
    setterId: nextSetterId,
    responderId: otherPlayer(game, nextSetterId),
    pendingTrick: null,
    pendingTurn: null,
  };
}

export interface JudgmentResult {
  turnUpdate: { matched: boolean };
  gameUpdate: {
    current_turn?: string;
    challenger_letters?: string;
    opponent_letters?: string;
    status?: string;
    winner_id?: string;
    completed_at?: string;
  };
}

/**
 * Compute the turn + game updates that result from the setter judging a
 * response as landed (matched) or missed. Never mutates its inputs.
 */
export function applyJudgment(
  game: GameLite,
  pendingTurn: TurnLite,
  matched: boolean
): JudgmentResult {
  const responderId = pendingTurn.player_id;
  const setterId = otherPlayer(game, responderId);
  const responderIsChallenger = responderId === game.challenger_id;

  if (matched) {
    // Landed it — no letter, responder becomes the new setter.
    return {
      turnUpdate: { matched: true },
      gameUpdate: { current_turn: responderId },
    };
  }

  const currentLetters = responderIsChallenger ? game.challenger_letters : game.opponent_letters;
  const nextLetters = SKATE_WORD.slice(0, currentLetters.length + 1);
  const eliminated = nextLetters.length >= SKATE_WORD.length;

  const gameUpdate: JudgmentResult['gameUpdate'] = {
    [responderIsChallenger ? 'challenger_letters' : 'opponent_letters']: nextLetters,
  };

  if (eliminated) {
    gameUpdate.status = 'completed';
    gameUpdate.winner_id = setterId;
    gameUpdate.completed_at = new Date().toISOString();
  } else {
    // Setter keeps setting — it's their turn again to call a new trick.
    gameUpdate.current_turn = setterId;
  }

  return { turnUpdate: { matched: false }, gameUpdate };
}

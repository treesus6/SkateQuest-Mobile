/// <reference path="../../types/testEnvShims.d.ts" />
import { describe, expect, it } from '@jest/globals';
import {
  applyJudgment,
  deriveGameState,
  type GameLite,
  type TurnLite,
} from '../../lib/skateGameLogic';

const CHALLENGER = 'challenger-1';
const OPPONENT = 'opponent-1';

function makeGame(overrides: Partial<GameLite> = {}): GameLite {
  return {
    challenger_id: CHALLENGER,
    opponent_id: OPPONENT,
    status: 'active',
    current_turn: CHALLENGER,
    challenger_letters: '',
    opponent_letters: '',
    ...overrides,
  };
}

function makeTurn(
  overrides: Partial<TurnLite> & Pick<TurnLite, 'player_id' | 'turn_number'>
): TurnLite {
  return {
    id: `turn-${overrides.turn_number}`,
    trick_name: 'Kickflip',
    matched: null,
    ...overrides,
  };
}

describe('deriveGameState', () => {
  it('starts in the set phase with the challenger as setter when there are no turns', () => {
    const state = deriveGameState(makeGame(), []);
    expect(state).toMatchObject({
      phase: 'set',
      actorId: CHALLENGER,
      setterId: CHALLENGER,
      responderId: OPPONENT,
    });
  });

  it('moves to respond phase after the setter records a trick', () => {
    const turns = [makeTurn({ player_id: CHALLENGER, turn_number: 1, trick_name: 'Ollie' })];
    const state = deriveGameState(makeGame(), turns);
    expect(state).toMatchObject({
      phase: 'respond',
      actorId: OPPONENT,
      setterId: CHALLENGER,
      responderId: OPPONENT,
      pendingTrick: 'Ollie',
    });
  });

  it('moves to judge phase once the responder submits an unjudged attempt', () => {
    const turns = [
      makeTurn({ player_id: CHALLENGER, turn_number: 1, trick_name: 'Ollie' }),
      makeTurn({ player_id: OPPONENT, turn_number: 2, trick_name: 'Ollie', matched: null }),
    ];
    const state = deriveGameState(makeGame(), turns);
    expect(state.phase).toBe('judge');
    expect(state.actorId).toBe(CHALLENGER);
    expect(state.pendingTurn?.id).toBe('turn-2');
  });

  it('flips the setter role to the responder after a landed trick', () => {
    const turns = [
      makeTurn({ player_id: CHALLENGER, turn_number: 1, trick_name: 'Ollie' }),
      makeTurn({ player_id: OPPONENT, turn_number: 2, trick_name: 'Ollie', matched: true }),
    ];
    const state = deriveGameState(makeGame(), turns);
    expect(state).toMatchObject({
      phase: 'set',
      actorId: OPPONENT,
      setterId: OPPONENT,
      responderId: CHALLENGER,
    });
  });

  it('keeps the same setter after a missed trick', () => {
    const turns = [
      makeTurn({ player_id: CHALLENGER, turn_number: 1, trick_name: 'Ollie' }),
      makeTurn({ player_id: OPPONENT, turn_number: 2, trick_name: 'Ollie', matched: false }),
    ];
    const state = deriveGameState(makeGame(), turns);
    expect(state).toMatchObject({
      phase: 'set',
      actorId: CHALLENGER,
      setterId: CHALLENGER,
      responderId: OPPONENT,
    });
  });

  it('reports completed with no actor once the game status is completed', () => {
    const state = deriveGameState(makeGame({ status: 'completed' }), []);
    expect(state).toMatchObject({ phase: 'completed', actorId: null });
  });
});

describe('applyJudgment', () => {
  it('gives the responder the new-setter role and no letter when they land it', () => {
    const game = makeGame();
    const pendingTurn = makeTurn({ player_id: OPPONENT, turn_number: 2 });

    const result = applyJudgment(game, pendingTurn, true);

    expect(result).toEqual({
      turnUpdate: { matched: true },
      gameUpdate: { current_turn: OPPONENT },
    });
  });

  it('gives the responder their first letter on a miss and passes the turn back to the setter', () => {
    const game = makeGame();
    const pendingTurn = makeTurn({ player_id: OPPONENT, turn_number: 2 });

    const result = applyJudgment(game, pendingTurn, false);

    expect(result).toEqual({
      turnUpdate: { matched: false },
      gameUpdate: { opponent_letters: 'S', current_turn: CHALLENGER },
    });
  });

  it('accumulates letters onto existing progress for the correct player', () => {
    const game = makeGame({ challenger_letters: 'SK' });
    const pendingTurn = makeTurn({ player_id: CHALLENGER, turn_number: 4 });

    const result = applyJudgment(game, pendingTurn, false);

    expect(result.gameUpdate.challenger_letters).toBe('SKA');
    expect(result.gameUpdate.current_turn).toBe(OPPONENT);
  });

  it('completes the game and assigns the setter as winner when the fifth letter lands', () => {
    const game = makeGame({ opponent_letters: 'SKAT' });
    const pendingTurn = makeTurn({ player_id: OPPONENT, turn_number: 8 });

    const result = applyJudgment(game, pendingTurn, false);

    expect(result.gameUpdate.opponent_letters).toBe('SKATE');
    expect(result.gameUpdate.status).toBe('completed');
    expect(result.gameUpdate.winner_id).toBe(CHALLENGER);
    expect(result.gameUpdate.completed_at).toBeDefined();
    expect(result.gameUpdate.current_turn).toBeUndefined();
  });
});

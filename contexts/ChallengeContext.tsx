import React, { ReactNode } from 'react';
import { useChallengeStore } from '../state/challengeStore';

// Re-export types from the Zustand store
export type { Challenge, ChallengeDifficulty } from '../state/challengeStore';

// Backward-compatible hook — delegates to Zustand store
export function useChallenges() {
  return useChallengeStore();
}

// No-op provider — Zustand doesn't need a React provider.
// Kept for backward compatibility with existing component trees.
type ProviderProps = { children: ReactNode };
export function ChallengeProvider({ children }: ProviderProps) {
  return <>{children}</>;
}

import React, { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'insane';

export type Challenge = {
  id: string;
  title: string;
  description: string;
  spotId?: string | null;
  trick?: string | null;
  xp: number;
  difficulty: ChallengeDifficulty;
  completed: boolean;
  completedAt?: string | null;
  isDaily?: boolean;
};

type ChallengeContextValue = {
  challenges: Challenge[];
  dailyChallenges: Challenge[];
  xp: number;
  level: number;
  streakDays: number;
  completeChallenge: (id: string) => void;
  resetDailyChallenges: () => void;
};

const ChallengeContext = createContext<ChallengeContextValue | undefined>(undefined);

const BASE_CHALLENGES: Challenge[] = [
  {
    id: 'ch_flat_kickflip',
    title: 'Kickflip on flat',
    description: 'Land a clean kickflip on flatground. No tic-tac, roll away smooth.',
    xp: 100,
    difficulty: 'easy',
    completed: false,
  },
  {
    id: 'ch_5050_ledge',
    title: '50-50 a ledge',
    description: 'Find a ledge and lock in a 50-50. Hold it and pop out clean.',
    xp: 200,
    difficulty: 'medium',
    completed: false,
  },
  {
    id: 'ch_manual_line',
    title: 'Manual line',
    description: 'Manual across a parking lot line for at least 3 seconds.',
    xp: 150,
    difficulty: 'medium',
    completed: false,
  },
  {
    id: 'ch_park_line',
    title: 'Park line',
    description: 'Hit three obstacles in one line at a park you haven’t skated this week.',
    xp: 300,
    difficulty: 'hard',
    completed: false,
  },
  {
    id: 'ch_switch_trick',
    title: 'Switch trick',
    description: 'Learn or land a trick in switch stance you rarely do.',
    xp: 250,
    difficulty: 'hard',
    completed: false,
  },
];

function pickDailyChallenges(all: Challenge[], count: number): Challenge[] {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(c => ({
    ...c,
    isDaily: true,
    completed: false,
    completedAt: null,
  }));
}

type ProviderProps = { children: ReactNode };

export function ChallengeProvider({ children }: ProviderProps) {
  const [challenges, setChallenges] = useState<Challenge[]>(BASE_CHALLENGES);
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>(
    pickDailyChallenges(BASE_CHALLENGES, 3)
  );
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [streakDays, setStreakDays] = useState(0);
  const [lastCompletedDate, setLastCompletedDate] = useState<string | null>(null);

  const recomputeLevel = useCallback((newXp: number) => {
    const newLevel = 1 + Math.floor(newXp / 500);
    setLevel(newLevel);
  }, []);

  const updateStreak = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (!lastCompletedDate) {
      setStreakDays(1);
      setLastCompletedDate(today);
      return;
    }

    if (lastCompletedDate === today) {
      return;
    }

    const last = new Date(lastCompletedDate);
    const current = new Date(today);
    const diffMs = current.getTime() - last.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      setStreakDays(prev => prev + 1);
    } else {
      setStreakDays(1);
    }

    setLastCompletedDate(today);
  }, [lastCompletedDate]);

  const completeChallenge = useCallback(
    (id: string) => {
      setChallenges(prev => {
        const updated = prev.map(c =>
          c.id === id ? { ...c, completed: true, completedAt: new Date().toISOString() } : c
        );
        const completed = updated.find(c => c.id === id);
        if (completed) {
          setXp(prevXp => {
            const gained = completed.xp;
            const newXp = prevXp + gained;
            recomputeLevel(newXp);
            return newXp;
          });
          updateStreak();
        }
        return updated;
      });

      setDailyChallenges(prev =>
        prev.map(c =>
          c.id === id ? { ...c, completed: true, completedAt: new Date().toISOString() } : c
        )
      );
    },
    [recomputeLevel, updateStreak]
  );

  const resetDailyChallenges = useCallback(() => {
    setDailyChallenges(pickDailyChallenges(BASE_CHALLENGES, 3));
  }, []);

  const value = useMemo(
    () => ({
      challenges,
      dailyChallenges,
      xp,
      level,
      streakDays,
      completeChallenge,
      resetDailyChallenges,
    }),
    [challenges, dailyChallenges, xp, level, streakDays, completeChallenge, resetDailyChallenges]
  );

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
}

export function useChallenges() {
  const ctx = useContext(ChallengeContext);
  if (!ctx) {
    throw new Error('useChallenges must be used within a ChallengeProvider');
  }
  return ctx;
}

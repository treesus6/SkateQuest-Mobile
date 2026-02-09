import { create } from 'zustand';

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

type ChallengeState = {
  challenges: Challenge[];
  dailyChallenges: Challenge[];
  xp: number;
  level: number;
  streakDays: number;
  lastCompletedDate: string | null;
  completeChallenge: (id: string) => void;
  resetDailyChallenges: () => void;
};

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
    description: 'Hit three obstacles in one line at a park you haven\'t skated this week.',
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

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  challenges: BASE_CHALLENGES,
  dailyChallenges: pickDailyChallenges(BASE_CHALLENGES, 3),
  xp: 0,
  level: 1,
  streakDays: 0,
  lastCompletedDate: null,

  completeChallenge: (id: string) => {
    const state = get();
    const challenge = state.challenges.find(c => c.id === id);
    if (!challenge || challenge.completed) return;

    const newXp = state.xp + challenge.xp;
    const newLevel = 1 + Math.floor(newXp / 500);

    // Update streak
    const today = new Date().toISOString().slice(0, 10);
    let newStreak = state.streakDays;
    if (!state.lastCompletedDate) {
      newStreak = 1;
    } else if (state.lastCompletedDate !== today) {
      const last = new Date(state.lastCompletedDate);
      const current = new Date(today);
      const diffDays = Math.round((current.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      newStreak = diffDays === 1 ? newStreak + 1 : 1;
    }

    set({
      challenges: state.challenges.map(c =>
        c.id === id ? { ...c, completed: true, completedAt: new Date().toISOString() } : c
      ),
      dailyChallenges: state.dailyChallenges.map(c =>
        c.id === id ? { ...c, completed: true, completedAt: new Date().toISOString() } : c
      ),
      xp: newXp,
      level: newLevel,
      streakDays: newStreak,
      lastCompletedDate: today,
    });
  },

  resetDailyChallenges: () => {
    set({ dailyChallenges: pickDailyChallenges(BASE_CHALLENGES, 3) });
  },
}));

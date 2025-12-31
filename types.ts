export interface UserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  spots_added: number;
  challenges_completed: string[];
  streak: number;
  badges: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  xp: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  completed: boolean;
}

export interface Trick {
  id: string;
  name: string;
  difficulty: number;
  category: string;
}

export interface SpotCondition {
  id: string;
  spot_id: string;
  condition: string;
  created_at: string;
  expires_at: string;
}

export interface Park {
  id: string;
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  address?: string;
}

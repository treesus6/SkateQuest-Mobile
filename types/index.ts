export interface SkateSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tricks?: string[];
  rating?: number;
  image_url?: string;
  added_by?: string;
  created_at?: string;
}

export interface Challenge {
  id: string;
  spot_id?: string;
  trick: string;
  challenger_id: string;
  status: 'pending' | 'completed';
  title?: string;
  description?: string;
  xp_reward: number;
  created_at: string;
  completed_by?: string;
  completed_at?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  spots_added: number;
  challenges_completed: string[];
  streak?: number;
  badges?: { [key: string]: boolean };
  created_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  hours?: string;
  verified: boolean;
}

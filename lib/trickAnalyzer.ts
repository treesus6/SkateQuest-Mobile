import { supabase } from './supabase';

export interface TrickAnalysis {
  difficulty: string;
  tips: string[];
  common_mistakes: string[];
  prerequisites: string[];
  xp_value: number;
  style_notes: string;
}

/**
 * Analyzes a trick via the Supabase Edge Function (server-side OpenAI call).
 * This keeps the OpenAI API key off the client bundle entirely.
 */
export async function analyzeTrick(
  trickName: string,
  description?: string,
  videoUrl?: string
): Promise<TrickAnalysis> {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-trick`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        trick_name: trickName,
        description,
        video_url: videoUrl,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Trick analysis failed: ${res.status}`);
  }

  return res.json();
}

// Fallback for when edge function is unavailable
export function getFallbackAnalysis(trickName: string): TrickAnalysis {
  return {
    difficulty: 'Intermediate',
    tips: [
      'Keep your shoulders parallel to the board',
      'Snap hard off your back foot',
      'Keep your eyes on the landing',
    ],
    common_mistakes: [
      'Not popping high enough',
      'Catching too early',
    ],
    prerequisites: ['Ollie', 'Basic balance'],
    xp_value: 75,
    style_notes: `Keep working on ${trickName} — consistency comes with repetition.`,
  };
}

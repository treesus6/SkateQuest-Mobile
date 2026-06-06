import { supabase } from './supabase';

export interface TrickAnalysis {
  difficulty: string;
  tips: string[];
  common_mistakes: string[];
  prerequisites: string[];
  xp_value: number;
  style_notes: string;
  // Extended fields used by UploadMediaScreen
  trickName?: string;
  score?: number;
  feedback?: string;
  detectedElements?: string[];
}

// Alias for backward compatibility
export type TrickAnalysisResult = TrickAnalysis;

/**
 * Analyzes a trick via the Supabase Edge Function (analyze-trick).
 * AI processing happens server-side — no API keys on the client.
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

// Alias used by UploadMediaScreen
export const analyzeTrickVideo = analyzeTrick;

// Save analysis result to Supabase
export async function saveAnalysisResult(
  userId: string,
  trickName: string,
  analysis: TrickAnalysis,
  videoUrl?: string
): Promise<void> {
  const { error } = await supabase.from('trick_analyses').insert({
    user_id: userId,
    trick_name: trickName,
    difficulty: analysis.difficulty,
    xp_value: analysis.xp_value,
    style_notes: analysis.style_notes,
    video_url: videoUrl ?? null,
  });
  if (error) throw error;
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
    trickName,
    score: 0,
    feedback: 'Keep practicing!',
    detectedElements: [],
  };
}

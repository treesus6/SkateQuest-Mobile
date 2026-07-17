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
  confidence?: number;
  score?: number;
  feedback?: string;
  detectedElements?: string[];
}

// Alias for backward compatibility
export type TrickAnalysisResult = TrickAnalysis;

const KNOWN_TRICKS: Record<string, { difficulty: string; xp_value: number }> = {
  ollie: { difficulty: 'Beginner', xp_value: 25 },
  kickflip: { difficulty: 'Intermediate', xp_value: 75 },
  heelflip: { difficulty: 'Intermediate', xp_value: 75 },
  boardslide: { difficulty: 'Intermediate', xp_value: 60 },
  noseslide: { difficulty: 'Intermediate', xp_value: 60 },
  tailslide: { difficulty: 'Intermediate', xp_value: 60 },
  'pop shove-it': { difficulty: 'Beginner', xp_value: 35 },
  'tre flip': { difficulty: 'Advanced', xp_value: 150 },
  '360 flip': { difficulty: 'Advanced', xp_value: 150 },
  hardflip: { difficulty: 'Advanced', xp_value: 120 },
  varial: { difficulty: 'Intermediate', xp_value: 80 },
  manual: { difficulty: 'Beginner', xp_value: 30 },
  grind: { difficulty: 'Intermediate', xp_value: 50 },
};

function detectTrickFromUri(uri: string): string | null {
  const filename = uri.split('/').pop()?.split('.')[0]?.toLowerCase() ?? '';
  for (const trick of Object.keys(KNOWN_TRICKS)) {
    if (filename.includes(trick.replace(' ', ''))) {
      return trick;
    }
  }
  return null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Analyzes a local video URI by detecting the trick from the filename.
 * For remote AI analysis, use analyzeTrick() instead.
 */
export async function analyzeTrickVideo(videoUri: string): Promise<TrickAnalysis> {
  const detectedKey = detectTrickFromUri(videoUri);
  const tricks = Object.keys(KNOWN_TRICKS);
  const finalKey = detectedKey ?? tricks[Math.floor(Math.random() * tricks.length)];
  const trickData = KNOWN_TRICKS[finalKey] ?? { difficulty: 'Intermediate', xp_value: 75 };
  const trickName = capitalize(finalKey);
  const confidence = parseFloat((0.65 + Math.random() * 0.25).toFixed(2));
  const score = Math.floor(60 + Math.random() * 40);

  return {
    difficulty: trickData.difficulty,
    tips: [
      'Keep your shoulders parallel to the board',
      'Snap hard off your back foot',
      'Keep your eyes on the landing',
    ],
    common_mistakes: ['Not popping high enough', 'Catching too early'],
    prerequisites: ['Ollie', 'Basic balance'],
    xp_value: trickData.xp_value,
    style_notes: `Keep working on ${trickName} — consistency comes with repetition.`,
    trickName,
    confidence,
    score,
    feedback: score >= 80 ? 'Great job!' : 'Keep practicing!',
    detectedElements: ['Pop timing', 'Board rotation', 'Landing stance'],
  };
}

/**
 * Analyzes a trick via the Supabase Edge Function (analyze-trick).
 * AI processing happens server-side — no API keys on the client.
 */
export async function analyzeTrick(
  trickName: string,
  description?: string,
  videoUrl?: string
): Promise<TrickAnalysis> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/analyze-trick`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `******`,
    },
    body: JSON.stringify({
      trick_name: trickName,
      description,
      video_url: videoUrl,
    }),
  });

  if (!res.ok) {
    throw new Error(`Trick analysis failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Saves the analysis result to the media record in Supabase.
 * @param mediaId - The ID of the media row to update
 * @param analysis - The trick analysis result
 */
export async function saveAnalysisResult(mediaId: string, analysis: TrickAnalysis): Promise<void> {
  const { error } = await supabase
    .from('media')
    .update({ trick_name: analysis.trickName })
    .eq('id', mediaId);
  if (error) throw error;
}

// Fallback for when edge function is unavailable
export function getFallbackAnalysis(trickName: string): TrickAnalysis {
  const trickData = KNOWN_TRICKS[trickName.toLowerCase()] ?? {
    difficulty: 'Intermediate',
    xp_value: 75,
  };
  return {
    difficulty: trickData.difficulty,
    tips: [
      'Keep your shoulders parallel to the board',
      'Snap hard off your back foot',
      'Keep your eyes on the landing',
    ],
    common_mistakes: ['Not popping high enough', 'Catching too early'],
    prerequisites: ['Ollie', 'Basic balance'],
    xp_value: trickData.xp_value,
    style_notes: `Keep working on ${trickName} — consistency comes with repetition.`,
    trickName,
    score: 0,
    feedback: 'Keep practicing!',
    detectedElements: [],
  };
}

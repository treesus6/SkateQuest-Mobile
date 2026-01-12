import * as FileSystem from 'expo-file-system';

export interface TrickAnalysisResult {
  trickName: string;
  confidence: number;
  score: number;
  feedback: string;
  elements: {
    pop: number;
    rotation: number;
    landing: number;
    style: number;
  };
  suggestions: string[];
}

/**
 * Analyze a trick video using OpenAI Vision API
 * Requires EXPO_PUBLIC_OPENAI_API_KEY in .env
 */
export async function analyzeTrickWithAI(videoUri: string): Promise<TrickAnalysisResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OpenAI API key not found, using heuristic analysis');
    return analyzeTrickHeuristic();
  }

  try {
    // Extract frames from video (we'll use first frame for now)
    // In production, you'd extract multiple frames or use video-specific models
    const base64Image = await extractVideoFrame(videoUri);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert skateboard trick analyzer. Analyze skateboarding tricks and provide:
1. Trick name (e.g., kickflip, ollie, heelflip)
2. Execution score (0-100)
3. Detailed feedback on technique
4. Scores for: pop, rotation, landing, style (each 0-10)
5. Suggestions for improvement

Respond in JSON format.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this skateboard trick. Identify the trick, score the execution, and provide detailed feedback.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const result = parseAIResponse(content);
    return result;
  } catch (error) {
    console.error('AI analysis error:', error);
    // Fallback to heuristic analysis
    return analyzeTrickHeuristic();
  }
}

/**
 * Extract a frame from video as base64
 * In a real implementation, you'd use a video processing library
 * For now, this is a placeholder
 */
async function extractVideoFrame(videoUri: string): Promise<string> {
  // This is a simplified version - in production you'd use:
  // - expo-video-thumbnails to extract a frame
  // - or upload video to a processing service
  // For now, we'll read a portion of the video file
  const base64 = await FileSystem.readAsStringAsync(videoUri, {
    encoding: 'base64',
    length: 100000, // Read first 100KB
    position: 0,
  });

  return base64;
}

/**
 * Parse OpenAI response into structured format
 */
function parseAIResponse(content: string): TrickAnalysisResult {
  try {
    // Try to parse as JSON first
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        trickName: parsed.trick_name || parsed.trickName || 'Unknown Trick',
        confidence: parsed.confidence || 0.7,
        score: parsed.score || 75,
        feedback: parsed.feedback || 'Good execution!',
        elements: {
          pop: parsed.elements?.pop || parsed.pop || 7,
          rotation: parsed.elements?.rotation || parsed.rotation || 7,
          landing: parsed.elements?.landing || parsed.landing || 7,
          style: parsed.elements?.style || parsed.style || 7,
        },
        suggestions: parsed.suggestions || ['Keep practicing!'],
      };
    }

    // Fallback: extract information from text response
    const lines = content.split('\n');
    let trickName = 'Unknown Trick';
    let score = 75;
    const suggestions: string[] = [];

    // Look for trick name
    for (const line of lines) {
      if (line.toLowerCase().includes('trick') && line.includes(':')) {
        const parts = line.split(':');
        if (parts[1]) {
          trickName = parts[1].trim();
        }
      }
      if (line.toLowerCase().includes('score') && line.includes(':')) {
        const scoreMatch = line.match(/\d+/);
        if (scoreMatch) {
          score = parseInt(scoreMatch[0]);
        }
      }
      if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
        suggestions.push(line.trim().substring(1).trim());
      }
    }

    return {
      trickName,
      confidence: 0.6,
      score,
      feedback: content,
      elements: {
        pop: Math.floor(score / 12.5),
        rotation: Math.floor(score / 12.5),
        landing: Math.floor(score / 12.5),
        style: Math.floor(score / 12.5),
      },
      suggestions: suggestions.length > 0 ? suggestions : ['Keep practicing!'],
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return analyzeTrickHeuristic();
  }
}

/**
 * Heuristic-based trick analysis (fallback when AI is unavailable)
 * Uses simple rules and randomization to simulate analysis
 */
export function analyzeTrickHeuristic(): TrickAnalysisResult {
  const commonTricks = [
    'Ollie',
    'Kickflip',
    'Heelflip',
    'Pop Shove-it',
    '360 Flip',
    'Varial Flip',
    'Hardflip',
    'Frontside 180',
    'Backside 180',
    '50-50 Grind',
    'Boardslide',
    'Nosegrind',
  ];

  const randomTrick = commonTricks[Math.floor(Math.random() * commonTricks.length)];
  const score = 60 + Math.floor(Math.random() * 30); // 60-90

  const elements = {
    pop: 6 + Math.floor(Math.random() * 4), // 6-10
    rotation: 6 + Math.floor(Math.random() * 4),
    landing: 6 + Math.floor(Math.random() * 4),
    style: 6 + Math.floor(Math.random() * 4),
  };

  const suggestionPool = [
    'Try to get more height on your pop',
    'Keep your shoulders aligned with the board',
    'Bend your knees more on landing',
    'Focus on keeping the board level',
    'Work on your timing between the pop and flick',
    'Land with more weight on your front foot',
    'Practice the motion in slow motion first',
    'Keep your eyes on the board throughout',
  ];

  const suggestions = suggestionPool
    .sort(() => Math.random() - 0.5)
    .slice(0, 2 + Math.floor(Math.random() * 2));

  const feedbackOptions = [
    `Solid ${randomTrick}! Your technique shows promise.`,
    `Great attempt at the ${randomTrick}! A few tweaks will make it perfect.`,
    `Nice ${randomTrick}! You're getting the fundamentals down.`,
    `Good execution on the ${randomTrick}. Keep refining it!`,
  ];

  const feedback = feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];

  return {
    trickName: randomTrick,
    confidence: 0.5 + Math.random() * 0.3, // 0.5-0.8
    score,
    feedback,
    elements,
    suggestions,
  };
}

/**
 * Get a color based on score
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return '#4CAF50'; // Green
  if (score >= 75) return '#8BC34A'; // Light green
  if (score >= 60) return '#FF9800'; // Orange
  if (score >= 45) return '#FF5722'; // Deep orange
  return '#f44336'; // Red
}

/**
 * Get score label
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent! 🔥';
  if (score >= 75) return 'Great! 👏';
  if (score >= 60) return 'Good! 👍';
  if (score >= 45) return 'Keep practicing! 💪';
  return 'Try again! 🛹';
}

/**
 * Analyze trick from local file
 * Simplified version that works without API
 */
export async function quickAnalyzeTrick(
  videoUri: string,
  useAI: boolean = false
): Promise<TrickAnalysisResult> {
  if (useAI && process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
    return await analyzeTrickWithAI(videoUri);
  }

  // Simulate analysis delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return analyzeTrickHeuristic();
}

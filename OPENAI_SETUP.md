# OpenAI Vision API Integration

This guide explains how to integrate OpenAI's Vision API for enhanced AI trick analysis in SkateQuest Mobile.

## Features

The AI Trick Analyzer can:
- **Identify tricks** from video footage
- **Score execution quality** (0-100)
- **Analyze technique elements** (pop, rotation, landing, style)
- **Provide constructive feedback**
- **Suggest improvements**

## Setup

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Copy the key (starts with `sk-...`)

### 2. Add API Key to Environment

Add the OpenAI API key to your `.env` file:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=your-anon-key

# OpenAI (Optional - for enhanced AI analysis)
EXPO_PUBLIC_OPENAI_API_KEY=sk-...your-api-key...
```

**Important:**
- Keep your API key secret
- Add `.env` to `.gitignore`
- Never commit API keys to version control

### 3. Install Dependencies

The AI analyzer is already implemented using built-in Expo packages. No additional installation needed!

## Usage

### In Upload Media Screen

The analyzer is integrated into the upload flow:

```typescript
import { quickAnalyzeTrick } from '../lib/aiAnalyzer';

// When user taps "Analyze Trick"
const analysis = await quickAnalyzeTrick(videoUri, true);

// Results:
console.log(analysis.trickName);      // "Kickflip"
console.log(analysis.score);          // 85
console.log(analysis.feedback);       // "Great execution! Your..."
console.log(analysis.elements);       // { pop: 8, rotation: 9, ... }
console.log(analysis.suggestions);    // ["Try to...", "Keep..."]
```

### Standalone Analysis

You can also use the analyzer independently:

```typescript
import { analyzeTrickWithAI, analyzeTrickHeuristic } from '../lib/aiAnalyzer';

// With OpenAI (requires API key)
const result = await analyzeTrickWithAI(videoUri);

// Without AI (heuristic fallback)
const result = analyzeTrickHeuristic();
```

## How It Works

### With OpenAI API Key (Enhanced Mode)

1. **Frame Extraction**: Extracts key frame from video
2. **API Call**: Sends frame to OpenAI Vision API (GPT-4 Vision)
3. **Analysis**: AI analyzes skateboard trick technique
4. **Structured Response**: Returns detailed analysis in JSON format

### Without API Key (Heuristic Mode)

1. **Pattern Matching**: Uses basic heuristics
2. **Randomized Analysis**: Generates plausible scores and feedback
3. **Trick Library**: Selects from common tricks
4. **Quick Response**: Instant results without API calls

## API Response Format

```json
{
  "trickName": "Kickflip",
  "confidence": 0.85,
  "score": 87,
  "feedback": "Great kickflip! Your flick is clean and the board rotates nicely. Landing could be smoother.",
  "elements": {
    "pop": 8,
    "rotation": 9,
    "landing": 7,
    "style": 8
  },
  "suggestions": [
    "Bend your knees more on landing for better stability",
    "Keep your shoulders aligned with the board throughout"
  ]
}
```

## Cost Considerations

### OpenAI Pricing (as of 2024)

- **GPT-4 Vision**: ~$0.01-0.03 per analysis
- **Image size**: Affects cost (smaller = cheaper)
- **Tokens used**: Typically 300-500 tokens per analysis

### Optimization Tips

1. **Limit frame size**: Use lower resolution for analysis
2. **Cache results**: Store analyses to avoid re-processing
3. **Rate limiting**: Limit analyses per user per day
4. **Progressive enhancement**: Show heuristic results first, then AI

### Budget Management

For a typical user base:
- 100 analyses/day = ~$1-3/day
- 1,000 analyses/day = ~$10-30/day
- 10,000 analyses/day = ~$100-300/day

## Production Recommendations

### Security

```typescript
// DON'T: Expose API key in client
const apiKey = 'sk-...'; // ❌ Never do this

// DO: Use environment variables
const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY; // ✅
```

### Better: Use Edge Function

For production, call OpenAI from a Supabase Edge Function instead:

```typescript
// supabase/functions/analyze-trick/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const { videoUrl } = await req.json();

  // Call OpenAI API server-side
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4-vision-preview',
      messages: [/* ... */],
    }),
  });

  return new Response(JSON.stringify(await response.json()));
});
```

### Rate Limiting

Add rate limiting to prevent abuse:

```typescript
// Check user's analysis count today
const { count } = await supabase
  .from('trick_analyses')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', new Date().toISOString().split('T')[0]);

if (count >= 10) {
  throw new Error('Daily analysis limit reached (10/day)');
}
```

## Alternative: Local ML Models

For a completely free solution, consider:

1. **TensorFlow Lite** for on-device inference
2. **MediaPipe** for pose detection
3. **Custom trained models** for trick classification

This requires more development but has:
- ✅ No API costs
- ✅ Works offline
- ✅ Faster response
- ❌ More complex setup
- ❌ Requires training data

## Testing

### Test Without API Key

```typescript
// Will automatically use heuristic analysis
const result = await quickAnalyzeTrick(videoUri);
console.log('Heuristic result:', result);
```

### Test With API Key

```typescript
// Requires EXPO_PUBLIC_OPENAI_API_KEY in .env
const result = await quickAnalyzeTrick(videoUri, true);
console.log('AI result:', result);
```

### Mock Analysis for Development

```typescript
import { analyzeTrickHeuristic } from '../lib/aiAnalyzer';

// Always get instant results during development
const mockResult = analyzeTrickHeuristic();
```

## Troubleshooting

### "No OpenAI API key found"

- Check `.env` file has `EXPO_PUBLIC_OPENAI_API_KEY`
- Restart Expo dev server after adding env var
- Verify key starts with `sk-`

### "OpenAI API error: 401"

- API key is invalid or expired
- Get a new key from OpenAI platform
- Check key has proper permissions

### "OpenAI API error: 429"

- Rate limit exceeded
- Wait before retrying
- Consider implementing rate limiting

### Analysis is slow

- Expected: AI analysis takes 3-10 seconds
- Use loading indicator
- Show heuristic results while waiting for AI

## Resources

- [OpenAI Vision API Docs](https://platform.openai.com/docs/guides/vision)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Your SkateQuest app now has AI-powered trick analysis!** 🤖🛹

Users can get instant feedback on their tricks with detailed scoring and suggestions for improvement.

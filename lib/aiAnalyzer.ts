// This file is kept for backward compatibility.
// All AI analysis now goes through the server-side Edge Function via trickAnalyzer.ts
export { analyzeTrick, getFallbackAnalysis } from './trickAnalyzer';
export type { TrickAnalysis } from './trickAnalyzer';

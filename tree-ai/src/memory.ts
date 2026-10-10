import type { AgentId, AgentStats, LessonRecord, MemoryStore, OutcomeRecord } from './types';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const tokenize = (value: string): Set<string> =>
  new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((part) => part.trim())
      .filter(Boolean),
  );

export class InMemoryLearningStore implements MemoryStore {
  private readonly outcomes: OutcomeRecord[] = [];
  private readonly lessons: LessonRecord[] = [];

  recordOutcome(record: OutcomeRecord): void {
    this.outcomes.push({
      ...record,
      qualityScore:
        typeof record.qualityScore === 'number' ? clamp01(record.qualityScore) : record.qualityScore,
    });
  }

  getAgentStats(agentId: AgentId): AgentStats {
    const records = this.outcomes.filter((record) => record.agentId === agentId);
    const attempts = records.length;
    const successes = records.filter((record) => record.success).length;
    const qualityRecords = records.filter(
      (record): record is OutcomeRecord & { qualityScore: number } =>
        typeof record.qualityScore === 'number',
    );

    const averageQuality =
      qualityRecords.length === 0
        ? 0.65
        : qualityRecords.reduce((sum, record) => sum + record.qualityScore, 0) /
          qualityRecords.length;

    // Bayesian smoothing prevents one lucky or unlucky task from dominating routing.
    const priorAttempts = 4;
    const priorSuccesses = 2.6;
    const smoothedSuccessRate = (successes + priorSuccesses) / (attempts + priorAttempts);
    const learnedScore = clamp01(smoothedSuccessRate * 0.7 + averageQuality * 0.3);

    return {
      agentId,
      attempts,
      successes,
      averageQuality,
      learnedScore,
    };
  }

  addLesson(record: LessonRecord): void {
    this.lessons.push({ ...record, confidence: clamp01(record.confidence) });
  }

  searchLessons(query: string, limit = 5): LessonRecord[] {
    const queryTokens = tokenize(query);
    if (queryTokens.size === 0) return [];

    return this.lessons
      .map((lesson) => {
        const lessonTokens = tokenize(`${lesson.topic} ${lesson.text}`);
        let overlap = 0;
        for (const token of queryTokens) {
          if (lessonTokens.has(token)) overlap += 1;
        }

        return {
          lesson,
          score: (overlap / queryTokens.size) * 0.8 + lesson.confidence * 0.2,
        };
      })
      .filter((entry) => entry.score > 0.15)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, limit))
      .map((entry) => entry.lesson);
  }
}

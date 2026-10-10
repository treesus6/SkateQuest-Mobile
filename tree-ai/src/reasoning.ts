import type { AgentProfile, LessonRecord, SupervisorPlan, TaskRequest } from './types';

export interface ReasoningInput {
  task: TaskRequest;
  agent: AgentProfile;
  plan: SupervisorPlan;
  lessons: LessonRecord[];
}

export interface ReasoningResult {
  summary: string;
  confidence: number;
  assumptions: string[];
  nextSteps: string[];
}

export interface ReasoningEngine {
  reason(input: ReasoningInput): Promise<ReasoningResult>;
}

/**
 * Safe fallback used before a hosted model adapter is connected.
 * It makes the orchestration core runnable and testable without pretending
 * to be a full language model.
 */
export class RuleBasedReasoningEngine implements ReasoningEngine {
  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    const approvalCount = input.plan.actions.filter(
      (entry) => entry.policy.requiresOwnerApproval,
    ).length;
    const verificationCount = input.plan.actions.filter(
      (entry) => entry.policy.requiresVerification,
    ).length;

    return {
      summary: `${input.agent.name} selected for: ${input.task.goal}`,
      confidence: input.plan.rankedAgents[0]?.score ?? input.agent.baseConfidence,
      assumptions: [
        'No hidden credentials are available to the agent.',
        'External side effects remain blocked until the policy allows them.',
        ...(input.lessons.length > 0
          ? [`${input.lessons.length} relevant learned lesson(s) are available.`]
          : []),
      ],
      nextSteps: [
        ...input.plan.actions.map((entry) => `${entry.action.title} [${entry.policy.autonomy}]`),
        ...(verificationCount > 0 ? [`QA verification required for ${verificationCount} action(s).`] : []),
        ...(approvalCount > 0 ? [`Owner approval required for ${approvalCount} action(s).`] : []),
      ],
    };
  }
}

import { AGENTS, SPECIALIST_AGENT_IDS } from './agents';
import { evaluateActionPolicy } from './policy';
import type {
  ActionKind,
  AgentId,
  CandidateAction,
  MemoryStore,
  OutcomeRecord,
  RankedAgent,
  SupervisorPlan,
  TaskRequest,
} from './types';

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const containsAny = (text: string, terms: string[]): boolean => terms.some((term) => text.includes(term));

const uniqueActions = (actions: CandidateAction[]): CandidateAction[] => {
  const seen = new Set<ActionKind>();
  return actions.filter((action) => {
    if (seen.has(action.kind)) return false;
    seen.add(action.kind);
    return true;
  });
};

export class TreeAiSupervisor {
  constructor(private readonly memory: MemoryStore) {}

  plan(request: TaskRequest): SupervisorPlan {
    const rankedAgents = this.rankAgents(request);
    const selectedAgent = rankedAgents[0]?.agent.id ?? 'planner';
    const actions = this.inferActions(request).map((action) => ({
      action,
      policy: evaluateActionPolicy(action),
    }));
    const needsVerification = actions.some((entry) => entry.policy.requiresVerification);
    const requiresApproval = actions.some((entry) => entry.policy.requiresOwnerApproval);

    return {
      taskId: request.id,
      selectedAgent,
      rankedAgents,
      actions,
      verificationAgent: needsVerification && selectedAgent !== 'qa' ? 'qa' : undefined,
      status: requiresApproval ? 'approval_required' : 'ready',
    };
  }

  recordOutcome(record: OutcomeRecord): void {
    this.memory.recordOutcome(record);
  }

  rankAgents(request: TaskRequest): RankedAgent[] {
    const goal = normalize(request.goal);

    return SPECIALIST_AGENT_IDS.map((agentId) => {
      const agent = AGENTS[agentId];
      const learned = this.memory.getAgentStats(agentId).learnedScore;
      const matchedCapabilities = agent.capabilities.filter((capability) =>
        goal.includes(normalize(capability)),
      );
      const keywordScore = Math.min(1, matchedCapabilities.length / 3);
      const preferredBoost = request.preferredAgent === agentId ? 0.2 : 0;
      const skateQuestBoost = agentId === 'skatequest' && goal.includes('skatequest') ? 0.18 : 0;
      const qaPenalty = agentId === 'qa' && !containsAny(goal, ['verify', 'review', 'check', 'test', 'qa']) ? 0.12 : 0;
      const score = Math.max(
        0,
        Math.min(
          1,
          agent.baseConfidence * 0.3 +
            learned * 0.35 +
            keywordScore * 0.35 +
            preferredBoost +
            skateQuestBoost -
            qaPenalty,
        ),
      );

      const reasons: string[] = [
        `base confidence ${agent.baseConfidence.toFixed(2)}`,
        `learned score ${learned.toFixed(2)}`,
      ];
      if (matchedCapabilities.length > 0) {
        reasons.push(`matched: ${matchedCapabilities.join(', ')}`);
      }
      if (preferredBoost > 0) reasons.push('explicitly preferred');
      if (skateQuestBoost > 0) reasons.push('SkateQuest-specific task');

      return { agent, score, reasons };
    }).sort((a, b) => b.score - a.score);
  }

  private inferActions(request: TaskRequest): CandidateAction[] {
    const goal = normalize(request.goal);
    const actions: CandidateAction[] = [
      this.action(request.id, 'plan', 'Plan the task', 'Break the goal into ordered steps.', true, false),
    ];

    if (containsAny(goal, ['research', 'find', 'look up', 'compare', 'latest', 'documentation', 'price'])) {
      actions.push(
        this.action(
          request.id,
          'research',
          'Research relevant information',
          'Gather and compare evidence needed to complete the goal.',
          true,
          false,
        ),
      );
    }

    if (containsAny(goal, ['code', 'fix', 'debug', 'build', 'app', 'github', 'typescript', 'javascript', 'api'])) {
      actions.push(
        this.action(
          request.id,
          'analyze',
          'Inspect technical state',
          'Read the relevant code, logs, configuration, and dependencies before changing anything.',
          true,
          false,
        ),
        this.action(
          request.id,
          'code_change',
          'Prepare code changes',
          'Make reversible changes on an isolated branch or workspace.',
          true,
          false,
        ),
        this.action(
          request.id,
          'test',
          'Verify the implementation',
          'Run targeted checks and regression tests.',
          true,
          false,
        ),
      );
    }

    if (containsAny(goal, ['config', 'configuration', 'workflow', 'setting'])) {
      actions.push(
        this.action(
          request.id,
          'config_change',
          'Prepare configuration change',
          'Modify configuration in a reversible workspace and verify the effect.',
          true,
          false,
        ),
      );
    }

    if (containsAny(goal, ['database', 'supabase', 'save data', 'write data', 'update record'])) {
      actions.push(
        this.action(
          request.id,
          'data_write',
          'Prepare structured data change',
          'Write persistent data only through an approved, auditable tool and verify it afterward.',
          true,
          true,
        ),
      );
    }

    if (containsAny(goal, ['email', 'message', 'reply', 'contact'])) {
      actions.push(
        this.action(
          request.id,
          'draft',
          'Draft communication',
          'Prepare the message without sending it.',
          true,
          false,
        ),
      );
      if (containsAny(goal, ['send', 'reply to', 'contact them'])) {
        actions.push(
          this.action(
            request.id,
            'send_message',
            'Send communication',
            'Send an external message after owner approval.',
            false,
            true,
          ),
        );
      }
    }

    if (containsAny(goal, ['publish', 'release', 'deploy', 'production', 'go live'])) {
      actions.push(
        this.action(
          request.id,
          'production_change',
          'Change production state',
          'Publish, deploy, release, or otherwise affect a live system.',
          false,
          true,
        ),
      );
    }

    if (containsAny(goal, ['delete', 'erase', 'destroy', 'remove permanently'])) {
      actions.push(
        this.action(
          request.id,
          'delete',
          'Delete persistent state',
          'Remove data or resources in a way that may be difficult to reverse.',
          false,
          true,
        ),
      );
    }

    if (containsAny(goal, ['buy', 'purchase', 'pay', 'spend', 'order'])) {
      actions.push(
        this.action(
          request.id,
          'spend',
          'Spend money',
          'Commit funds or place an order.',
          false,
          true,
        ),
      );
    }

    if (containsAny(goal, ['sign', 'agreement', 'contract', 'accept terms'])) {
      actions.push(
        this.action(
          request.id,
          'agreement',
          'Enter an agreement',
          'Accept terms or create a commitment on the owner’s behalf.',
          false,
          true,
        ),
      );
    }

    if (actions.length === 1) {
      actions.push(
        this.action(
          request.id,
          'analyze',
          'Analyze the request',
          'Determine the best approach using available context and tools.',
          true,
          false,
        ),
      );
    }

    return uniqueActions(actions);
  }

  private action(
    taskId: string,
    kind: ActionKind,
    title: string,
    description: string,
    reversible: boolean,
    requiresExternalSideEffect: boolean,
  ): CandidateAction {
    return {
      id: `${taskId}:${kind}`,
      title,
      kind,
      description,
      reversible,
      requiresExternalSideEffect,
    };
  }
}

export const selectAgentId = (plan: SupervisorPlan): AgentId => plan.selectedAgent;

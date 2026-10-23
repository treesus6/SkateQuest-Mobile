import { AGENTS } from './agents';
import type { MemoryStore, SupervisorPlan, TaskRequest } from './types';
import type { ReasoningEngine, ReasoningResult } from './reasoning';
import { TreeAiSupervisor } from './supervisor';

export interface RuntimeResult {
  plan: SupervisorPlan;
  reasoning: ReasoningResult;
  pendingApprovalActionIds: string[];
}

export class TreeAiRuntime {
  private readonly supervisor: TreeAiSupervisor;

  constructor(
    private readonly memory: MemoryStore,
    private readonly reasoningEngine: ReasoningEngine,
  ) {
    this.supervisor = new TreeAiSupervisor(memory);
  }

  async prepareTask(task: TaskRequest): Promise<RuntimeResult> {
    const plan = this.supervisor.plan(task);
    const selectedAgent = AGENTS[plan.selectedAgent];
    const lessons = this.memory.searchLessons(task.goal, 5);
    const reasoning = await this.reasoningEngine.reason({
      task,
      agent: selectedAgent,
      plan,
      lessons,
    });

    return {
      plan,
      reasoning,
      pendingApprovalActionIds: plan.actions
        .filter((entry) => entry.policy.requiresOwnerApproval)
        .map((entry) => entry.action.id),
    };
  }

  getSupervisor(): TreeAiSupervisor {
    return this.supervisor;
  }
}

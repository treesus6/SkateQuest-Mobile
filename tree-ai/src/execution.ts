import type { AgentId, MemoryStore, OutcomeRecord, SupervisorPlan } from './types';
import type {
  GuardedExecutionResult,
  ToolExecutionContext,
  ToolRegistry,
  ToolResult,
} from './tools';

const failedVerification = (summary: string): ToolResult => ({
  ok: false,
  summary,
});

export class GuardedExecutor {
  constructor(
    private readonly tools: ToolRegistry,
    private readonly memory: MemoryStore,
  ) {}

  async executePlan(
    plan: SupervisorPlan,
    context: ToolExecutionContext,
  ): Promise<GuardedExecutionResult[]> {
    const results: GuardedExecutionResult[] = [];

    for (const entry of plan.actions) {
      const { action, policy } = entry;

      if (policy.requiresOwnerApproval && !context.approvedActionIds.has(action.id)) {
        results.push({ status: 'approval_required', action, policy });
        continue;
      }

      const tool = this.tools.findFor(action);
      if (!tool) {
        results.push({ status: 'tool_missing', action, policy });
        continue;
      }

      try {
        const result = await tool.execute(action, context);
        let verification: ToolResult | undefined;

        if (policy.requiresVerification) {
          verification = tool.verify
            ? await tool.verify(action, result, context)
            : failedVerification(
                `Action ${action.id} requires verification, but tool ${tool.name} has no verifier.`,
              );
        }

        const completed = result.ok && (!policy.requiresVerification || verification?.ok === true);
        results.push({
          status: completed ? 'completed' : 'failed',
          action,
          policy,
          toolName: tool.name,
          result,
          verification,
        });
        this.recordOutcome(plan, action.kind, completed, result, verification);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const result: ToolResult = { ok: false, summary: `Tool execution failed: ${message}` };
        results.push({
          status: 'failed',
          action,
          policy,
          toolName: tool.name,
          result,
        });
        this.recordOutcome(plan, action.kind, false, result);
      }
    }

    return results;
  }

  private recordOutcome(
    plan: SupervisorPlan,
    actionKind: OutcomeRecord['actionKind'],
    success: boolean,
    result: ToolResult,
    verification?: ToolResult,
  ): void {
    const qualityScore = success ? (verification?.ok === true ? 1 : 0.85) : 0.2;
    const record: OutcomeRecord = {
      id: `${plan.taskId}:${actionKind}:${Date.now()}`,
      taskId: plan.taskId,
      agentId: plan.selectedAgent as AgentId,
      actionKind,
      success,
      qualityScore,
      notes: verification ? `${result.summary} | Verification: ${verification.summary}` : result.summary,
      createdAt: new Date().toISOString(),
    };
    this.memory.recordOutcome(record);
  }
}

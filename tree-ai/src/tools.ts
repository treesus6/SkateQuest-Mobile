import type { ActionKind, CandidateAction, PolicyDecision } from './types';

export interface ToolExecutionContext {
  taskId: string;
  approvedActionIds: Set<string>;
  metadata?: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
}

export interface AgentTool {
  name: string;
  description: string;
  supportedActions: ActionKind[];
  execute(action: CandidateAction, context: ToolExecutionContext): Promise<ToolResult>;
  verify?(action: CandidateAction, result: ToolResult, context: ToolExecutionContext): Promise<ToolResult>;
}

export interface GuardedExecutionResult {
  status: 'completed' | 'approval_required' | 'tool_missing' | 'failed';
  action: CandidateAction;
  policy: PolicyDecision;
  toolName?: string;
  result?: ToolResult;
  verification?: ToolResult;
}

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  list(): AgentTool[] {
    return [...this.tools.values()];
  }

  findFor(action: CandidateAction): AgentTool | undefined {
    return this.list().find((tool) => tool.supportedActions.includes(action.kind));
  }
}

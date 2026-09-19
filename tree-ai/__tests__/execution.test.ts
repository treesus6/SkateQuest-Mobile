import { GuardedExecutor } from '../src/execution';
import { InMemoryLearningStore } from '../src/memory';
import { TreeAiSupervisor } from '../src/supervisor';
import { ToolRegistry } from '../src/tools';

const makeContext = (approvedActionIds: string[] = []) => ({
  taskId: 'task-1',
  approvedActionIds: new Set(approvedActionIds),
});

describe('GuardedExecutor', () => {
  it('blocks approval-gated actions before invoking a tool', async () => {
    const memory = new InMemoryLearningStore();
    const tools = new ToolRegistry();
    let calls = 0;

    tools.register({
      name: 'message-tool',
      description: 'test sender',
      supportedActions: ['send_message'],
      async execute() {
        calls += 1;
        return { ok: true, summary: 'sent' };
      },
      async verify() {
        return { ok: true, summary: 'verified' };
      },
    });

    const plan = new TreeAiSupervisor(memory).plan({
      id: 'task-1',
      goal: 'Send the email',
    });
    const executor = new GuardedExecutor(tools, memory);
    const results = await executor.executePlan(plan, makeContext());

    expect(calls).toBe(0);
    expect(results.some((result) => result.status === 'approval_required')).toBe(true);
  });

  it('executes an approved action and records the outcome only after verification', async () => {
    const memory = new InMemoryLearningStore();
    const tools = new ToolRegistry();

    tools.register({
      name: 'message-tool',
      description: 'test sender',
      supportedActions: ['send_message'],
      async execute() {
        return { ok: true, summary: 'sent' };
      },
      async verify() {
        return { ok: true, summary: 'delivery acknowledged' };
      },
    });

    const plan = new TreeAiSupervisor(memory).plan({
      id: 'task-1',
      goal: 'Send the email',
    });
    const sendAction = plan.actions.find((entry) => entry.action.kind === 'send_message');
    expect(sendAction).toBeDefined();

    const executor = new GuardedExecutor(tools, memory);
    const results = await executor.executePlan(
      plan,
      makeContext(sendAction ? [sendAction.action.id] : []),
    );

    const sendResult = results.find((result) => result.action.kind === 'send_message');
    expect(sendResult?.status).toBe('completed');
    expect(memory.getAgentStats(plan.selectedAgent).attempts).toBeGreaterThan(0);
  });
});

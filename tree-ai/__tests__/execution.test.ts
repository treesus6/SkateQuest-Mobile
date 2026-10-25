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
    expect(results.some(result => result.status === 'approval_required')).toBe(true);
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
    const sendAction = plan.actions.find(entry => entry.action.kind === 'send_message');
    expect(sendAction).toBeDefined();

    const executor = new GuardedExecutor(tools, memory);
    const results = await executor.executePlan(
      plan,
      makeContext(sendAction ? [sendAction.action.id] : [])
    );

    const sendResult = results.find(result => result.action.kind === 'send_message');
    expect(sendResult?.status).toBe('completed');
    expect(memory.getAgentStats(plan.selectedAgent).attempts).toBeGreaterThan(0);
  });
});

describe('execution policy boundary', () => {
  it('ignores a downgraded policy supplied in a plan', async () => {
    const memory = new InMemoryLearningStore();
    const registry = new ToolRegistry();
    const sent: string[] = [];
    registry.register({
      name: 'sender',
      description: 'test sender',
      supportedActions: ['send_message'],
      async execute(action) {
        sent.push(action.id);
        return { ok: true, summary: 'sent' };
      },
      async verify() {
        return { ok: true, summary: 'verified' };
      },
    });
    const plan = new TreeAiSupervisor(memory).plan({ id: 'task-1', goal: 'Send the email' });
    const entry = plan.actions.find(item => item.action.kind === 'send_message')!;
    entry.policy.requiresOwnerApproval = false;
    entry.policy.requiresVerification = false;
    const results = await new GuardedExecutor(registry, memory).executePlan(plan, makeContext());
    expect(sent).toEqual([]);
    expect(results.find(result => result.action.kind === 'send_message')?.status).toBe(
      'approval_required'
    );
  });

  it('does not perform a write if its required verifier is missing', async () => {
    const memory = new InMemoryLearningStore();
    const registry = new ToolRegistry();
    const writes: string[] = [];
    registry.register({
      name: 'editor',
      description: 'test editor',
      supportedActions: ['code_change'],
      async execute(action) {
        writes.push(action.id);
        return { ok: true, summary: 'written' };
      },
    });
    const plan = new TreeAiSupervisor(memory).plan({ id: 'task-1', goal: 'Fix the code' });
    const results = await new GuardedExecutor(registry, memory).executePlan(plan, makeContext());
    expect(writes).toEqual([]);
    expect(results.find(result => result.action.kind === 'code_change')?.status).toBe('failed');
  });
});

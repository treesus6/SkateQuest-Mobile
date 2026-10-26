import { describe, expect, it } from '@jest/globals';
import { GuardedExecutor } from '../src/execution';
import { InMemoryLearningStore } from '../src/memory';
import { TreeAiSupervisor } from '../src/supervisor';
import { ToolRegistry } from '../src/tools';

const registerPrerequisites = (tools: ToolRegistry) =>
  tools.register({
    name: 'prerequisites',
    description: 'test planning and inspection',
    supportedActions: ['plan', 'analyze', 'draft'],
    async execute() {
      return { ok: true, summary: 'prepared' };
    },
  });

const makeContext = (approvedActionIds: string[] = []) => ({
  taskId: 'task-1',
  approvedActionIds: new Set(approvedActionIds),
});

describe('GuardedExecutor', () => {
  it('blocks approval-gated actions before invoking a tool', async () => {
    const memory = new InMemoryLearningStore();
    const tools = new ToolRegistry();
    registerPrerequisites(tools);
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
    registerPrerequisites(tools);

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
    registerPrerequisites(registry);
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
    registerPrerequisites(registry);
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

describe('ordered execution prerequisites', () => {
  it.each([
    'test failure',
    'verification failure',
    'missing tool',
    'missing verifier',
    'execution exception',
    'verification exception',
    'missing approval',
    'success',
  ])('gates deployment after %s', async (scenario: string) => {
    const memory = new InMemoryLearningStore();
    const tools = new ToolRegistry();
    const calls: string[] = [];
    const plan = new TreeAiSupervisor(memory).plan({
      id: 'task-1',
      goal: 'Fix the code and deploy the release to production',
    });
    for (const { action } of plan.actions) {
      if (scenario === 'missing tool' && action.kind === 'test') continue;
      tools.register({
        name: action.kind,
        description: 'test adapter',
        supportedActions: [action.kind],
        async execute() {
          calls.push(action.kind);
          if (scenario === 'execution exception' && action.kind === 'test')
            throw new Error('test crashed');
          return {
            ok: !(scenario === 'test failure' && action.kind === 'test'),
            summary: 'execution',
          };
        },
        verify:
          scenario === 'missing verifier' && action.kind === 'code_change'
            ? undefined
            : async () => {
                if (scenario === 'verification exception' && action.kind === 'code_change')
                  throw new Error('verification crashed');
                return {
                  ok: !(scenario === 'verification failure' && action.kind === 'code_change'),
                  summary: 'verification',
                };
              },
      });
    }
    if (scenario === 'missing approval') plan.actions[2].policy.requiresOwnerApproval = true;
    const results = await new GuardedExecutor(tools, memory).executePlan(
      plan,
      makeContext(['task-1:production_change'])
    );
    const deployment = results.find(result => result.action.kind === 'production_change');
    if (scenario === 'success') {
      expect(calls).toEqual(['plan', 'analyze', 'code_change', 'test', 'production_change']);
      expect(deployment?.status).toBe('completed');
    } else {
      expect(calls).not.toContain('production_change');
      expect(deployment?.status).toBe('blocked');
      expect(results).toHaveLength(plan.actions.length);
      expect(memory.getAgentStats(plan.selectedAgent).attempts).toBe(calls.length);
    }
  });
});

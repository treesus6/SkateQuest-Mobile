import { InMemoryLearningStore } from '../src/memory';
import { TreeAiSupervisor } from '../src/supervisor';
import type { OutcomeRecord } from '../src/types';

describe('TreeAiSupervisor', () => {
  it('requires owner approval for external messages and production changes', () => {
    const memory = new InMemoryLearningStore();
    const supervisor = new TreeAiSupervisor(memory);
    const plan = supervisor.plan({
      id: 'dangerous-1',
      goal: 'Send the email and deploy the release to production',
    });

    expect(plan.status).toBe('approval_required');
    expect(
      plan.actions.some(
        (entry) => entry.action.kind === 'send_message' && entry.policy.requiresOwnerApproval,
      ),
    ).toBe(true);
    expect(
      plan.actions.some(
        (entry) => entry.action.kind === 'production_change' && entry.policy.requiresOwnerApproval,
      ),
    ).toBe(true);
  });

  it('allows reversible code work but requires QA verification', () => {
    const memory = new InMemoryLearningStore();
    const supervisor = new TreeAiSupervisor(memory);
    const plan = supervisor.plan({
      id: 'code-1',
      goal: 'Debug the TypeScript code and fix the app build',
    });

    const codeChange = plan.actions.find((entry) => entry.action.kind === 'code_change');
    expect(codeChange?.policy.autonomy).toBe('auto_verify');
    expect(codeChange?.policy.requiresOwnerApproval).toBe(false);
    expect(plan.verificationAgent).toBe('qa');
  });

  it('uses outcome history to improve future routing', () => {
    const memory = new InMemoryLearningStore();
    const supervisor = new TreeAiSupervisor(memory);
    const task = { id: 'learning-1', goal: 'Test and verify the result' };

    const before = supervisor.plan(task).selectedAgent;
    expect(before).toBe('qa');

    for (let index = 0; index < 30; index += 1) {
      const coderOutcome: OutcomeRecord = {
        id: `coder-${index}`,
        taskId: `past-coder-${index}`,
        agentId: 'coder',
        actionKind: 'test',
        success: true,
        qualityScore: 1,
        createdAt: new Date(2026, 0, index + 1).toISOString(),
      };
      const qaOutcome: OutcomeRecord = {
        id: `qa-${index}`,
        taskId: `past-qa-${index}`,
        agentId: 'qa',
        actionKind: 'test',
        success: false,
        qualityScore: 0.1,
        createdAt: new Date(2026, 1, index + 1).toISOString(),
      };
      memory.recordOutcome(coderOutcome);
      memory.recordOutcome(qaOutcome);
    }

    const after = supervisor.plan(task).selectedAgent;
    expect(after).toBe('coder');
  });
});

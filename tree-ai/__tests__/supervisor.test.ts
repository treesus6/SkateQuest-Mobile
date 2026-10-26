import { describe, expect, it } from '@jest/globals';
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
        entry => entry.action.kind === 'send_message' && entry.policy.requiresOwnerApproval
      )
    ).toBe(true);
    expect(
      plan.actions.some(
        entry => entry.action.kind === 'production_change' && entry.policy.requiresOwnerApproval
      )
    ).toBe(true);
  });

  it('allows reversible code work but requires QA verification', () => {
    const memory = new InMemoryLearningStore();
    const supervisor = new TreeAiSupervisor(memory);
    const plan = supervisor.plan({
      id: 'code-1',
      goal: 'Debug the TypeScript code and fix the app build',
    });

    const codeChange = plan.actions.find(entry => entry.action.kind === 'code_change');
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

describe('modification intent', () => {
  it.each([
    'Review the code without changing any files',
    'Research API documentation',
    'Review the code',
    'Explain how to fix the TypeScript code',
    'Find a fix for the app build',
    'Fix the code, but do not modify any files',
    "Fix the code, but don't change files",
    'Read-only review of code, configuration and database deployment',
  ])('keeps inspection read-only: %s', (goal: string) => {
    const plan = new TreeAiSupervisor(new InMemoryLearningStore()).plan({ id: 'read-only', goal });
    expect(
      plan.actions.some(({ action }) => action.kind === 'analyze' || action.kind === 'research')
    ).toBe(true);
    expect(
      plan.actions.filter(({ action }) =>
        ['code_change', 'config_change', 'data_write', 'production_change'].includes(action.kind)
      )
    ).toEqual([]);
  });

  it.each([
    'Fix the code',
    'Please update the API implementation',
    'Review the code and then fix the bug',
    'Can you refactor the TypeScript code?',
  ])('retains requested edits: %s', (goal: string) => {
    const plan = new TreeAiSupervisor(new InMemoryLearningStore()).plan({ id: 'edit', goal });
    expect(plan.actions.map(({ action }) => action.kind)).toEqual([
      'plan',
      'analyze',
      'code_change',
      'test',
    ]);
  });
});

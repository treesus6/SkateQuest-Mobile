import type { ActionKind, CandidateAction, PolicyDecision } from './types';

const OWNER_APPROVAL_ACTIONS = new Set<ActionKind>([
  'send_message',
  'publish',
  'production_change',
  'delete',
  'spend',
  'agreement',
]);

const VERIFIED_ACTIONS = new Set<ActionKind>([
  'code_change',
  'config_change',
  'data_write',
]);

export const evaluateActionPolicy = (action: CandidateAction): PolicyDecision => {
  if (OWNER_APPROVAL_ACTIONS.has(action.kind)) {
    return {
      autonomy: 'ask_owner',
      risk: 'high',
      reason: `${action.kind} can affect people, money, public state, production, or important data and must be approved by the owner.`,
      requiresVerification: true,
      requiresOwnerApproval: true,
    };
  }

  if (VERIFIED_ACTIONS.has(action.kind)) {
    return {
      autonomy: 'auto_verify',
      risk: action.reversible ? 'medium' : 'high',
      reason: `${action.kind} may change persistent state, so the system may prepare or perform it only inside its allowed sandbox and must verify the result before completion.`,
      requiresVerification: true,
      requiresOwnerApproval: !action.reversible || action.requiresExternalSideEffect,
    };
  }

  return {
    autonomy: 'auto',
    risk: 'low',
    reason: `${action.kind} is read-only, analytical, or locally reversible and can run automatically.`,
    requiresVerification: false,
    requiresOwnerApproval: false,
  };
};

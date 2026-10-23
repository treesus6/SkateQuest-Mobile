export type AutonomyLevel = 'auto' | 'auto_verify' | 'ask_owner';

export type RiskLevel = 'low' | 'medium' | 'high';

export type ActionKind =
  | 'read'
  | 'research'
  | 'plan'
  | 'analyze'
  | 'calculate'
  | 'test'
  | 'draft'
  | 'code_change'
  | 'config_change'
  | 'data_write'
  | 'send_message'
  | 'publish'
  | 'production_change'
  | 'delete'
  | 'spend'
  | 'agreement';

export type AgentId =
  | 'supervisor'
  | 'planner'
  | 'coder'
  | 'researcher'
  | 'skatequest'
  | 'files'
  | 'qa';

export interface TaskRequest {
  id: string;
  goal: string;
  context?: Record<string, unknown>;
  preferredAgent?: AgentId;
}

export interface CandidateAction {
  id: string;
  title: string;
  kind: ActionKind;
  description: string;
  reversible: boolean;
  requiresExternalSideEffect: boolean;
}

export interface PolicyDecision {
  autonomy: AutonomyLevel;
  risk: RiskLevel;
  reason: string;
  requiresVerification: boolean;
  requiresOwnerApproval: boolean;
}

export interface AgentProfile {
  id: AgentId;
  name: string;
  description: string;
  capabilities: string[];
  baseConfidence: number;
}

export interface RankedAgent {
  agent: AgentProfile;
  score: number;
  reasons: string[];
}

export interface OutcomeRecord {
  id: string;
  taskId: string;
  agentId: AgentId;
  actionKind: ActionKind;
  success: boolean;
  qualityScore?: number;
  notes?: string;
  createdAt: string;
}

export interface AgentStats {
  agentId: AgentId;
  attempts: number;
  successes: number;
  averageQuality: number;
  learnedScore: number;
}

export interface LessonRecord {
  id: string;
  topic: string;
  text: string;
  confidence: number;
  sourceTaskId?: string;
  createdAt: string;
}

export interface SupervisorPlan {
  taskId: string;
  selectedAgent: AgentId;
  rankedAgents: RankedAgent[];
  actions: Array<{
    action: CandidateAction;
    policy: PolicyDecision;
  }>;
  verificationAgent?: AgentId;
  status: 'ready' | 'approval_required';
}

export interface MemoryStore {
  recordOutcome(record: OutcomeRecord): void;
  getAgentStats(agentId: AgentId): AgentStats;
  addLesson(record: LessonRecord): void;
  searchLessons(query: string, limit?: number): LessonRecord[];
}

import { TRICK_DATABASE } from './trickDatabase';
export type SkillProgress = { id: string; trick_name: string; status: string; attempts?: number };
export type SkillNode = {
  key: string;
  name: string;
  tier: number;
  prerequisites: string[];
  missing: string[];
  progress?: SkillProgress;
  state: 'TODO' | 'LEARNING' | 'LANDED' | 'LOCKED';
};
const ALIASES: Record<string, string> = {
  treflip: '360 flip',
  'tre flip 360 flip': '360 flip',
  'tre flip': '360 flip',
  '50 50 grind': '50 50',
  '5 0 grind': '5 0',
  'frontside pop shove it': 'frontside shove it',
  'varial kickflip': 'varial flip',
  'pop shuvit': 'pop shove it',
  'pop shuv it': 'pop shove it',
};
export function normalizeTrickName(name: string): string {
  const clean = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return ALIASES[clean] ?? clean;
}
export function buildSkillTree(progress: SkillProgress[]): SkillNode[] {
  const byName = new Map<string, SkillProgress>();
  const rank: Record<string, number> = { trying: 1, landed: 2, consistent: 3 };
  for (const row of progress) {
    const key = normalizeTrickName(row.trick_name);
    const existing = byName.get(key);
    if (!existing || (rank[row.status] ?? 0) > (rank[existing.status] ?? 0)) byName.set(key, row);
  }
  return Object.entries(TRICK_DATABASE)
    .map(([key, trick]) => {
      const current = byName.get(normalizeTrickName(trick.name));
      const missing = trick.prerequisites.filter(
        name =>
          !['landed', 'consistent'].includes(byName.get(normalizeTrickName(name))?.status ?? '')
      );
      return {
        key,
        name: trick.name,
        tier: trick.difficulty,
        prerequisites: trick.prerequisites,
        missing,
        progress: current,
        state: current
          ? ['landed', 'consistent'].includes(current.status)
            ? 'LANDED'
            : 'LEARNING'
          : missing.length
            ? 'LOCKED'
            : 'TODO',
      } as SkillNode;
    })
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

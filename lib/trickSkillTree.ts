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
        tier:
          trick.difficulty >= 4
            ? 5
            : trick.category === 'grind' || trick.category === 'manual'
              ? 3
              : trick.category === 'transition' ||
                  trick.category === 'grab' ||
                  trick.category === 'street'
                ? 4
                : trick.difficulty === 1
                  ? 1
                  : 2,
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

export type SkillPoint = { x: number; y: number; width: number; height: number };
export function skillTreeEdges(
  nodes: SkillNode[],
  positions: Record<string, SkillPoint>,
  selected: string | null
) {
  const byName = new Map(
    nodes.flatMap(
      node =>
        [
          [normalizeTrickName(node.name), node],
          [normalizeTrickName(node.key), node],
        ] as [string, SkillNode][]
    )
  );
  return nodes.flatMap(node =>
    node.prerequisites.flatMap(prerequisite => {
      const parent = byName.get(normalizeTrickName(prerequisite));
      const a = parent && positions[parent.key];
      const b = positions[node.key];
      if (!parent || !a || !b) return [];
      const x1 = a.x + a.width / 2,
        y1 = a.y + a.height,
        x2 = b.x + b.width / 2,
        y2 = b.y;
      const bend = Math.max(24, Math.abs(y2 - y1) / 2);
      return [
        {
          key: `${parent.key}->${node.key}`,
          highlighted: node.key === selected || parent.key === selected,
          d: `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`,
        },
      ];
    })
  );
}

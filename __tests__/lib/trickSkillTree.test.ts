import { buildSkillTree, normalizeTrickName } from '../../lib/trickSkillTree';
const landed = (trick_name: string) => ({ id: trick_name, trick_name, status: 'landed' });
describe('skill tree from persisted tracker rows', () => {
  it('unlocks only when all prerequisites are landed', () => {
    expect(buildSkillTree([]).find(n => n.key === 'kickflip')?.state).toBe('LOCKED');
    expect(buildSkillTree([landed('Ollie')]).find(n => n.key === 'kickflip')?.state).toBe('TODO');
    const tree = buildSkillTree([landed('Ollie'), { ...landed('Kickflip'), status: 'trying' }]);
    expect(tree.find(n => n.key === 'kickflip')?.state).toBe('LEARNING');
    expect(tree.find(n => n.key === 'tre flip')?.state).toBe('LOCKED');
  });
  it('recognizes catalog/tracker aliases and preserves existing mastery even if prerequisites are absent', () => {
    expect(normalizeTrickName('Tre Flip (360 Flip)')).toBe(normalizeTrickName('Treflip'));
    const tree = buildSkillTree([landed('50-50 Grind'), landed('Ollie'), landed('Treflip')]);
    expect(tree.find(n => n.key === '5-0')?.missing).toEqual([]);
    expect(tree.find(n => n.key === 'tre flip')?.state).toBe('LANDED');
  });
  it('does not let a duplicate trying row hide a landed trick', () => {
    const tree = buildSkillTree([
      landed('Ollie'),
      { id: 'other', trick_name: 'OLLIE', status: 'trying' },
    ]);
    expect(tree.find(n => n.key === 'ollie')?.state).toBe('LANDED');
  });
});

it('exposes every curriculum tier and draws only real prerequisite connections', () => {
  const nodes = buildSkillTree([]);
  expect(new Set(nodes.map(node => node.tier))).toEqual(new Set([1, 2, 3, 4, 5]));
  const { skillTreeEdges } = require('../../lib/trickSkillTree');
  const edges = skillTreeEdges(
    nodes,
    {
      ollie: { x: 0, y: 0, width: 100, height: 50 },
      kickflip: { x: 120, y: 100, width: 100, height: 50 },
    },
    'kickflip'
  );
  expect(edges).toHaveLength(1);
  expect(edges[0].key).toBe('ollie->kickflip');
  expect(edges[0].highlighted).toBe(true);
});

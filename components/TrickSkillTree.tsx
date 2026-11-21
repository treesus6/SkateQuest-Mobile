import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { buildSkillTree, SkillProgress } from '../lib/trickSkillTree';
const TIERS = ['Foundation', 'Flip & Spin', 'Ledges & Rails', 'Transition & Gaps', 'Mastery'];
export default function TrickSkillTree({
  progress,
  onStart,
  onAttempt,
  onLand,
  busy,
}: {
  progress: SkillProgress[];
  onStart: (name: string) => void;
  onAttempt: (trick: SkillProgress) => void;
  onLand: (trick: SkillProgress) => void;
  busy?: boolean;
}) {
  const nodes = useMemo(() => buildSkillTree(progress), [progress]);
  const [selected, setSelected] = useState<string | null>(null);
  const router = useRouter();
  return (
    <View style={{ marginVertical: 14 }}>
      <Text style={{ color: '#F6F0E5', fontWeight: '900', fontSize: 23 }}>TRICK MASTERY TREE</Text>
      <Text style={{ color: '#A9B0BA', marginTop: 6 }}>
        Your saved tracker powers these nodes. Land prerequisites to unlock the next step.
      </Text>
      {TIERS.map((label, index) => (
        <View
          key={label}
          style={{ borderLeftWidth: 2, borderLeftColor: '#D8F04B', paddingLeft: 12, marginTop: 16 }}
        >
          <Text style={{ color: '#D8F04B', fontWeight: '900', marginBottom: 8 }}>
            {index + 1} / {label.toUpperCase()}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {nodes
              .filter(n => n.tier === index + 1)
              .map(node => (
                <Pressable
                  key={node.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selected === node.key }}
                  onPress={() => setSelected(node.key)}
                  style={{
                    width: '47%',
                    minHeight: 76,
                    padding: 10,
                    borderWidth: 2,
                    borderColor:
                      selected === node.key
                        ? '#F6F0E5'
                        : node.state === 'LANDED'
                          ? '#22C55E'
                          : node.state === 'LOCKED'
                            ? '#343B47'
                            : '#E36D3F',
                    backgroundColor: '#12161C',
                  }}
                >
                  <Text
                    style={{
                      color: node.state === 'LOCKED' ? '#979EAA' : '#F6F0E5',
                      fontWeight: '900',
                    }}
                  >
                    {node.name}
                  </Text>
                  <Text
                    style={{
                      color: node.state === 'LANDED' ? '#22C55E' : '#979EAA',
                      fontSize: 10,
                      marginTop: 7,
                    }}
                  >
                    {node.state}
                  </Text>
                </Pressable>
              ))}
          </View>
        </View>
      ))}
      {nodes
        .filter(n => n.key === selected)
        .map(node => (
          <View
            key={node.key}
            style={{
              padding: 16,
              borderWidth: 2,
              borderColor: '#F6F0E5',
              marginTop: 14,
              backgroundColor: '#12161C',
            }}
          >
            <Text style={{ color: '#F6F0E5', fontWeight: '900', fontSize: 19 }}>{node.name}</Text>
            <Text style={{ color: '#A9B0BA', marginVertical: 8 }}>
              {node.missing.length
                ? `Prerequisites: ${node.missing.join(' → ')}`
                : node.prerequisites.length
                  ? `Unlocked through ${node.prerequisites.join(' → ')}`
                  : 'Foundation node · start here'}
            </Text>
            {node.state !== 'LOCKED' ? (
              <Pressable
                disabled={busy}
                onPress={() => (node.progress ? onAttempt(node.progress) : onStart(node.name))}
                style={{
                  minHeight: 44,
                  justifyContent: 'center',
                  backgroundColor: '#E36D3F',
                  padding: 12,
                }}
              >
                <Text style={{ fontWeight: '900', color: '#07080B' }}>
                  {node.progress ? '+1 ATTEMPT' : 'START LEARNING'}
                </Text>
              </Pressable>
            ) : null}
            {node.progress?.status === 'trying' ? (
              <Pressable
                disabled={busy}
                onPress={() => onLand(node.progress!)}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <Text style={{ color: '#22C55E', fontWeight: '900' }}>MARK LANDED</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() =>
                router.push({ pathname: '/ai-coach', params: { trick: node.name } } as any)
              }
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: '#D8F04B', fontWeight: '900' }}>ASK AI COACH ↗</Text>
            </Pressable>
          </View>
        ))}
    </View>
  );
}

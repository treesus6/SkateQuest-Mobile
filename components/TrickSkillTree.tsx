import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { SCENE_TYPE } from '../lib/sceneTheme';
import { buildSkillTree, SkillProgress, SkillPoint, skillTreeEdges } from '../lib/trickSkillTree';
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
  const [tierY, setTierY] = useState<Record<number, number>>({});
  const [rowY, setRowY] = useState<Record<number, number>>({});
  const [nodeLayouts, setNodeLayouts] = useState<Record<string, SkillPoint>>({});
  const updateLayout = (key: string, point: SkillPoint) =>
    setNodeLayouts(current =>
      JSON.stringify(current[key]) === JSON.stringify(point)
        ? current
        : { ...current, [key]: point }
    );
  const computedPositions = useMemo(
    () =>
      Object.fromEntries(
        nodes
          .filter(
            node =>
              nodeLayouts[node.key] &&
              tierY[node.tier] !== undefined &&
              rowY[node.tier] !== undefined
          )
          .map(node => [
            node.key,
            {
              ...nodeLayouts[node.key],
              y: nodeLayouts[node.key].y + tierY[node.tier] + rowY[node.tier],
            },
          ])
      ),
    [nodes, nodeLayouts, tierY, rowY]
  );
  const edges = useMemo(
    () => skillTreeEdges(nodes, computedPositions, selected),
    [nodes, computedPositions, selected]
  );
  return (
    <View style={{ marginVertical: 14 }}>
      <Text style={{ ...SCENE_TYPE.display, color: '#F6F0E5', fontSize: 23 }}>
        TRICK MASTERY TREE
      </Text>
      <Text style={{ color: '#A9B0BA', marginTop: 6 }}>
        Your saved tracker powers these nodes. Land prerequisites to unlock the next step.
      </Text>
      <View style={{ position: 'relative' }}>
        <Svg
          pointerEvents="none"
          width="100%"
          height="100%"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {edges.map(edge => (
            <Path
              key={edge.key}
              d={edge.d}
              fill="none"
              stroke={edge.highlighted ? '#D8F04B' : '#343B47'}
              strokeWidth={edge.highlighted ? 3 : 1}
              opacity={edge.highlighted ? 1 : 0.55}
            />
          ))}
        </Svg>
        {TIERS.map((label, index) => (
          <View
            key={label}
            onLayout={event => {
              const y = event.nativeEvent.layout.y;
              setTierY(current =>
                current[index + 1] === y ? current : { ...current, [index + 1]: y }
              );
            }}
            style={{ marginTop: 24 }}
          >
            <Text style={{ color: '#D8F04B', fontWeight: '900', marginBottom: 8 }}>
              {index + 1} / {label.toUpperCase()}
            </Text>
            <View
              onLayout={event => {
                const y = event.nativeEvent.layout.y;
                setRowY(current =>
                  current[index + 1] === y ? current : { ...current, [index + 1]: y }
                );
              }}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {nodes
                .filter(n => n.tier === index + 1)
                .map(node => (
                  <Pressable
                    key={node.key}
                    onLayout={event => updateLayout(node.key, event.nativeEvent.layout)}
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
      </View>
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' }}>
          <ScrollView
            style={{ maxHeight: '78%', backgroundColor: '#12161C' }}
            contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close trick details"
              onPress={() => setSelected(null)}
              style={{ minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }}
            >
              <Text style={{ color: '#F6F0E5', fontWeight: '900' }}>CLOSE ✕</Text>
            </Pressable>
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
                  <Text style={{ color: '#F6F0E5', fontWeight: '900', fontSize: 19 }}>
                    {node.name}
                  </Text>
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
                      onPress={() =>
                        node.progress ? onAttempt(node.progress) : onStart(node.name)
                      }
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
                    onPress={() => {
                      setSelected(null);
                      router.push({ pathname: '/ai-coach', params: { trick: node.name } } as any);
                    }}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#D8F04B', fontWeight: '900' }}>ASK AI COACH ↗</Text>
                  </Pressable>
                </View>
              ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface SpotRatingValues {
  potential: number;
  difficulty: number;
  quality: number;
}

type RatingKey = keyof SpotRatingValues;

const CRITERIA: Array<{
  key: RatingKey;
  label: string;
  help: string;
}> = [
  { key: 'potential', label: 'Potential', help: 'How many tricks and lines could go down here?' },
  { key: 'difficulty', label: 'Difficulty', help: 'How hard is this spot to skate?' },
  { key: 'quality', label: 'Overall quality', help: 'How good is the spot overall?' },
];

export function hasCompleteSpotRating(values: SpotRatingValues): boolean {
  return Object.values(values).every(value => Number.isInteger(value) && value >= 1 && value <= 5);
}

export default function SpotRatingFields({
  value,
  onChange,
  theme = 'dark',
}: {
  value: SpotRatingValues;
  onChange: (next: SpotRatingValues) => void;
  theme?: 'light' | 'dark';
}) {
  const light = theme === 'light';

  return (
    <View style={s.container}>
      {CRITERIA.map(criterion => (
        <View key={criterion.key} style={s.criterion}>
          <Text style={[s.label, light && s.labelLight]}>{criterion.label.toUpperCase()}</Text>
          <Text style={[s.help, light && s.helpLight]}>{criterion.help}</Text>
          <View style={s.scoreRow}>
            {[1, 2, 3, 4, 5].map(score => {
              const active = value[criterion.key] === score;
              return (
                <Pressable
                  key={score}
                  accessibilityRole="button"
                  accessibilityLabel={`${criterion.label}: ${score} out of 5`}
                  accessibilityState={{ selected: active }}
                  onPress={() => onChange({ ...value, [criterion.key]: score })}
                  style={[s.score, light && s.scoreLight, active && s.scoreActive]}
                >
                  <Text
                    style={[s.scoreText, light && s.scoreTextLight, active && s.scoreTextActive]}
                  >
                    {score}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 13 },
  criterion: { gap: 4 },
  label: { color: '#F3F4F6', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.5 },
  labelLight: { color: '#07080B' },
  help: { color: '#7B8493', fontSize: 10, lineHeight: 14 },
  helpLight: { color: '#59616D' },
  scoreRow: { flexDirection: 'row', gap: 7, marginTop: 3 },
  score: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#303947',
    backgroundColor: '#0A1018',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLight: { borderColor: '#A7A39A', backgroundColor: '#EEE7DA' },
  scoreActive: { borderColor: '#07080B', backgroundColor: '#D9F34A' },
  scoreText: { color: '#8D97A5', fontSize: 13, fontWeight: '900' },
  scoreTextLight: { color: '#4B4B47' },
  scoreTextActive: { color: '#07080B' },
});

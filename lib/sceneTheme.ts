import type { TextStyle } from 'react-native';

export const SCENE_COLORS = {
  ink: '#07080B',
  card: '#12161C',
  paper: '#F6F0E5',
  acid: '#D8F04B',
  orange: '#E36D3F',
  blue: '#63A7FF',
  landed: '#22C55E',
} as const;
export const SCENE_FONTS = {
  SpaceGrotesk: require('../assets/fonts/SpaceGrotesk-Bold.ttf'),
  PlusJakartaSans: require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
  PlusJakartaSansBold: require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
  JetBrainsMono: require('../assets/fonts/JetBrainsMono-Medium.ttf'),
};
export const SCENE_TYPE = {
  display: { fontFamily: 'SpaceGrotesk', fontWeight: '700' } as TextStyle,
  body: { fontFamily: 'PlusJakartaSans' } as TextStyle,
  strong: { fontFamily: 'PlusJakartaSansBold', fontWeight: '700' } as TextStyle,
  metric: {
    fontFamily: 'JetBrainsMono',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  } as TextStyle,
};
/** Apply the same hierarchy to named text styles across the five tabs. */
export function withSceneTypography<T extends Record<string, object>>(styles: T): T {
  return Object.fromEntries(
    Object.entries(styles).map(([name, value]) => {
      if (!('fontSize' in value) || 'fontFamily' in value) return [name, value];
      const font = /title|name|hello/i.test(name)
        ? SCENE_TYPE.display
        : /xp|count|value|number|metric|streak|scoreBig|levelBig/i.test(name)
          ? SCENE_TYPE.metric
          : 'fontWeight' in value && Number(value.fontWeight) >= 700
            ? SCENE_TYPE.strong
            : SCENE_TYPE.body;
      return [name, { ...value, ...font }];
    })
  ) as T;
}

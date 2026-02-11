import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark';
  initialize: () => () => void;
  setPreference: (preference: ThemePreference) => void;
}

const STORAGE_KEY = 'theme_preference';

function resolveColorScheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference === 'system') {
    return Appearance.getColorScheme() || 'light';
  }
  return preference;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  colorScheme: Appearance.getColorScheme() || 'light',

  initialize: () => {
    // Load persisted preference
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        set({
          preference: stored,
          colorScheme: resolveColorScheme(stored),
        });
      }
    });

    // Listen for system appearance changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const { preference } = get();
      if (preference === 'system') {
        set({ colorScheme: colorScheme || 'light' });
      }
    });

    return () => subscription.remove();
  },

  setPreference: (preference: ThemePreference) => {
    set({
      preference,
      colorScheme: resolveColorScheme(preference),
    });
    AsyncStorage.setItem(STORAGE_KEY, preference);
  },
}));

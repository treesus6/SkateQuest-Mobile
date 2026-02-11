import { Platform, Vibration } from 'react-native';

/**
 * Haptic feedback utility for key user actions.
 * Uses the Vibration API as a cross-platform fallback.
 * On iOS physical devices, short vibrations approximate taptic feedback.
 */
export const Haptics = {
  /** Light tap for selections, toggles */
  light() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10);
    }
  },

  /** Medium tap for button presses, confirmations */
  medium() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(25);
    }
  },

  /** Strong tap for success, completion */
  success() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 15, 60, 15]);
    }
  },

  /** Error feedback */
  error() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 30, 50, 30, 50, 30]);
    }
  },

  /** Warning feedback */
  warning() {
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 20, 80, 20]);
    }
  },
};

export default Haptics;

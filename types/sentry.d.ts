// Augment @sentry/react-native for v7.11.x compatibility
// ErrorEvent and wrap() exist at runtime but are absent from older type definitions
import '@sentry/react-native';

declare module '@sentry/react-native' {
  export type ErrorEvent = { [key: string]: unknown };
  export function wrap<T>(component: T): T;
}

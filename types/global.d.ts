declare const __DEV__: boolean;

declare const ErrorUtils: {
  getGlobalHandler(): (error: Error, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: Error, isFatal?: boolean) => void): void;
};

declare module 'sanitize-html' {
  function sanitize(dirty: string, options?: Record<string, unknown>): string;
  export = sanitize;
}

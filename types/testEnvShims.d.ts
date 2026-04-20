declare module '@sentry/react-native' {
  export const init: (...args: any[]) => any;
  export const captureException: (...args: any[]) => any;
  export const captureMessage: (...args: any[]) => any;
  export const addBreadcrumb: (...args: any[]) => any;
  export const setUser: (...args: any[]) => any;
  export const setTag: (...args: any[]) => any;
  export const startTransaction: (...args: any[]) => any;
}

declare module '@jest/globals' {
  export const beforeEach: any;
  export const afterEach: any;
  export const beforeAll: any;
  export const afterAll: any;
  export const describe: any;
  export const expect: any;
  export const it: any;
  export const test: any;
  export const jest: any;
}

// Global jest functions (for test files that use globals without importing)
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => any, timeout?: number): void;
declare function test(name: string, fn: () => any, timeout?: number): void;
declare function beforeEach(fn: () => any, timeout?: number): void;
declare function afterEach(fn: () => any, timeout?: number): void;
declare function beforeAll(fn: () => any, timeout?: number): void;
declare function afterAll(fn: () => any, timeout?: number): void;
declare function expect(actual: any): any;
declare const jest: any;

// Fix jest-expo@54 + RN 0.76 incompatibility:
// jest-expo does require('.../NativeModules').default which is undefined in RN 0.76
// (RN 0.76 uses module.exports = NativeModules, no .default export)
// This mock provides the expected shape for jest-expo's setup.js to work.
const nativeModules = {
  UIManager: {
    getViewManagerConfig: () => ({}),
    hasViewManagerConfig: () => false,
    getConstants: () => ({}),
  },
};
module.exports = nativeModules;
module.exports.default = nativeModules;

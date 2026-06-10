const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase Auth uses internal .cjs (CommonJS) files, so Metro must resolve them.
config.resolver.sourceExts.push('cjs');

// Disable package exports resolution if Metro is incorrectly picking up web-only entrypoints
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

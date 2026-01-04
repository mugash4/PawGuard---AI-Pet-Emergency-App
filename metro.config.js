const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable package.json exports support (required for React 19)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;

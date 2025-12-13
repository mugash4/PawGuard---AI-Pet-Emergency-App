const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidIAPPlugin(config) {
  return withAppBuildGradle(config, (config) => {
    // Find the defaultConfig section and add missingDimensionStrategy
    const defaultConfigRegex = /(defaultConfig\s*{)/;
    
    if (config.modResults.contents.match(defaultConfigRegex)) {
      // Only add if not already present
      if (!config.modResults.contents.includes('missingDimensionStrategy "store"')) {
        config.modResults.contents = config.modResults.contents.replace(
          defaultConfigRegex,
          `$1\n        missingDimensionStrategy "store", "play"`
        );
      }
    }
    
    return config;
  });
};

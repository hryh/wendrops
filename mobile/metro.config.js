const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure proper bundling for WebView apps
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;

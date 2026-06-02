const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Tell Metro exactly where to find maplibre-gl's JS entry point.
// Without this, Metro's resolver fails on the package because it
// contains non-JS files (CSS, workers) that confuse module resolution.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "maplibre-gl": require.resolve("maplibre-gl/dist/maplibre-gl.js"),
};

// Block only the non-JS files inside maplibre-gl that Metro cannot parse.
// Do NOT block the package root — HiveMap.web.tsx imports it directly.
const existingBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];

config.resolver.blockList = [
  ...existingBlockList,
  // CSS files — not valid JS modules
  /node_modules[/\\]maplibre-gl[/\\].*\.css$/,
  // Pre-built worker bundle — large, not needed by Metro
  /node_modules[/\\]maplibre-gl[/\\]dist[/\\]maplibre-gl-worker\.js$/,
];

module.exports = config;

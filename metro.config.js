const { getDefaultConfig } = require("expo/metro-config");
const https = require("https");
const http = require("http");

const config = getDefaultConfig(__dirname);

// Read from environment variable, fallback to Railway production
const API_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL || "https://bsads-api-production.up.railway.app";

// Parse the URL to extract hostname, protocol, and port
const apiUrl = new URL(API_BASE_URL);
const API_HOSTNAME = apiUrl.hostname;
const API_PORT = apiUrl.port || (apiUrl.protocol === "https:" ? 443 : 80);
const API_PROTOCOL = apiUrl.protocol === "https:" ? https : http;

console.log(`[Metro Proxy] Proxying /api-proxy/* → ${API_BASE_URL}`);

// Expo web (localhost:8081) cannot call remote APIs directly — browser CORS blocks it.
// Proxy /api-proxy/* → API server so API calls are same-origin during dev.
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      const url = req.url ?? "";
      if (!url.startsWith("/api-proxy")) {
        return middleware(req, res, next);
      }

      const targetPath = url.replace(/^\/api-proxy/, "") || "/";
      
      const proxyReq = API_PROTOCOL.request(
        {
          hostname: API_HOSTNAME,
          port: API_PORT,
          path: targetPath,
          method: req.method,
          headers: {
            "Content-Type": req.headers["content-type"] || "application/json",
            Accept: req.headers.accept || "application/json",
            ...(req.headers.authorization
              ? { Authorization: req.headers.authorization }
              : {}),
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
          proxyRes.pipe(res);
        },
      );

      proxyReq.on("error", (err) => {
        console.error(`[Metro Proxy] Error proxying to ${API_BASE_URL}:`, err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ detail: `Proxy error: ${err.message}` }));
      });

      req.pipe(proxyReq);
    };
  },
};

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

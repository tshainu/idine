const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so workspace packages resolve correctly
config.watchFolders = [workspaceRoot];

// Resolve modules from mobile package first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Block server-only / node-only packages that crash React Native
config.resolver.blockList = [
  // @template/web pulls in drizzle, libsql, thermal-printer etc.
  /node_modules\/@template\/web\/.*/,
  // Block any drizzle/libsql native modules
  /node_modules\/drizzle-orm\/.*/,
  /node_modules\/@libsql\/.*/,
  /node_modules\/libsql\/.*/,
  // Block thermal printer
  /node_modules\/node-thermal-printer\/.*/,
  // Block onedollarstats
  /node_modules\/onedollarstats\/.*/,
];

module.exports = config;

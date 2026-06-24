const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// In monorepo: watch the workspace root and resolve from both
// In standalone EAS build: workspaceRoot may not exist, skip it
if (fs.existsSync(path.join(workspaceRoot, 'package.json'))) {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'));
  if (rootPkg.workspaces) {
    config.watchFolders = [workspaceRoot];
    config.resolver.nodeModulesPaths = [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ];
  }
}

// Block server-only / node-only packages that crash React Native
config.resolver.blockList = [
  /node_modules\/@template\/web\/.*/,
  /node_modules\/drizzle-orm\/.*/,
  /node_modules\/@libsql\/.*/,
  /node_modules\/libsql\/.*/,
  /node_modules\/node-thermal-printer\/.*/,
  /node_modules\/onedollarstats\/.*/,
];

module.exports = config;

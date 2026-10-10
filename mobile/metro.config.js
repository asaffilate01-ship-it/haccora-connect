const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Only the dependency-free catalogue is shared with the web app.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, "../shared")];
module.exports = config;

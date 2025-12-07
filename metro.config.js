// Learn more https://docs.expo.io/guides/customizing-metro
const os = require("node:os");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.cacheStores = ({ FileStore }) => [
  new FileStore({
    root: path.join(os.homedir(), "metro-cache"),
  }),
];

module.exports = config;

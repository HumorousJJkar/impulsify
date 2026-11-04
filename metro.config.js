// Metro is the bundler that packs the app's JavaScript for the phone.
// The backend/ folder is a separate Cloudflare Worker project, so tell Metro to ignore it.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [/[\\/]backend[\\/].*/];

module.exports = config;

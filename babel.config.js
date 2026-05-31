module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated v4 moved the worklets transform to react-native-worklets.
    // This plugin must remain LAST in the list.
    plugins: ['react-native-worklets/plugin'],
  };
};

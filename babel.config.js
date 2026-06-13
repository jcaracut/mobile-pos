module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // WatermelonDB requires decorator support.
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Path alias resolution — must match tsconfig.json paths.
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@core': './src/core',
            '@features': './src/features',
            '@shared': './src/shared',
            '@navigation': './src/navigation',
            '@theme': './src/theme',
            '@assets': './assets',
          },
        },
      ],
    ],
  };
};

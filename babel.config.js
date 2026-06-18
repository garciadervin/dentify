module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: isTest ? undefined : "nativewind" }],
      isTest ? undefined : "nativewind/babel",
    ].filter(Boolean),
  };
};

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  testMatch: /persona\.(student|teacher|admin)\.spec\.js/,
  timeout: 240_000,
  expect: { timeout: 45_000 },
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    viewport: { width: 1366, height: 900 },
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
  workers: 1,
});

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:8123',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      testMatch: 'e2e.spec.js',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } }
    },
    {
      name: 'webkit',
      testMatch: 'webkit.spec.js',
      use: { browserName: 'webkit', viewport: { width: 390, height: 844 } }
    }
  ],
  webServer: {
    command: 'node scripts/serve-static.js --port 8123',
    url: 'http://127.0.0.1:8123/',
    reuseExistingServer: false,
    timeout: 120000
  }
});

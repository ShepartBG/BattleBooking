import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(baseURL);

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    // FX layer (components/fx/BattleFX.tsx) turns itself off for reduced motion -> stable clicks
    contextOptions: { reducedMotion: "reduce" },
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      testIgnore: /owner-auth\.setup\.ts/,
    },
    {
      name: "owner-setup",
      testMatch: /owner-auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /owner-auth\.setup\.ts/, /owner\.spec\.ts/, /lifecycle\.spec\.ts/, /extended\.spec\.ts/],
    },
    {
      name: "owner",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/owner.json",
      },
      dependencies: ["owner-setup"],
      testMatch: /owner\.spec\.ts/,
    },
    {
      // Full flow: access request -> approval -> setup -> game -> player registration.
      // Needs .env.local too (service-role key for cleanup): npm run test:browser:lifecycle
      name: "lifecycle",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["owner-setup"],
      testMatch: /lifecycle\.spec\.ts/,
    },
    {
      // Uploads, game edit/postpone/close/expiry, cancel player, subscriptions, shops/events.
      name: "extended",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["owner-setup"],
      testMatch: /extended\.spec\.ts/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testMatch: /public\.spec\.ts/,
    },
    {
      // Safari engine
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testMatch: /public\.spec\.ts/,
    },
    {
      name: "webkit-iphone",
      use: { ...devices["iPhone 13"] },
      testMatch: /public\.spec\.ts/,
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: [/auth\.setup\.ts/, /owner-auth\.setup\.ts/, /owner\.spec\.ts/, /lifecycle\.spec\.ts/, /extended\.spec\.ts/],
    },
  ],
  webServer: isLocal
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      }
    : undefined,
});

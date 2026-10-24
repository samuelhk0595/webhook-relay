import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./integration",
  workers: 1,
  timeout: 45000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    locale: "pt-BR",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/integration-server.mjs",
    url: "http://127.0.0.1:4180/readyz",
    reuseExistingServer: false,
  },
});

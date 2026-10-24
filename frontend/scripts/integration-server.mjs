import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// One disposable real SQLite database per browser suite; no route interception.
const directory = await mkdtemp(join(tmpdir(), "webhook-forwarder-e2e-"));
const passwordFile = join(directory, "bootstrap-password");
await writeFile(passwordFile, "browser-test-password-123", { mode: 0o600 });
const executable = process.platform === "win32" ? "webhook-forwarder.exe" : "webhook-forwarder";
const child = spawn(resolve("../backend/target/debug", executable), [], {
  cwd: resolve("../backend"),
  env: {
    ...process.env,
    DATABASE_PATH: join(directory, "test.db"),
    LISTEN_ADDR: "127.0.0.1:4180",
    PUBLIC_URL: "http://127.0.0.1:4180",
    COOKIE_SECURE: "false",
    BOOTSTRAP_USERNAME: "browser-admin",
    BOOTSTRAP_PASSWORD_FILE: passwordFile,
    ADMIN_DIST: resolve("dist"),
  },
  stdio: "inherit",
});
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  child.kill("SIGTERM");
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
child.on("exit", async (code) => {
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  process.exit(closing ? 0 : (code ?? 1));
});
child.on("error", (error) => { console.error(error); process.exitCode = 1; });

import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";

const backend = new URL("../../backend/", import.meta.url);
const result = spawnSync("cargo", ["run", "--quiet", "--locked", "--", "openapi"], {
  cwd: backend,
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
});
if (result.status !== 0) throw new Error(result.stderr || result.error?.message);
const document = JSON.parse(result.stdout);
const generated = astToString(await openapiTS(document));
const target = new URL("../src/lib/openapi.generated.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== generated)
    throw new Error("OpenAPI changed. Run npm run api:generate and review the DTO changes.");
  console.log("OpenAPI and generated TypeScript agree.");
} else {
  await writeFile(target, generated);
  console.log("Generated src/lib/openapi.generated.ts from Rust/Utoipa.");
}

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const wranglerCli = resolve(root, "node_modules", "wrangler", "bin", "wrangler.js");

if (!existsSync(wranglerCli)) {
  console.error("Local tools are missing. Run npm install, then try npm run dev again.");
  process.exit(1);
}

console.log("Preparing the local demo database...");
const result = spawnSync(
  process.execPath,
  [
    wranglerCli,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    resolve(root, "wrangler.local.jsonc"),
  ],
  { cwd: root, stdio: "inherit" },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);

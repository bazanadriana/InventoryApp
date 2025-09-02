import { spawnSync } from "node:child_process";

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
  return res.status === 0;
}

// 1) apply migrations; 2) fallback to db push
const migrated = run("npx", ["prisma", "migrate", "deploy"]);
if (!migrated) {
  console.warn("[prestart] migrate deploy failed, falling back to db push…");
  if (!run("npx", ["prisma", "db", "push"])) {
    console.error("[prestart] db push failed.");
    process.exit(1);
  }
}

console.log("[prestart] DB ready. Starting server…");
const server = spawnSync("node", ["dist/server.js"], { stdio: "inherit" });
process.exit(server.status ?? 1);

// Menjalankan `next dev|start` pada port dari config/port.json (satu-satunya sumber port).
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const { port } = JSON.parse(readFileSync(new URL("../config/port.json", import.meta.url), "utf8"));
const [cmd, ...rest] = process.argv.slice(2);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", cmd, "-p", String(port), ...rest], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 0));

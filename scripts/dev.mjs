// Menjalankan lingkungan pengembangan lokal (tanpa Docker): web Next.js + Expo mobile, memakai MySQL di mesin ini.
//
//   node scripts/dev.mjs check    → hanya cek MySQL (host/port dari DATABASE_URL di .env)
//   node scripts/dev.mjs web      → cek MySQL, lalu `pnpm dev` (port dari config/port.json)
//   node scripts/dev.mjs mobile   → `expo start --lan` di mobile/ (tidak butuh cek DB)
//   node scripts/dev.mjs all      → cek MySQL, lalu web + mobile bersamaan (Ctrl+C menghentikan keduanya)
//
// Skrip ini tidak pernah mengubah database. Sinkronisasi skema tetap manual: `pnpm db:push`.
import { readFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { connect } from "node:net";

const ROOT = new URL("..", import.meta.url).pathname;
const MODES = ["check", "web", "mobile", "all"];
const mode = process.argv[2] ?? "all";

if (!MODES.includes(mode)) {
  console.error(`Mode tidak dikenal: "${mode}". Pilih salah satu: ${MODES.join(", ")}`);
  process.exit(1);
}

function readDatabaseUrl() {
  const envFile = `${ROOT}.env`;
  if (!existsSync(envFile)) {
    throw new Error("File .env tidak ditemukan di root (butuh DATABASE_URL).\n  Buat dengan: cp .env.example .env, lalu isi user/password MySQL lokal.");
  }
  const line = readFileSync(envFile, "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL belum di-set di .env.");
  return new URL(line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, ""));
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(2000, () => done(false));
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
  });
}

async function checkDatabase() {
  const url = readDatabaseUrl();
  const host = url.hostname;
  const port = Number(url.port || 3306);
  const name = url.pathname.slice(1);
  if (!(await canConnect(host, port))) {
    console.error(`MySQL tidak bisa dihubungi di ${host}:${port}.`);
    console.error("  Nyalakan lewat System Settings → MySQL, atau: sudo /usr/local/mysql/support-files/mysql.server start");
    process.exit(1);
  }
  console.log(`MySQL OK di ${host}:${port} (database: ${name})`);
}

const webCommand = ["pnpm", ["dev"]];
const mobileCommand = ["pnpm", ["--filter", "klandesa-mobile", "exec", "expo", "start", "--lan"]];

function runOne([cmd, args]) {
  const child = spawn(cmd, args, { cwd: ROOT, stdio: "inherit" });
  child.on("exit", (code) => process.exit(code ?? 0));
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
}

function runBoth() {
  const children = [];
  let stopping = false;

  const stop = (code) => {
    if (stopping) return;
    stopping = true;
    for (const c of children) c.kill("SIGTERM");
    setTimeout(() => process.exit(code), 500);
  };

  const start = (label, [cmd, args]) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
    const pipe = (stream, out) => {
      let buf = "";
      stream.on("data", (chunk) => {
        buf += chunk.toString();
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) out.write(`[${label}] ${l}\n`);
      });
    };
    pipe(child.stdout, process.stdout);
    pipe(child.stderr, process.stderr);
    child.on("exit", (code) => {
      if (!stopping) console.error(`[${label}] berhenti (kode ${code ?? "?"}); menghentikan proses lain.`);
      stop(code ?? 0);
    });
    children.push(child);
  };

  start("web", webCommand);
  start("mobile", mobileCommand);
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => stop(0));
}

try {
  if (mode === "check") await checkDatabase();
  else if (mode === "web") (await checkDatabase(), runOne(webCommand));
  else if (mode === "mobile") runOne(mobileCommand);
  else (await checkDatabase(), runBoth());
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

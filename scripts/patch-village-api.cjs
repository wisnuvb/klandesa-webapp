#!/usr/bin/env node
const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
process.chdir(root);

const files = execSync(
  'rg -l \'from "@/lib/village"\' app/api --glob "*.ts"',
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

const patterns = [
  [
    `    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village tidak ditemukan" }, { status: 404 });
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;`,
  ],
  [
    `    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;`,
  ],
  [
    `    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const village = await resolveVillage({ req, session });
    if (!village) {
      return NextResponse.json(
        { error: "Tidak ada desa yang tersedia" },
        { status: 404 }
      );
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;`,
  ],
  [
    `    const session = await getApiSession(req);
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });

    if (!village) {
      return NextResponse.json(
        {
          error:
            "Tidak ada desa yang tersedia. Login terlebih dahulu atau atur DEFAULT_VILLAGE_CODE di env.",
        },
        { status: 404 },
      );
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;`,
  ],
  [
    `    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;`,
  ],
  [
    `    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const villageCode = url.searchParams.get("villageCode") ?? undefined;
    const status = url.searchParams.get("status") ?? "ALL";
    const reportType = url.searchParams.get("reportType") ?? "ALL";
    const isPublic = url.searchParams.get("isPublic") ?? "ALL";

    const village = await resolveVillage({
      req,
      queryVillageCode: villageCode,
      session,
    });
    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "ALL";
    const reportType = url.searchParams.get("reportType") ?? "ALL";
    const isPublic = url.searchParams.get("isPublic") ?? "ALL";`,
  ],
  [
    `    const session = await getApiSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const village = await resolveVillage({ req, session });

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 });
    }`,
    `    const loaded = await requireVillageApiContext(req);
    if (!loaded.ok) return loaded.response;
    const { village } = loaded.ctx;`,
  ],
];

function stripImports(c) {
  if (!c.includes("getApiSession(")) {
    c = c.replace(
      /import \{ getApiSession \} from "@\/lib\/api-session";\r?\n/g,
      "",
    );
  }
  if (!c.includes("resolveVillage(")) {
    c = c.replace(
      /import \{ resolveVillage \} from "@\/lib\/village";\r?\n/g,
      "",
    );
  }
  return c;
}

function ensureImport(c) {
  if (c.includes('@/lib/api-village-context"')) return c;
  const idx = c.indexOf("import ");
  if (idx < 0) return c;
  const lineEnd = c.indexOf("\n", idx);
  return (
    c.slice(0, lineEnd + 1) +
    `import { requireVillageApiContext } from "@/lib/api-village-context";\n` +
    c.slice(lineEnd + 1)
  );
}

for (const f of files) {
  let c = fs.readFileSync(f, "utf8");
  const before = c;
  for (const [from, to] of patterns) {
    while (c.includes(from)) c = c.replace(from, to);
  }
  if (c === before) continue;
  c = ensureImport(c);
  c = stripImports(c);
  fs.writeFileSync(f, c);
  console.log("patched", f);
}

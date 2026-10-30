import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Seluruh UI pembayaran ada di components/billing (PaymentProvider/usePayment). Halaman tidak boleh memanggil
 * /api/billing/checkout sendiri, supaya perubahan UI/alur bayar cukup di satu tempat.
 */
const ROOT = process.cwd();
const ALLOWED_DIR = join("components", "billing");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "api") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

describe("satu pintu pembayaran", () => {
  it("hanya components/billing yang memanggil /api/billing/checkout dari klien", () => {
    const offenders = [...walk(join(ROOT, "app")), ...walk(join(ROOT, "components")), ...walk(join(ROOT, "hooks"))]
      .filter((f) => !f.includes(ALLOWED_DIR))
      .filter((f) => readFileSync(f, "utf8").includes("/api/billing/checkout"));
    assert.deepEqual(offenders, []);
  });
});

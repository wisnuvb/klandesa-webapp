import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getNavModules,
  getModuleByPathSegment,
  resolveModulePath,
} from "../lib/modules/registry.ts";

const APP_DIR = join(process.cwd(), "app", "(app)");

describe("rute modul sidebar", () => {
  it("setiap modul menu mengarah ke folder route yang ada", () => {
    const missing = getNavModules()
      .filter((m) => m.path)
      .filter((m) => {
        const segment = m.path!.split("/").filter(Boolean)[0];
        return !existsSync(join(APP_DIR, segment, "page.tsx"));
      })
      .map((m) => `${m.id} → ${m.path}`);
    assert.deepEqual(missing, []);
  });

  it("id yang berbeda dari path tetap menuju path modul", () => {
    assert.equal(resolveModulePath("laporan-kades"), "/laporan-kepala-desa");
    assert.equal(resolveModulePath("dtsen-usulan"), "/dtsen");
    assert.equal(resolveModulePath("data-warga"), "/data-warga");
    assert.equal(resolveModulePath("/billing/riwayat"), "/billing/riwayat");
  });

  it("segmen URL dipetakan balik ke id modul", () => {
    assert.equal(getModuleByPathSegment("laporan-kepala-desa")?.id, "laporan-kades");
    assert.equal(getModuleByPathSegment("dtsen")?.id, "dtsen-usulan");
    assert.equal(getModuleByPathSegment("tidak-ada"), undefined);
  });
});

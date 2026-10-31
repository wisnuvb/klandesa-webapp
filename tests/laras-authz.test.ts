import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { larasCan } from "../lib/ai/laras-authz.ts";
import { executeLarasTool } from "../lib/ai/laras-tools.ts";

// JWT lama masih berisi role "admin"/"staff", sementara database sudah menurunkan pengguna menjadi village_head (mail: read saja).
const staleSession = { user: { id: "5", role: "staff" } } as never;
const adminJwt = { user: { id: "5", role: "admin" } } as never;

describe("larasCan memakai role segar dari DB, bukan JWT", () => {
  it("JWT lama 'staff' tetapi DB 'village_head' → tidak boleh mengubah surat/pengaduan/pengumuman", () => {
    assert.equal(larasCan(staleSession, "village_head", "mail", "update"), false);
    assert.equal(larasCan(staleSession, "village_head", "citizen_reports", "update"), false);
    assert.equal(larasCan(staleSession, "village_head", "announcements", "create"), false);
  });
  it("masih boleh membaca (hak baca village_head tetap ada)", () => {
    assert.equal(larasCan(staleSession, "village_head", "mail", "read"), true);
  });
  it("sebaliknya: JWT lama kepala desa tetapi DB baru dinaikkan menjadi sekretaris → boleh", () => {
    assert.equal(larasCan({ user: { id: "5", role: "village_head" } } as never, "secretary", "mail", "update"), true);
  });
  it("akun non-desa tetap ditolak walau role di DB tampak sah (platform/regional/mitra)", () => {
    for (const id of ["pl:1", "rg:1", "pt:1"]) {
      assert.equal(larasCan({ user: { id, role: "admin" } } as never, "admin", "mail", "read"), false);
    }
  });
  it("tanpa sesi atau role kosong ditolak aman", () => {
    assert.equal(larasCan(null, "admin", "mail", "read"), false);
  });
});

describe("executeLarasTool memakai role segar", () => {
  const ctx = (role: string, session = adminJwt) => ({ villageId: 1, userId: 5, role, village: {} as never, session });
  it("JWT admin tetapi DB village_head → usulan ditolak sebelum menyentuh database", async () => {
    const out = await executeLarasTool(ctx("village_head"), "propose_mail_decision", '{"request_id":1,"decision":"approve"}');
    assert.equal(out.ok, false);
    assert.match(JSON.stringify(out.result), /izin/);
    assert.equal(out.action, undefined);
  });
});

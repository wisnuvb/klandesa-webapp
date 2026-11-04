import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { JWT } from "next-auth/jwt";
import { slimJwt, SLIM_VILLAGE_KEYS } from "../lib/session-slim.ts";

const fat = (): JWT =>
  ({
    sub: "42",
    id: "42",
    role: "admin",
    accountType: "village",
    villageId: 7,
    villageCode: "C7",
    sv: 3,
    accessToken: "eyJ.access.token",
    refreshToken: "eyJ.refresh.token",
    village: {
      id: 7, code: "C7", name: "Desa Uji", district: "Kec", regency: "Kab", province: "Prov",
      address: "Jl. panjang", postalCode: "123", phone: "08", email: "d@x.id", website: "https://x.id",
      logoUrl: "data:image/png;base64," + "A".repeat(5000),
    },
  }) as unknown as JWT;

describe("slimJwt (ramping cookie sesi)", () => {
  it("membuang accessToken & refreshToken yang tak dipakai kode web", () => {
    const t = slimJwt(fat()) as Record<string, unknown>;
    assert.equal("accessToken" in t, false);
    assert.equal("refreshToken" in t, false);
  });

  it("village hanya menyisakan kolom yang dipakai klien (logoUrl/alamat/kontak dibuang)", () => {
    const v = slimJwt(fat()).village as unknown as Record<string, unknown>;
    assert.deepEqual(Object.keys(v).sort(), [...SLIM_VILLAGE_KEYS].sort());
    assert.equal(v.name, "Desa Uji");
    assert.equal(v.district, "Kec");
    assert.equal("logoUrl" in v, false);
  });

  it("klaim identitas & penjaga tidak tersentuh (id, role, accountType, villageId/Code, sv)", () => {
    const t = slimJwt(fat());
    assert.deepEqual(
      [t.id, t.role, t.accountType, t.villageId, t.villageCode, (t as { sv?: number }).sv],
      ["42", "admin", "village", 7, "C7", 3],
    );
  });

  it("idempoten dan aman tanpa village (akun regional/mitra/platform)", () => {
    const t = { id: "rg:1", accountType: "regional", accessToken: "x" } as unknown as JWT;
    assert.doesNotThrow(() => slimJwt(slimJwt(t)));
    assert.equal(t.village, undefined);
    assert.equal("accessToken" in (t as Record<string, unknown>), false);
  });

  it("callback jwt NextAuth yang sebenarnya menerapkannya pada token lama (migrasi tanpa login ulang)", async () => {
    process.env.AUTH_SECRET ||= "uji-rahasia-slim-0123456789abcdef";
    const { authOptions } = await import("../auth.ts");
    const out = (await authOptions.callbacks!.jwt!({ token: fat(), user: undefined as never, account: null, trigger: "update" } as never)) as Record<string, unknown>;
    assert.equal("accessToken" in out, false);
    assert.equal("refreshToken" in out, false);
    assert.equal(("logoUrl" in (out.village as object)), false);
    assert.equal(out.id, "42");
  });
});

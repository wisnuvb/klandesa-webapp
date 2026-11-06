import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HEALTH_CHECKS,
  checkDuplicateNik,
  checkExpiredButActive,
  checkHouseholdsWithoutHead,
  checkModules,
  checkNoActiveAdmin,
  checkNoData,
  checkNoRecentLogin,
  checkOfficialsWithoutAccount,
  checkPendingInvoices,
  checkResidentsWithoutKk,
  checkStorage,
  checkSubscriptionEnding,
  checkVillageInactive,
  runHealthChecks,
  type HealthInput,
} from "../lib/platform/villages/health.ts";
import {
  computeExtend,
  nextStorageLimitGb,
  validateExtend,
  validateReason,
  validateSet,
} from "../lib/platform/villages/subscription.ts";
import { maskEmail, safeEntityId } from "../lib/platform/villages/mask.ts";
import { gateVillage, isVillageEnabled, VILLAGE_INACTIVE_CODE } from "../lib/platform/villages/village-gate.ts";
import { parseVillageId } from "../lib/platform/villages/route-helpers.ts";
import { changedFieldNames } from "../lib/platform/villages/queries.ts";

const DAY = 86_400_000;
const now = new Date("2026-11-06T00:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * DAY);

function healthy(over: Partial<HealthInput> = {}): HealthInput {
  return {
    now,
    village: { isActive: true, createdAt: days(-200), subscriptionStatus: "active", subscriptionExpiry: days(200), storageLimitGb: 5, storageUsedGb: 1 },
    users: { total: 4, active: 4, activeAdmins: 1, loggedIn30d: 3 },
    auditEvents7d: 12,
    residents: { total: 100, withoutKk: 0, duplicateNikGroups: 0 },
    households: { total: 30, activeWithoutHead: 0 },
    officials: { active: 8, activeWithoutAccount: 0 },
    invoices: { pendingOverdue: 0 },
    modules: { expiredStillActive: 0, expiringIn7d: 0 },
    ...over,
  };
}

describe("kesehatan data desa: desa sehat", () => {
  it("tanpa temuan, semua pemeriksaan lolos", () => {
    const r = runHealthChecks(healthy());
    assert.deepEqual(r.findings, []);
    assert.equal(r.checked, HEALTH_CHECKS.length);
    assert.equal(r.passed, HEALTH_CHECKS.length);
  });
});

describe("kesehatan data desa: pemeriksaan satuan", () => {
  it("desa nonaktif -> kritis", () => {
    const f = checkVillageInactive(healthy({ village: { ...healthy().village, isActive: false } }));
    assert.equal(f?.severity, "critical");
    assert.equal(f?.id, "village-inactive");
  });

  it("tanpa admin aktif -> kritis; pengguna nol dijelaskan berbeda", () => {
    const a = checkNoActiveAdmin(healthy({ users: { total: 3, active: 3, activeAdmins: 0, loggedIn30d: 1 } }));
    assert.equal(a?.severity, "critical");
    assert.match(a!.detail, /3 pengguna/);
    const b = checkNoActiveAdmin(healthy({ users: { total: 0, active: 0, activeAdmins: 0, loggedIn30d: 0 } }));
    assert.match(b!.detail, /belum memiliki pengguna/);
    assert.equal(checkNoActiveAdmin(healthy()), null);
  });

  it("tidak ada login 30 hari: peringatan; desa baru dan tanpa pengguna aktif dikecualikan", () => {
    const stale = healthy({ users: { total: 4, active: 4, activeAdmins: 1, loggedIn30d: 0 } });
    assert.equal(checkNoRecentLogin(stale)?.severity, "warning");
    assert.equal(checkNoRecentLogin({ ...stale, village: { ...stale.village, createdAt: days(-3) } }), null);
    assert.equal(checkNoRecentLogin({ ...stale, users: { total: 2, active: 0, activeAdmins: 0, loggedIn30d: 0 } }), null);
    assert.equal(checkNoRecentLogin(healthy()), null);
  });

  it("langganan kedaluwarsa tetapi masih ada aktivitas", () => {
    const expired = healthy({ village: { ...healthy().village, subscriptionStatus: "active", subscriptionExpiry: days(-2) }, auditEvents7d: 7 });
    const f = checkExpiredButActive(expired);
    assert.equal(f?.id, "expired-with-activity");
    assert.equal(f?.count, 7);
    assert.equal(checkExpiredButActive({ ...expired, auditEvents7d: 0 }), null);
    assert.equal(checkExpiredButActive(healthy()), null, "langganan sehat + aktivitas = wajar");
    const inactive = healthy({ village: { ...healthy().village, subscriptionStatus: "inactive", subscriptionExpiry: null }, auditEvents7d: 1 });
    assert.ok(checkExpiredButActive(inactive));
  });

  it("trial hampir habis, langganan segera berakhir, masa tenggang", () => {
    const base = healthy().village;
    assert.equal(checkSubscriptionEnding(healthy({ village: { ...base, subscriptionStatus: "trial", subscriptionExpiry: days(2) } }))?.id, "trial-ending");
    assert.equal(checkSubscriptionEnding(healthy({ village: { ...base, subscriptionStatus: "trial", subscriptionExpiry: days(10) } })), null);
    assert.equal(checkSubscriptionEnding(healthy({ village: { ...base, subscriptionStatus: "active", subscriptionExpiry: days(5) } }))?.id, "subscription-ending");
    assert.equal(checkSubscriptionEnding(healthy({ village: { ...base, subscriptionStatus: "active", subscriptionExpiry: days(8) } })), null);
    // trial yang sudah lewat = fase tenggang (readable, tidak writable)
    assert.equal(checkSubscriptionEnding(healthy({ village: { ...base, subscriptionStatus: "trial", subscriptionExpiry: days(-1) } }))?.id, "in-grace");
    // tanpa masa berlaku: tidak ada peringatan
    assert.equal(checkSubscriptionEnding(healthy({ village: { ...base, subscriptionStatus: "active", subscriptionExpiry: null } })), null);
  });

  it("warga tanpa KK: info bila <20%, peringatan bila >=20%", () => {
    const low = checkResidentsWithoutKk(healthy({ residents: { total: 100, withoutKk: 5, duplicateNikGroups: 0 } }));
    assert.equal(low?.severity, "info");
    assert.match(low!.detail, /5 dari 100/);
    const high = checkResidentsWithoutKk(healthy({ residents: { total: 100, withoutKk: 20, duplicateNikGroups: 0 } }));
    assert.equal(high?.severity, "warning");
    assert.equal(checkResidentsWithoutKk(healthy()), null);
  });

  it("KK tanpa kepala", () => {
    const f = checkHouseholdsWithoutHead(healthy({ households: { total: 30, activeWithoutHead: 4 } }));
    assert.equal(f?.severity, "warning");
    assert.equal(f?.count, 4);
    assert.equal(checkHouseholdsWithoutHead(healthy()), null);
  });

  it("NIK ganda -> kritis", () => {
    const f = checkDuplicateNik(healthy({ residents: { total: 10, withoutKk: 0, duplicateNikGroups: 2 } }));
    assert.equal(f?.severity, "critical");
    assert.equal(f?.count, 2);
    assert.equal(checkDuplicateNik(healthy()), null);
  });

  it("perangkat tanpa akun", () => {
    const f = checkOfficialsWithoutAccount(healthy({ officials: { active: 8, activeWithoutAccount: 3 } }));
    assert.equal(f?.severity, "info");
    assert.match(f!.detail, /3 dari 8/);
    assert.equal(checkOfficialsWithoutAccount(healthy()), null);
  });

  it("penyimpanan: <90% lolos, 90% peringatan, 100% kritis, kuota 0 aman", () => {
    const v = healthy().village;
    assert.equal(checkStorage(healthy({ village: { ...v, storageUsedGb: 4.4 } })), null);
    assert.equal(checkStorage(healthy({ village: { ...v, storageUsedGb: 4.5 } }))?.severity, "warning");
    assert.equal(checkStorage(healthy({ village: { ...v, storageUsedGb: 5 } }))?.severity, "critical");
    assert.equal(checkStorage(healthy({ village: { ...v, storageLimitGb: 0, storageUsedGb: 0 } })), null);
    assert.equal(checkStorage(healthy({ village: { ...v, storageLimitGb: 0, storageUsedGb: 1 } }))?.severity, "critical");
  });

  it("tagihan pending lewat batas, modul kedaluwarsa", () => {
    assert.equal(checkPendingInvoices(healthy({ invoices: { pendingOverdue: 2 } }))?.severity, "warning");
    assert.equal(checkPendingInvoices(healthy()), null);
    assert.equal(checkModules(healthy({ modules: { expiredStillActive: 1, expiringIn7d: 0 } }))?.id, "modules-expired");
    assert.equal(checkModules(healthy()), null);
  });

  it("belum ada data warga: hanya untuk desa >= 14 hari", () => {
    const old = healthy({ residents: { total: 0, withoutKk: 0, duplicateNikGroups: 0 } });
    assert.equal(checkNoData(old)?.id, "no-residents");
    assert.equal(checkNoData({ ...old, village: { ...old.village, createdAt: days(-5) } }), null);
  });
});

describe("kesehatan data desa: pengurutan & isi temuan", () => {
  it("urut kritis -> peringatan -> info dan tiap temuan punya penjelasan + saran", () => {
    const r = runHealthChecks(
      healthy({
        village: { ...healthy().village, isActive: false },
        users: { total: 2, active: 2, activeAdmins: 0, loggedIn30d: 0 },
        residents: { total: 100, withoutKk: 5, duplicateNikGroups: 1 },
        households: { total: 10, activeWithoutHead: 1 },
        officials: { active: 3, activeWithoutAccount: 1 },
      }),
    );
    const sev = r.findings.map((f) => f.severity);
    const order = { critical: 0, warning: 1, info: 2 } as const;
    assert.deepEqual(sev, [...sev].sort((a, b) => order[a] - order[b]));
    assert.ok(r.findings.length >= 6);
    for (const f of r.findings) {
      assert.ok(f.id && f.title.length > 3 && f.detail.length > 10 && f.hint.length > 10, f.id);
      assert.ok(!/\d{16}/.test(JSON.stringify(f)), "tanpa NIK");
    }
    assert.equal(r.passed + r.findings.length, r.checked);
    const ids = r.findings.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length, "id unik");
  });
});

describe("langganan: validasi & hitung", () => {
  const sub = (status: string, expiry: Date | null, plan = "lengkap") => ({ plan, status, expiry, startedAt: null });

  it("alasan 5-300 karakter", () => {
    assert.equal(validateReason("abcd").ok, false);
    assert.equal(validateReason("   abcd   ").ok, false);
    assert.equal(validateReason("x".repeat(301)).ok, false);
    assert.equal(validateReason(123).ok, false);
    const ok = validateReason("  tiket #12  ");
    assert.ok(ok.ok && ok.value === "tiket #12");
  });

  it("validateExtend: satuan & jumlah", () => {
    assert.equal(validateExtend({ amount: 1, unit: "weeks" }).ok, false);
    assert.equal(validateExtend({ amount: 0, unit: "days" }).ok, false);
    assert.equal(validateExtend({ amount: 1.5, unit: "days" }).ok, false);
    assert.equal(validateExtend({ amount: -3, unit: "months" }).ok, false);
    assert.equal(validateExtend({ amount: "x", unit: "months" }).ok, false);
    assert.equal(validateExtend({ amount: 1096, unit: "days" }).ok, false);
    assert.equal(validateExtend({ amount: 37, unit: "months" }).ok, false);
    assert.equal(validateExtend({ amount: 1095, unit: "days" }).ok, true);
    assert.equal(validateExtend({ amount: "6", unit: "months" }).ok, true);
  });

  it("extend: disambung dari expiry yang masih berjalan", () => {
    const exp = days(10);
    const r = computeExtend(sub("active", exp), { amount: 30, unit: "days" }, now);
    assert.ok(r.ok);
    assert.equal(r.value.expiry.getTime(), exp.getTime() + 30 * DAY);
    assert.equal(r.value.status, "active");
  });

  it("extend: expiry sudah lewat -> dihitung dari sekarang dan status kembali active", () => {
    const r = computeExtend(sub("inactive", days(-40)), { amount: 30, unit: "days" }, now);
    assert.ok(r.ok);
    assert.equal(r.value.expiry.getTime(), now.getTime() + 30 * DAY);
    assert.equal(r.value.status, "active");
    const g = computeExtend(sub("grace", days(2)), { amount: 1, unit: "days" }, now);
    assert.ok(g.ok && g.value.status === "active");
  });

  it("extend: tanpa expiry (null) dihitung dari sekarang", () => {
    const r = computeExtend(sub("inactive", null), { amount: 7, unit: "days" }, now);
    assert.ok(r.ok);
    assert.equal(r.value.expiry.getTime(), now.getTime() + 7 * DAY);
  });

  it("extend bulan: akhir bulan tidak meluber (31 Jan + 1 bulan = 28/29 Feb)", () => {
    const jan31 = new Date(2027, 0, 31, 12, 0, 0);
    const r = computeExtend(sub("active", jan31), { amount: 1, unit: "months" }, new Date(2026, 11, 1));
    assert.ok(r.ok);
    assert.equal(r.value.expiry.getMonth(), 1);
    assert.equal(r.value.expiry.getDate(), 28);
  });

  it("extend: trial tetap trial; dibatalkan ditolak; status asing ditolak", () => {
    const t = computeExtend(sub("trial", days(3)), { amount: 7, unit: "days" }, now);
    assert.ok(t.ok && t.value.status === "trial");
    assert.equal(computeExtend(sub("cancelled", days(3)), { amount: 7, unit: "days" }, now).ok, false);
    assert.equal(computeExtend(sub("weird", days(3)), { amount: 7, unit: "days" }, now).ok, false);
  });

  it("extend: startedAt lama dipertahankan, null diisi sekarang", () => {
    const old = new Date("2026-01-01T00:00:00Z");
    const a = computeExtend({ plan: "lengkap", status: "active", expiry: days(5), startedAt: old }, { amount: 1, unit: "days" }, now);
    assert.ok(a.ok && a.value.startedAt.getTime() === old.getTime());
    const b = computeExtend(sub("active", days(5)), { amount: 1, unit: "days" }, now);
    assert.ok(b.ok && b.value.startedAt.getTime() === now.getTime());
  });

  it("validateSet: paket & status harus dari daftar sah", () => {
    assert.equal(validateSet({ plan: "gratis", status: "active", expiry: days(5).toISOString() }, now).ok, false);
    assert.equal(validateSet({ plan: "lengkap", status: "aktif", expiry: days(5).toISOString() }, now).ok, false);
    for (const plan of ["starter", "profesional", "enterprise", "lengkap"]) {
      assert.equal(validateSet({ plan, status: "active", expiry: days(5).toISOString() }, now).ok, true, plan);
    }
  });

  it("validateSet: aturan masa berlaku", () => {
    const f = days(5).toISOString();
    assert.equal(validateSet({ plan: "lengkap", status: "active", expiry: days(-1).toISOString() }, now).ok, false, "aktif + lampau");
    assert.equal(validateSet({ plan: "lengkap", status: "trial", expiry: days(-1).toISOString() }, now).ok, false);
    assert.equal(validateSet({ plan: "lengkap", status: "trial", expiry: null }, now).ok, false, "trial wajib tanggal");
    assert.equal(validateSet({ plan: "lengkap", status: "grace", expiry: null }, now).ok, false);
    assert.equal(validateSet({ plan: "lengkap", status: "active", expiry: null }, now).ok, true, "aktif tanpa batas");
    assert.equal(validateSet({ plan: "lengkap", status: "inactive", expiry: null }, now).ok, true);
    assert.equal(validateSet({ plan: "lengkap", status: "cancelled", expiry: days(-30).toISOString() }, now).ok, true);
    assert.equal(validateSet({ plan: "lengkap", status: "active", expiry: "bukan-tanggal" }, now).ok, false);
    assert.equal(validateSet({ plan: "lengkap", status: "active", expiry: 12345 }, now).ok, false);
    assert.equal(validateSet({ plan: "lengkap", status: "active", expiry: days(365 * 11).toISOString() }, now).ok, false, ">10 tahun");
    const ok = validateSet({ plan: "lengkap", status: "active", expiry: f }, now);
    assert.ok(ok.ok && ok.value.expiry?.toISOString() === f);
  });

  it("kuota penyimpanan tidak pernah turun", () => {
    assert.equal(nextStorageLimitGb(50, 5), 50);
    assert.equal(nextStorageLimitGb(5, 20), 20);
  });
});

describe("penyamaran & penegak desa", () => {
  it("maskEmail", () => {
    assert.equal(maskEmail("budi.santoso@desa.id"), "bu***@desa.id");
    assert.equal(maskEmail("a@x.id"), "a***@x.id");
    assert.equal(maskEmail("tanpa-at"), "***");
    assert.equal(maskEmail(null), "***");
    assert.ok(!maskEmail("budi.santoso@desa.id").includes("santoso"));
  });

  it("safeEntityId hanya angka pendek (NIK/KK 16 digit dan teks dibuang)", () => {
    assert.equal(safeEntityId("123"), "123");
    assert.equal(safeEntityId("3201010101010001"), null);
    assert.equal(safeEntityId("budi"), null);
    assert.equal(safeEntityId(null), null);
  });

  it("changedFieldNames membuang kolom sensitif dan nilai", () => {
    assert.deepEqual(changedFieldNames({ name: { from: "a", to: "b" }, nik: { changed: true }, phone: { changed: true }, status: {} }), ["name", "status"]);
    assert.deepEqual(changedFieldNames(null), []);
    assert.deepEqual(changedFieldNames(["x"]), []);
  });

  it("village-gate: hanya isActive===true lolos; respons 403 berkode stabil", async () => {
    assert.equal(isVillageEnabled({ isActive: true }), true);
    assert.equal(isVillageEnabled({ isActive: false }), false);
    assert.equal(isVillageEnabled(null), false);
    assert.equal(gateVillage({ isActive: true }), null);
    const res = gateVillage({ isActive: false });
    assert.equal(res?.status, 403);
    assert.equal((await res!.json()).code, VILLAGE_INACTIVE_CODE);
  });

  it("parseVillageId", () => {
    assert.equal(parseVillageId("12"), 12);
    for (const bad of ["0", "-1", "1e3", "12abc", "", "1.5", "9999999999"]) assert.equal(parseVillageId(bad), null, bad);
  });
});

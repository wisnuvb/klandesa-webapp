import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  coerceSplitInput,
  emptySplitInput,
  firstIssue,
  hasSplitIssues,
  sourceNeedsNewHead,
  validateSplit,
  SPLIT_MESSAGES,
  type SplitContext,
  type SplitInput,
  type SplitMember,
} from "../lib/kependudukan/split.ts";
import { resolveApiPermission } from "../lib/permissions/api-route-map.ts";
import { DetailKKModal } from "../components/modals/DetailKKModal.tsx";
import { SplitHouseholdPanel } from "../components/app/kependudukan/SplitHouseholdPanel.tsx";

const NOW = new Date("2026-11-04T10:00:00Z");
const OLD = "3508070101100011";
const NEW = "3508070101100099";

const M = (id: number, name: string, familyRole: string, active = true): SplitMember => ({ id, name, familyRole, active });
const FAMILY: SplitMember[] = [M(1, "Budi", "Kepala Keluarga"), M(2, "Siti", "Istri"), M(3, "Andi", "Anak"), M(4, "Rina", "Anak"), M(5, "Mbah", "Orang Tua", false)];
const ctx = (o: Partial<SplitContext> = {}): SplitContext => ({ sourceKk: OLD, members: FAMILY, newKkTakenBy: null, now: NOW, ...o });
const input = (o: Partial<SplitInput> = {}): SplitInput => ({
  ...emptySplitInput(),
  newKk: NEW,
  effectiveDate: "2026-11-01",
  moves: [{ residentId: 3, familyRole: "Kepala Keluarga" }],
  ...o,
});

describe("pecah KK: validasi aturan", () => {
  it("kasus normal (anak menikah membentuk KK sendiri) lolos tanpa galat", () => {
    const i = validateSplit(input({ moves: [{ residentId: 3, familyRole: "Kepala Keluarga" }] }), ctx());
    assert.equal(hasSplitIssues(i), false);
  });

  it("nomor KK baru: 16 angka (spasi boleh), bukan KK sekarang, belum dipakai warga lain", () => {
    assert.equal(validateSplit(input({ newKk: "3508 0701 0110 0099" }), ctx()).newKk, undefined);
    assert.equal(validateSplit(input({ newKk: "123" }), ctx()).newKk, SPLIT_MESSAGES.newKkFormat);
    assert.equal(validateSplit(input({ newKk: OLD }), ctx()).newKk, SPLIT_MESSAGES.newKkSame);
    assert.match(validateSplit(input(), ctx({ newKkTakenBy: "Joko" })).newKk ?? "", /sudah dipakai.*Joko.*Perubahan KK/s);
  });

  it("tanggal: harus sah dan tidak di masa depan", () => {
    assert.equal(validateSplit(input({ effectiveDate: "" }), ctx()).effectiveDate, SPLIT_MESSAGES.date);
    assert.equal(validateSplit(input({ effectiveDate: "2026-02-30" }), ctx()).effectiveDate, SPLIT_MESSAGES.date);
    assert.equal(validateSplit(input({ effectiveDate: "2026-12-01" }), ctx()).effectiveDate, SPLIT_MESSAGES.dateFuture);
    assert.equal(validateSplit(input({ effectiveDate: "2026-11-04" }), ctx()).effectiveDate, undefined);
  });

  it("wajib memilih anggota; yang bukan anggota / sudah meninggal-pindah / ganda ditolak per orang", () => {
    assert.equal(validateSplit(input({ moves: [] }), ctx()).moves, SPLIT_MESSAGES.noMoves);
    const i = validateSplit(
      input({ moves: [{ residentId: 99, familyRole: "Anak" }, { residentId: 5, familyRole: "Anak" }, { residentId: 3, familyRole: "Kepala Keluarga" }, { residentId: 3, familyRole: "Istri" }] }),
      ctx(),
    );
    assert.match(i.members[99], /Bukan anggota/);
    assert.match(i.members[5], /Mbah.*sudah meninggal atau pindah/);
    assert.match(i.members[3], /lebih dari sekali/);
  });

  it("hubungan di KK baru wajib dipilih dan harus salah satu hubungan baku", () => {
    assert.equal(validateSplit(input({ moves: [{ residentId: 3, familyRole: "Kepala Keluarga" }, { residentId: 4, familyRole: "" }] }), ctx()).members[4], SPLIT_MESSAGES.role);
    assert.equal(validateSplit(input({ moves: [{ residentId: 3, familyRole: "Kepala Keluarga" }, { residentId: 4, familyRole: "Raja" }] }), ctx()).members[4], SPLIT_MESSAGES.role);
  });

  it("KK baru punya tepat satu Kepala Keluarga", () => {
    assert.equal(validateSplit(input({ moves: [{ residentId: 3, familyRole: "Istri" }] }), ctx()).heads, SPLIT_MESSAGES.noNewHead);
    const two = validateSplit(input({ moves: [{ residentId: 3, familyRole: "Kepala Keluarga" }, { residentId: 4, familyRole: "Kepala Keluarga" }] }), ctx());
    assert.equal(two.heads, SPLIT_MESSAGES.manyNewHeads);
  });

  it("minimal satu anggota aktif tetap di KK lama (semua pindah = bukan pecah KK); yang sudah meninggal tidak dihitung", () => {
    const all = validateSplit(
      input({ moves: [{ residentId: 1, familyRole: "Kepala Keluarga" }, { residentId: 2, familyRole: "Istri" }, { residentId: 3, familyRole: "Anak" }, { residentId: 4, familyRole: "Anak" }] }),
      ctx(),
    );
    assert.equal(all.moves, SPLIT_MESSAGES.allMove);
  });

  it("kepala lama ikut pindah → KK lama wajib diberi kepala baru dari anggota aktif yang tinggal", () => {
    const moves = [{ residentId: 1, familyRole: "Kepala Keluarga" }, { residentId: 2, familyRole: "Istri" }];
    assert.equal(validateSplit(input({ moves }), ctx()).newSourceHead, SPLIT_MESSAGES.sourceHeadLeaves);
    assert.equal(validateSplit(input({ moves, newSourceHeadId: 3 }), ctx()).newSourceHead, undefined);
    assert.equal(validateSplit(input({ moves, newSourceHeadId: 5 }), ctx()).newSourceHead, SPLIT_MESSAGES.sourceHeadInvalid);
    assert.equal(validateSplit(input({ moves, newSourceHeadId: 1 }), ctx()).newSourceHead, SPLIT_MESSAGES.sourceHeadInvalid);
    // Kepala lama tetap tinggal → tidak perlu kepala baru.
    assert.equal(validateSplit(input(), ctx()).newSourceHead, undefined);
  });

  it("KK lama yang memang sudah tanpa kepala tidak dipaksa punya kepala oleh pecah KK", () => {
    const noHead = FAMILY.map((m) => (m.id === 1 ? M(1, "Budi", "Famili Lain") : m));
    assert.equal(validateSplit(input(), ctx({ members: noHead })).newSourceHead, undefined);
  });

  it("alamat berbeda: wajib bila dinyalakan, batas panjang; mati = diabaikan", () => {
    const base = { enabled: true, address: "", rt: "", rw: "", hamlet: "" };
    assert.equal(validateSplit(input({ address: base }), ctx()).address, SPLIT_MESSAGES.addressRequired);
    assert.equal(validateSplit(input({ address: { ...base, address: "Jl. Baru 2", rt: "01", rw: "02" } }), ctx()).address, undefined);
    assert.match(validateSplit(input({ address: { ...base, address: "x".repeat(501) } }), ctx()).address ?? "", /terlalu panjang/);
    assert.equal(validateSplit(input({ address: { ...base, enabled: false } }), ctx()).address, undefined);
  });

  it("firstIssue memilih pesan paling relevan dan tidak pernah kosong", () => {
    assert.equal(firstIssue({ members: {} }), "Data pecah KK belum lengkap.");
    assert.equal(firstIssue({ newKk: "a", moves: "b", members: {} }), "a");
    assert.equal(firstIssue({ members: { 3: "galat anggota" } }), "galat anggota");
  });

  it("sourceNeedsNewHead konsisten dengan validasi", () => {
    assert.equal(sourceNeedsNewHead(FAMILY, new Set([1, 2])), true);
    assert.equal(sourceNeedsNewHead(FAMILY, new Set([3])), false);
    assert.equal(sourceNeedsNewHead(FAMILY, new Set([1, 2, 3, 4])), false);
  });
});

describe("pecah KK: membaca badan permintaan", () => {
  it("bentuk salah → null; nilai dirapikan dan dibatasi", () => {
    assert.equal(coerceSplitInput(null), null);
    assert.equal(coerceSplitInput({ moves: "x" }), null);
    assert.equal(coerceSplitInput({ moves: [{ residentId: "abc" }] }), null);
    assert.equal(coerceSplitInput({ moves: [{ residentId: -1 }] }), null);
    const c = coerceSplitInput({
      newKk: NEW, effectiveDate: "2026-11-01", newSourceHeadId: "7",
      moves: [{ residentId: "3", familyRole: "  Anak  " }],
      address: { enabled: true, address: "  Jl. X  ", rt: " 01 ", rw: "02", hamlet: "Karangsari" },
    });
    assert.ok(c);
    assert.deepEqual(c.moves, [{ residentId: 3, familyRole: "Anak" }]);
    assert.equal(c.newSourceHeadId, 7);
    assert.deepEqual(c.address, { enabled: true, address: "Jl. X", rt: "01", rw: "02", hamlet: "Karangsari" });
    assert.equal(coerceSplitInput({ moves: [], address: { enabled: "true" } })?.address.enabled, false);
  });
});

describe("panel Pecah KK (render awal)", () => {
  const hh = (members: Array<{ id: number; active: boolean }>) => ({
    kk: OLD,
    members: members.map((m) => ({ ...m, name: `W${m.id}`, nikLast4: "0001", familyRole: m.id === 1 ? "Kepala Keluarga" : "Anak" })),
  });
  const render = (h: ReturnType<typeof hh>, allowed?: boolean) =>
    renderToStaticMarkup(createElement(SplitHouseholdPanel, { household: h, onDone: () => {}, allowed }));

  it("tampil sebagai tombol bila ada ≥2 anggota aktif", () => {
    const html = render(hh([{ id: 1, active: true }, { id: 2, active: true }]));
    assert.match(html, /<button[^>]*>.*Pecah KK/s);
    assert.ok(!html.includes('aria-label="Pecah KK"'), "formulir tidak terbuka sebelum diklik");
  });

  it("tidak tampil bila anggota aktif kurang dari 2 (yang meninggal/pindah tidak dihitung)", () => {
    assert.equal(render(hh([{ id: 1, active: true }, { id: 2, active: false }, { id: 3, active: false }])), "");
  });

  it("tidak tampil untuk peran tanpa izin ubah warga", () => {
    assert.equal(render(hh([{ id: 1, active: true }, { id: 2, active: true }]), false), "");
  });
});

describe("pecah KK: izin API", () => {
  it("POST /api/kk/{kk}/pecah dihitung sebagai UPDATE warga (bukan create), termasuk path ter-encode", () => {
    assert.deepEqual(resolveApiPermission("/api/kk/3508070101100011/pecah", "POST"), { resource: "residents", action: "update" });
    assert.deepEqual(resolveApiPermission("/api/kk/%33508070101100011/pecah", "POST"), { resource: "residents", action: "update" });
    // Rute KK lain tetap memakai aturan turunan metode.
    assert.deepEqual(resolveApiPermission("/api/kk/3508070101100011", "GET"), { resource: "residents", action: "read" });
  });
});

describe("modal Detail KK (halaman Data KK)", () => {
  const kk = (movedLast = false) => ({
    id: OLD, family_card_number: OLD, kepalaKeluarga: "Budi", alamat: "Jl. A", rt: "01", rw: "02", hamlet: "Karangsari", jumlahAnggota: 3,
    anggotaKeluarga: [
      { id: 1, name: "Budi", id_number: "3508070101900011", gender: "M" as const, birthplace: "X", date_of_birth: "1990-01-01T00:00:00.000Z", religion_id: 1, education_id: 1, job_id: 1, marital_status: "M", status_family: "Kepala Keluarga", is_live: "Y", is_active: true, role: "CITIZEN" },
      { id: 2, name: "Siti", id_number: "3508074101920012", gender: "F" as const, birthplace: "X", date_of_birth: "1992-01-01T00:00:00.000Z", religion_id: 1, education_id: 1, job_id: 1, marital_status: "M", status_family: "Istri", is_live: "Y", is_active: true, role: "CITIZEN" },
      { id: 3, name: "Andi", id_number: "3508071501150013", gender: "M" as const, birthplace: "X", date_of_birth: "2015-01-15T00:00:00.000Z", religion_id: 1, education_id: 1, job_id: 1, marital_status: "TM", status_family: "Anak", is_live: "Y", is_active: !movedLast, role: "CITIZEN" },
    ],
  });
  const render = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(DetailKKModal, { isOpen: true, onClose: () => {}, ...props } as never));

  it("peran yang boleh mengubah warga melihat tombol Pecah KK; tombol mati 'Edit Data KK' sudah tidak ada", () => {
    const html = render({ kkData: kk(), canSplit: true });
    assert.match(html, /<button[^>]*>.*Pecah KK/s);
    assert.ok(!html.includes("Edit Data KK"));
  });

  it("tanpa izin, atau bila yang aktif kurang dari 2, tombol tidak ditawarkan", () => {
    assert.ok(!render({ kkData: kk(), canSplit: false }).includes("Pecah KK"));
    const one = kk();
    one.anggotaKeluarga[1].is_active = false;
    one.anggotaKeluarga[2].is_active = false;
    assert.ok(!render({ kkData: one, canSplit: true }).includes("Pecah KK"));
  });
});

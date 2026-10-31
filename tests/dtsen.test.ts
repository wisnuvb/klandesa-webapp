import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isFinal, STATUSES, TRANSITIONS } from "../lib/dtsen/catalog";
import { parseProposalInput, parseTransition } from "../lib/dtsen/service";

const NOW = new Date("2026-11-01T03:00:00Z");

describe("alur usulan DTSEN", () => {
  it("setiap tujuan adalah status yang dikenal dan tak ada jalan kembali ke DIAJUKAN", () => {
    for (const s of STATUSES) for (const t of TRANSITIONS[s]) assert.ok(STATUSES.includes(t) && t !== "DIAJUKAN");
  });
  it("status akhir tak punya jalan keluar; setelah diteruskan hanya SELESAI", () => {
    for (const s of ["DITOLAK_MUSDES", "SELESAI", "DIBATALKAN"] as const) assert.ok(isFinal(s));
    assert.deepEqual(TRANSITIONS.DITERUSKAN, ["SELESAI"]);
  });
  it("semua status non-akhir bisa dicapai dari DIAJUKAN (tak ada tahap yatim)", () => {
    const seen = new Set(["DIAJUKAN"]);
    for (let i = 0; i < 10; i++) for (const s of [...seen]) for (const t of TRANSITIONS[s as keyof typeof TRANSITIONS]) seen.add(t);
    assert.equal(seen.size, STATUSES.length);
  });
});

describe("parseProposalInput", () => {
  const ok = { residentId: 5, kind: "TAMBAH", source: "RT", reason: "Rumah tidak layak huni" };
  it("menerima isian lengkap dan merapikan alasan", () => {
    const r = parseProposalInput({ ...ok, reason: "  Rumah   tidak layak  ", knownDesil: " 5 " });
    assert.ok(r.ok && r.value.reason === "Rumah tidak layak" && r.value.knownDesil === "5");
  });
  it("menolak jenis/sumber asing, warga tak valid, alasan kosong", () => {
    assert.ok(!parseProposalInput({ ...ok, kind: "constructor" }).ok);
    assert.ok(!parseProposalInput({ ...ok, source: "toString" }).ok);
    assert.ok(!parseProposalInput({ ...ok, residentId: "abc" }).ok);
    assert.ok(!parseProposalInput({ ...ok, reason: "" }).ok);
    assert.ok(!parseProposalInput(null).ok);
  });
});

describe("parseTransition", () => {
  it("verifikasi butuh tanggal, nama, dan hasil lapangan", () => {
    assert.ok(!parseTransition({ ids: [1], to: "TERVERIFIKASI" }, NOW).ok);
    assert.ok(parseTransition({ ids: [1], to: "TERVERIFIKASI", verifiedAt: "2026-10-20", verifiedBy: "Petugas A", verificationNote: "Dinding bambu, lantai tanah" }, NOW).ok);
  });
  it("musyawarah (setuju/tolak) butuh tanggal dan nomor berita acara", () => {
    for (const to of ["DISETUJUI_MUSDES", "DITOLAK_MUSDES"]) {
      assert.ok(!parseTransition({ ids: [1], to, musdesAt: "2026-10-25" }, NOW).ok);
      assert.ok(parseTransition({ ids: [1, 2], to, musdesAt: "2026-10-25", musdesRef: "BA/12/2026" }, NOW).ok);
    }
  });
  it("tanggal tak boleh di masa depan; hasil akhir wajib DITERIMA/DITOLAK", () => {
    assert.ok(!parseTransition({ ids: [1], to: "DITERUSKAN", forwardedAt: "2027-01-01", forwardedRef: "S-1" }, NOW).ok);
    assert.ok(!parseTransition({ ids: [1], to: "SELESAI", outcome: "MUNGKIN", outcomeAt: "2026-10-30" }, NOW).ok);
    assert.ok(parseTransition({ ids: [1], to: "SELESAI", outcome: "DITERIMA", outcomeAt: "2026-10-30" }, NOW).ok);
  });
  it("pembatalan wajib beralasan; tak ada jalan ke DIAJUKAN; id dibatasi 100 dan tak boleh asing", () => {
    assert.ok(!parseTransition({ ids: [1], to: "DIBATALKAN" }, NOW).ok);
    assert.ok(parseTransition({ ids: [1], to: "DIBATALKAN", outcomeNote: "Warga pindah" }, NOW).ok);
    assert.ok(!parseTransition({ ids: [1], to: "DIAJUKAN" }, NOW).ok);
    assert.ok(!parseTransition({ ids: Array.from({ length: 101 }, (_, i) => i + 1), to: "DIBATALKAN", outcomeNote: "x" }, NOW).ok);
    assert.ok(!parseTransition({ ids: ["a"], to: "DIBATALKAN", outcomeNote: "x" }, NOW).ok);
    assert.ok(!parseTransition({ ids: [], to: "DIBATALKAN", outcomeNote: "x" }, NOW).ok);
    assert.ok(!parseTransition({ ids: [1], to: "constructor" }, NOW).ok);
  });
  it("id ganda digabung", () => {
    const r = parseTransition({ ids: [3, 3, 4], to: "DIBATALKAN", outcomeNote: "x" }, NOW);
    assert.ok(r.ok && r.value.ids.length === 2);
  });
});

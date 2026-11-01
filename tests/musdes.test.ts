import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INCLUSION_KINDS, KINDS, MUSRENBANG_UNSUR, UNSUR, UNSUR_KEYS, type Unsur } from "../lib/musdes/catalog";
import { inclusionWarnings, type AttendeeLite } from "../lib/musdes/inclusion";
import { parseAttendeeInput, parseDecisionInput, parseMeetingInput, parseMinutesInput } from "../lib/musdes/schema";

const att = (unsur: Unsur, gender: "L" | "P" | null = null, present = true): AttendeeLite => ({ unsur, gender, present });

describe("katalog Musdes", () => {
  it("Pasal 46 ayat 3 memuat sepuluh unsur masyarakat dan semuanya terdaftar", () => {
    assert.equal(MUSRENBANG_UNSUR.length, 10);
    for (const u of MUSRENBANG_UNSUR) assert.ok(UNSUR_KEYS.includes(u), u);
    assert.ok(Object.keys(UNSUR).includes("DISABILITAS"));
  });
  it("jenis musyawarah punya dasar hukum dan penyelenggara", () => {
    for (const k of Object.values(KINDS)) {
      assert.ok(k.label && k.basis && k.organizer);
    }
    assert.equal(KINDS.MUSRENBANGDES.organizer, "Kepala Desa");
    assert.equal(KINDS.MUSDES_BLT.organizer, "Badan Permusyawaratan Desa");
  });
});

describe("keterwakilan peserta", () => {
  const everyone: AttendeeLite[] = [att("PEMERINTAH_DESA", "L"), att("BPD", "L"), ...MUSRENBANG_UNSUR.map((u) => att(u, u === "KELOMPOK_PEREMPUAN" ? "P" : "L")), att("DISABILITAS", "L")];

  it("Musrenbangdes lengkap tanpa peringatan", () => {
    assert.deepEqual(inclusionWarnings("MUSRENBANGDES", everyone, { onlyPresent: true }), []);
  });

  it("Musdes yang diselenggarakan BPD memperingatkan bila tak ada anggota BPD", () => {
    const w = inclusionWarnings("MUSDES_BLT", [att("WARGA", "P"), att("KELOMPOK_MISKIN"), att("DISABILITAS"), att("KELOMPOK_ANAK")], { onlyPresent: true });
    assert.deepEqual(w.map((x) => x.code), ["NO_BPD"]);
  });

  it("tanpa perempuan, miskin, disabilitas, dan anak → empat peringatan khusus", () => {
    const codes = inclusionWarnings("MUSDES_PERENCANAAN", [att("BPD", "L"), att("TOKOH_ADAT", "L")], { onlyPresent: true }).map((x) => x.code);
    assert.deepEqual(codes.sort(), ["NO_CHILD_GROUP", "NO_DISABLED", "NO_POOR", "NO_WOMEN"]);
  });

  it("perempuan dalam unsur apa pun memenuhi syarat perempuan", () => {
    const codes = inclusionWarnings("MUSDES_PERENCANAAN", [att("BPD", "L"), att("TOKOH_AGAMA", "P")], { onlyPresent: true }).map((x) => x.code);
    assert.ok(!codes.includes("NO_WOMEN"));
  });

  it("setelah terlaksana hanya yang HADIR dihitung; sebelumnya seluruh undangan", () => {
    const list = [att("BPD", "L"), att("KELOMPOK_MISKIN", "P", false), att("DISABILITAS", "L", false), att("KELOMPOK_ANAK", "L", false)];
    const held = inclusionWarnings("MUSDES_BLT", list, { onlyPresent: true }).map((x) => x.code);
    assert.ok(held.includes("NO_POOR") && held.includes("NO_DISABLED") && held.includes("NO_WOMEN"));
    const planned = inclusionWarnings("MUSDES_BLT", list, { onlyPresent: false }).map((x) => x.code);
    assert.deepEqual(planned, []);
  });

  it("Musrenbangdes menyebut unsur yang belum terwakili tanpa mengulang yang sudah punya peringatan khusus", () => {
    const w = inclusionWarnings("MUSRENBANGDES", [att("PEMERINTAH_DESA", "L"), att("TOKOH_ADAT", "L")], { onlyPresent: true });
    const missing = w.find((x) => x.code === "MISSING_UNSUR");
    assert.ok(missing);
    assert.ok(missing.message.includes("tokoh agama") && missing.message.includes("kelompok tani"));
    assert.ok(!missing.message.includes("masyarakat miskin"), "sudah ada NO_POOR");
    assert.ok(!missing.message.includes("perempuan"), "sudah ada NO_WOMEN");
    assert.ok(w.some((x) => x.code === "NO_POOR"));
  });

  it("jenis lain-lain tidak diperiksa", () => {
    assert.ok(!INCLUSION_KINDS.includes("MUSDES_LAINNYA"));
    assert.deepEqual(inclusionWarnings("MUSDES_LAINNYA", [], { onlyPresent: true }), []);
  });
});

describe("validasi isian Musdes", () => {
  const ok = { kind: "MUSRENBANGDES", title: "Musrenbangdes RKP Desa 2027", scheduledOn: "2026-11-10", startTime: "19:30", planYear: 2027 };

  it("menerima isian lengkap", () => {
    const p = parseMeetingInput(ok, "create");
    assert.ok(p.ok);
    if (p.ok) {
      assert.equal(p.value.kind, "MUSRENBANGDES");
      assert.equal(p.value.scheduledOn.toISOString().slice(0, 10), "2026-11-10");
      assert.equal(p.value.planYear, 2027);
    }
  });
  it("menolak judul kosong, jenis tak dikenal saat membuat, tanggal tak ada, jam salah", () => {
    const p = parseMeetingInput({ kind: "x", title: "  ", scheduledOn: "2026-02-30", startTime: "25:00" }, "create");
    assert.ok(!p.ok);
    if (!p.ok) assert.deepEqual(Object.keys(p.fieldErrors).sort(), ["kind", "scheduledOn", "startTime", "title"]);
  });
  it("jenis tidak wajib saat mengubah", () => {
    assert.ok(parseMeetingInput({ title: "Judul baru", scheduledOn: "2026-11-10" }, "update").ok);
  });
  it("peserta: butuh nama atau warga, unsur sah, jenis kelamin L/P", () => {
    assert.ok(!parseAttendeeInput({ unsur: "WARGA" }).ok);
    assert.ok(parseAttendeeInput({ residentId: 5, unsur: "WARGA" }).ok);
    assert.ok(!parseAttendeeInput({ name: "A", unsur: "BUKAN" }).ok);
    assert.ok(!parseAttendeeInput({ name: "A", unsur: "WARGA", gender: "X" }).ok);
    const p = parseAttendeeInput({ name: "  Siti   Aminah ", unsur: "KELOMPOK_PEREMPUAN", gender: "P", present: true });
    assert.ok(p.ok);
    if (p.ok) assert.equal(p.value.name, "Siti Aminah");
  });
  it("keputusan dan berita acara", () => {
    assert.ok(!parseDecisionInput({ text: "" }).ok);
    assert.ok(!parseDecisionInput({ text: "x".repeat(1001) }).ok);
    assert.ok(parseDecisionInput({ text: "Menyetujui rancangan RKP Desa", refType: "RKPDES", refId: 3 }).ok);
    assert.ok(!parseMinutesInput({ heldOn: "2026-13-01" }).ok);
    assert.ok(parseMinutesInput({ minutesNo: "BA/01/2026", minutesText: "Isi", heldOn: "2026-11-10" }).ok);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrgTree,
  coordinatorCandidates,
  createsSupervisorCycle,
  DEFAULT_ORG_SETTINGS,
  groupChildren,
  inferOrgUnit,
  mergeOrgSettings,
  parseOrgSettingsPatch,
  readOrgSettings,
  resolveOrgRole,
  supervisorCandidates,
  type OrgPerson,
} from "../lib/officials/org";

let seq = 0;
function person(name: string, pos: string, level: number, supervisorId: number | null, extra: Partial<OrgPerson> = {}): OrgPerson {
  seq += 1;
  return { id: seq, name, status: "active", supervisorId, position: { name: pos, level }, ...extra };
}

/** Desa contoh: Kades, Sekdes, 3 Kaur, 3 Kasi, 2 Kadus. `kasiTo` = atasan Kasi. */
function village(kasiTo: "kades" | "sekdes" = "kades") {
  seq = 0;
  const kades = person("Sugiyo", "Kepala Desa", 1, null);
  const sekdes = person("Hermansyah", "Sekretaris Desa", 2, kades.id);
  const people = [
    kades,
    sekdes,
    person("Jumadiwono", "Kaur Tata Usaha dan Umum", 3, sekdes.id),
    person("Shodiq", "Kaur Keuangan", 3, sekdes.id),
    person("Joko Sakur", "Kaur Perencanaan", 3, sekdes.id),
    person("Siswardoyo", "Kasi Kesejahteraan", 3, kasiTo === "kades" ? kades.id : sekdes.id),
    person("Gathot Jumadi", "Kasi Pemerintahan", 3, kades.id),
    person("Muhammad F", "Kasi Pelayanan", 3, kasiTo === "kades" ? kades.id : sekdes.id),
    person("Budi", "Kepala Dusun I", 4, kades.id),
    person("Agus", "Kepala Dusun II", 4, kades.id),
  ];
  return { people, kades, sekdes };
}

describe("peran & unit dari jabatan", () => {
  it("membedakan Kaur dan Kasi yang sama-sama level 3", () => {
    assert.equal(resolveOrgRole({ name: "KAUR KEUANGAN", level: 3 }), "kaur");
    assert.equal(resolveOrgRole({ name: "Kepala Urusan Perencanaan", level: 3 }), "kaur");
    assert.equal(resolveOrgRole({ name: "KASI PEMERINTAHAN", level: 3 }), "kasi");
    assert.equal(resolveOrgRole({ name: "Kepala Seksi Pelayanan", level: 3 }), "kasi");
    assert.equal(resolveOrgRole({ name: "Kepala Dusun III", level: 4 }), "kadus");
    assert.equal(resolveOrgRole({ name: "Sekretaris Desa", level: 2 }), "sekdes");
    assert.equal(resolveOrgRole({ name: "Kepala Desa", level: 1 }), "kades");
  });
  it("jatuh ke level bila nama tidak dikenal, dan unit eksplisit menang", () => {
    assert.equal(inferOrgUnit("Jabatan Aneh", 1), "LEADER");
    assert.equal(inferOrgUnit("Jabatan Aneh", 4), "REGIONAL");
    assert.equal(inferOrgUnit("Jabatan Aneh", 3), "OTHER");
    assert.equal(resolveOrgRole({ name: "Jabatan Aneh", level: 3, unit: "TECHNICAL" }), "kasi");
    assert.equal(resolveOrgRole({ name: "Staf Pelayanan", level: 5, unit: "TECHNICAL" }), "staf");
    assert.equal(resolveOrgRole(null), "lain");
  });
});

describe("pohon bagan", () => {
  it("menyusun Kades > Sekdes/Kasi/Kadus dan Sekdes > Kaur dengan urutan baku", () => {
    const { people, kades } = village();
    const tree = buildOrgTree(people);
    assert.equal(tree.roots.length, 1);
    assert.equal(tree.roots[0].person.id, kades.id);
    assert.deepEqual(
      tree.roots[0].children.map((c) => c.person.position!.name),
      ["Sekretaris Desa", "Kasi Pemerintahan", "Kasi Kesejahteraan", "Kasi Pelayanan", "Kepala Dusun I", "Kepala Dusun II"],
    );
    const sekdes = tree.roots[0].children[0];
    assert.deepEqual(
      sekdes.children.map((c) => c.person.position!.name),
      ["Kaur Tata Usaha dan Umum", "Kaur Keuangan", "Kaur Perencanaan"],
    );
    assert.equal(tree.orphans.length, 0);
    assert.deepEqual(tree.anomalies, []);
    assert.equal(tree.count, 10);
  });

  it("memutus siklus atasan dan melaporkannya, tanpa menghilangkan siapa pun", () => {
    const { people, kades, sekdes } = village();
    const a = people.find((p) => p.name === "Gathot Jumadi")!;
    const b = people.find((p) => p.name === "Muhammad F")!;
    a.supervisorId = b.id;
    b.supervisorId = a.id;
    const tree = buildOrgTree(people);
    const ids = new Set<number>();
    const walk = (n: (typeof tree.roots)[number]) => (ids.add(n.person.id), n.children.forEach(walk));
    [...tree.roots, ...tree.orphans].forEach(walk);
    assert.equal(ids.size, people.length, "semua perangkat tetap tampil");
    assert.ok(tree.anomalies.some((x) => x.id.startsWith("cycle:")));
    assert.ok(kades && sekdes);
  });

  it("menandai perangkat tanpa atasan sebagai orphan, bukan akar kedua", () => {
    const { people } = village();
    const lonely = person("Dewi", "Staf Umum", 5, null);
    const tree = buildOrgTree([...people, lonely]);
    assert.equal(tree.roots.length, 1);
    assert.deepEqual(tree.orphans.map((o) => o.person.id), [lonely.id]);
    assert.ok(tree.anomalies.some((a) => a.id === `orphan:${lonely.id}`));
  });

  it("perangkat nonaktif disembunyikan; bawahannya jadi orphan dengan pesan atasan nonaktif", () => {
    const { people, sekdes } = village();
    people.find((p) => p.id === sekdes.id)!.status = "inactive";
    const hidden = buildOrgTree(people);
    assert.equal(hidden.count, 9);
    assert.equal(hidden.orphans.length, 3);
    assert.match(hidden.anomalies.find((a) => a.id.startsWith("orphan:"))!.message, /tidak aktif/);
    const shown = buildOrgTree(people, { showInactive: true });
    assert.equal(shown.count, 10);
    assert.equal(shown.orphans.length, 0);
  });

  it("kasus tangkapan layar: Kasi terpecah Kades/Sekdes -> peringatan, bukan diam-diam", () => {
    const { people } = village("sekdes");
    // Kasi Pemerintahan tetap ke Kades, dua Kasi lain ke Sekdes
    const tree = buildOrgTree(people);
    assert.ok(tree.anomalies.some((a) => a.id === "kasi-split" && a.severity === "warn"));
    assert.equal(tree.anomalies.filter((a) => a.id.startsWith("kasi:")).length, 2);
    // Pengaturan "melalui Sekdes": hanya Kasi Pemerintahan yang menyimpang
    const via = buildOrgTree(people, { settings: { ...DEFAULT_ORG_SETTINGS, reporting: "via_sekdes" } });
    assert.equal(via.anomalies.filter((a) => a.id.startsWith("kasi:")).length, 1);
  });

  it("Kaur ke Kades dan Kadus ke Kasi ditandai menyimpang", () => {
    const { people, kades } = village();
    people.find((p) => p.name === "Shodiq")!.supervisorId = kades.id;
    const kasi = people.find((p) => p.name === "Gathot Jumadi")!;
    people.find((p) => p.name === "Budi")!.supervisorId = kasi.id;
    const ids = buildOrgTree(people).anomalies.map((a) => a.id.split(":")[0]);
    assert.ok(ids.includes("kaur"));
    assert.ok(ids.includes("kadus"));
  });
});

describe("garis koordinasi", () => {
  it("tanpa pengaturan dan tanpa data: tidak ada garis", () => {
    assert.equal(buildOrgTree(village().people).links.length, 0);
  });
  it("pengaturan aktif: Sekdes mengoordinasikan Kasi & Kadus yang bukan bawahannya", () => {
    const { people, sekdes } = village();
    const tree = buildOrgTree(people, { settings: { reporting: "direct", coordination: true } });
    assert.equal(tree.links.length, 5);
    assert.ok(tree.links.every((l) => l.from === sekdes.id && l.derived));
  });
  it("koordinator eksplisit menang atas turunan, dan sama dengan atasan diabaikan", () => {
    const { people, kades, sekdes } = village();
    const budi = people.find((p) => p.name === "Budi")!;
    budi.coordinatorId = kades.id; // sama dengan atasan -> tidak digambar
    const gathot = people.find((p) => p.name === "Gathot Jumadi")!;
    gathot.coordinatorId = sekdes.id;
    const tree = buildOrgTree(people, { settings: { reporting: "direct", coordination: true } });
    assert.ok(tree.links.some((l) => l.to === gathot.id && !l.derived));
    assert.equal(tree.links.filter((l) => l.to === gathot.id).length, 1);
    assert.ok(tree.links.some((l) => l.to === budi.id && l.derived), "Budi memakai turunan karena eksplisitnya sama dengan atasan");
  });
  it("koordinator nonaktif/tidak ada tidak digambar", () => {
    const { people } = village();
    people[6].coordinatorId = 9999;
    assert.equal(buildOrgTree(people).links.length, 0);
  });
});

describe("pengelompokan anak (pita)", () => {
  it("Kaur/Kasi/Kadus daun dikumpulkan per peran; Sekdes tetap cabang sendiri", () => {
    const { people } = village();
    const tree = buildOrgTree(people);
    const groups = groupChildren(tree.roots[0].children);
    assert.deepEqual(
      groups.map((g) => (g.kind === "node" ? `node:${g.node.role}` : `band:${g.role}:${g.nodes.length}`)),
      ["node:sekdes", "band:kasi:3", "band:kadus:2"],
    );
    const sekdesGroups = groupChildren(tree.roots[0].children[0].children);
    assert.deepEqual(sekdesGroups.map((g) => (g.kind === "band" ? `${g.role}:${g.nodes.length}` : "node")), ["kaur:3"]);
  });
  it("satu staf daun tetap kartu biasa, dua staf menjadi pita", () => {
    const { people, sekdes } = village();
    const one = buildOrgTree([...people, person("S1", "Staf Umum", 5, sekdes.id)]);
    assert.ok(groupChildren(one.roots[0].children[0].children).some((g) => g.kind === "node"));
    const two = buildOrgTree([...people, person("S1", "Staf Umum", 5, sekdes.id), person("S2", "Staf Umum", 5, sekdes.id)]);
    assert.ok(groupChildren(two.roots[0].children[0].children).some((g) => g.kind === "band" && g.role === "staf"));
  });
});

describe("kandidat atasan & koordinator", () => {
  it("Kadus hanya ke Kades, Kaur hanya ke Sekdes", () => {
    const { people } = village();
    const names = (list: OrgPerson[]) => list.map((o) => o.name);
    assert.deepEqual(names(supervisorCandidates({ position: { name: "Kepala Dusun III", level: 4 }, officials: people })), ["Sugiyo"]);
    assert.deepEqual(names(supervisorCandidates({ position: { name: "Kaur Keuangan", level: 3 }, officials: people })), ["Hermansyah"]);
  });
  it("Kasi mengikuti pengaturan desa dan jatuh ke aturan level bila Sekdes belum ada", () => {
    const { people } = village();
    const pos = { name: "Kasi Baru", level: 3 };
    assert.deepEqual(supervisorCandidates({ position: pos, officials: people }).map((o) => o.name), ["Sugiyo"]);
    assert.deepEqual(
      supervisorCandidates({ position: pos, officials: people, settings: { ...DEFAULT_ORG_SETTINGS, reporting: "via_sekdes" } }).map((o) => o.name),
      ["Hermansyah"],
    );
    const noSekdes = people.filter((p) => p.position!.name !== "Sekretaris Desa");
    assert.deepEqual(
      supervisorCandidates({ position: pos, officials: noSekdes, settings: { ...DEFAULT_ORG_SETTINGS, reporting: "via_sekdes" } }).map((o) => o.name),
      ["Sugiyo"],
    );
  });
  it("tidak menyertakan diri sendiri/nonaktif, tapi mempertahankan atasan yang terpasang", () => {
    const { people, kades, sekdes } = village();
    people.find((p) => p.id === sekdes.id)!.status = "inactive";
    const withCurrent = supervisorCandidates({ position: { name: "Kaur Keuangan", level: 3 }, officials: people, currentSupervisorId: sekdes.id });
    assert.deepEqual(withCurrent.map((o) => o.id), [sekdes.id]);
    const self = supervisorCandidates({ position: { name: "Kepala Dusun", level: 4 }, officials: people, selfId: kades.id });
    assert.equal(self.some((o) => o.id === kades.id), false);
    assert.deepEqual(supervisorCandidates({ position: { name: "Kepala Desa", level: 1 }, officials: people }), []);
  });
  it("koordinator: hanya yang levelnya lebih tinggi, bukan diri sendiri", () => {
    const { people } = village();
    const gathot = people.find((p) => p.name === "Gathot Jumadi")!;
    const list = coordinatorCandidates({ position: gathot.position, officials: people, selfId: gathot.id });
    assert.deepEqual(list.map((o) => o.name), ["Sugiyo", "Hermansyah"]);
  });
});

describe("siklus atasan (penjaga server)", () => {
  const map = new Map<number, number | null>([[1, null], [2, 1], [3, 2], [4, 3]]);
  it("menolak atasan yang adalah bawahannya sendiri (langsung maupun tidak langsung)", () => {
    assert.equal(createsSupervisorCycle(map, 1, 4), true);
    assert.equal(createsSupervisorCycle(map, 2, 3), true);
    assert.equal(createsSupervisorCycle(map, 3, 3), true);
  });
  it("mengizinkan atasan yang sah dan mengosongkan atasan", () => {
    assert.equal(createsSupervisorCycle(map, 4, 1), false);
    assert.equal(createsSupervisorCycle(map, 3, 1), false);
    assert.equal(createsSupervisorCycle(map, 3, null), false);
  });
  it("tidak berputar selamanya pada data yang sudah rusak", () => {
    const bad = new Map<number, number | null>([[1, 2], [2, 1], [5, null]]);
    assert.equal(createsSupervisorCycle(bad, 5, 1), false);
  });
});

describe("pengaturan desa", () => {
  it("bawaan, penggabungan tanpa merusak kunci lain, dan validasi", () => {
    assert.deepEqual(readOrgSettings(null), DEFAULT_ORG_SETTINGS);
    assert.deepEqual(readOrgSettings({ orgChart: { reporting: "via_sekdes", coordination: true } }), { reporting: "via_sekdes", coordination: true });
    assert.deepEqual(readOrgSettings({ orgChart: { reporting: "x", coordination: "ya" } }), DEFAULT_ORG_SETTINGS);
    const merged = mergeOrgSettings({ letterhead: { a: 1 }, orgChart: { coordination: true } }, { reporting: "via_sekdes" });
    assert.deepEqual(merged, { letterhead: { a: 1 }, orgChart: { reporting: "via_sekdes", coordination: true } });
    assert.equal(parseOrgSettingsPatch({ reporting: "salah" }).ok, false);
    assert.equal(parseOrgSettingsPatch({ coordination: "true" }).ok, false);
    assert.equal(parseOrgSettingsPatch({}).ok, false);
    assert.deepEqual(parseOrgSettingsPatch({ coordination: true, ignored: 1 }), { ok: true, patch: { coordination: true } });
  });
});

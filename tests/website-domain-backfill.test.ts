import { test } from "node:test";
import assert from "node:assert/strict";
import { planWebsiteDomainBackfill } from "@/lib/domain/backfill";

const base = {
  rootDomain: "klandesa.id",
  existingDomains: new Map<string, number>(),
  villageCodes: new Map<string, number>([["karanganyar", 1], ["sukamaju", 2]]),
};

test("subdomain pilihan checkout lama dibuatkan baris domain", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    rows: [{ villageId: 1, code: "KARANGANYAR", website: "desaku.klandesa.id", customDomain: null }],
  });
  assert.deepEqual(plan.actions, [
    { kind: "subdomain", villageId: 1, code: "KARANGANYAR", hostname: "desaku.klandesa.id" },
  ]);
  assert.equal(plan.conflicts.length, 0);
});

test("alamat yang sama dengan kode desa sendiri sudah ter-route, dilewati", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    rows: [{ villageId: 1, code: "KARANGANYAR", website: "karanganyar.klandesa.id", customDomain: null }],
  });
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.alreadyOk, 1);
});

test("baris domain yang sudah ada dilewati (aman dijalankan ulang)", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    existingDomains: new Map([["desaku.klandesa.id", 1]]),
    rows: [{ villageId: 1, code: "KARANGANYAR", website: "desaku.klandesa.id", customDomain: null }],
  });
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.alreadyOk, 1);
});

test("hostname milik desa lain menjadi konflik", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    existingDomains: new Map([["desaku.klandesa.id", 2]]),
    rows: [{ villageId: 1, code: "KARANGANYAR", website: "desaku.klandesa.id", customDomain: null }],
  });
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.conflicts[0].reason, "hostname dipakai desa lain");
});

test("label yang sama dengan kode desa lain menjadi konflik", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    rows: [{ villageId: 1, code: "KARANGANYAR", website: "sukamaju.klandesa.id", customDomain: null }],
  });
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.conflicts[0].reason, "sama dengan kode desa lain");
});

test("dua desa berebut subdomain yang sama dalam satu backfill: hanya yang pertama menang", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    rows: [
      { villageId: 1, code: "KARANGANYAR", website: "desaku.klandesa.id", customDomain: null },
      { villageId: 2, code: "SUKAMAJU", website: "desaku.klandesa.id", customDomain: null },
    ],
  });
  assert.equal(plan.actions.length, 1);
  assert.equal(plan.actions[0].villageId, 1);
  assert.equal(plan.conflicts.length, 1);
});

test("custom domain lama dibuatkan baris pending, domain tak valid jadi konflik", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    rows: [
      { villageId: 1, code: "KARANGANYAR", website: null, customDomain: "Desaku.id" },
      { villageId: 2, code: "SUKAMAJU", website: null, customDomain: "bukan domain" },
    ],
  });
  assert.deepEqual(plan.actions, [
    { kind: "custom", villageId: 1, code: "KARANGANYAR", hostname: "desaku.id" },
  ]);
  assert.equal(plan.conflicts.length, 1);
});

test("website kosong atau domain luar klandesa tidak diubah", () => {
  const plan = planWebsiteDomainBackfill({
    ...base,
    rows: [
      { villageId: 1, code: "KARANGANYAR", website: null, customDomain: null },
      { villageId: 2, code: "SUKAMAJU", website: "https://desa-lama.go.id", customDomain: null },
    ],
  });
  assert.equal(plan.actions.length, 0);
  assert.equal(plan.alreadyOk, 2);
});

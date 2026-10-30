import { validateHostnameFqdn, validateSubdomainLabel } from "@/lib/domain/validators";

export type BackfillVillageRow = {
  villageId: number;
  code: string;
  /** `Village.website`; diisi checkout lama sebagai `label.klandesa.id` */
  website: string | null;
  /** `WebsiteSubscription.customDomain` yang dulu ditulis checkout tanpa verifikasi */
  customDomain: string | null;
};

export type BackfillAction = {
  kind: "subdomain" | "custom";
  villageId: number;
  code: string;
  hostname: string;
};

export type BackfillConflict = {
  villageId: number;
  code: string;
  hostname: string;
  reason: string;
};

export type BackfillPlan = {
  actions: BackfillAction[];
  conflicts: BackfillConflict[];
  /** Desa yang sudah punya baris domain atau sudah ter-route lewat kode desa */
  alreadyOk: number;
};

/**
 * Rencana pembuatan baris `WebsiteDomain` untuk desa yang membeli website lewat checkout lama
 * (alamat hanya tersimpan di `village.website` / `subscription.customDomain`, sehingga tidak ter-route).
 * Murni (tanpa I/O) agar mudah diuji; skrip pemanggil yang menulis ke database.
 */
export function planWebsiteDomainBackfill(params: {
  rows: BackfillVillageRow[];
  rootDomain: string;
  /** hostname -> villageId untuk semua baris `WebsiteDomain` yang sudah ada */
  existingDomains: Map<string, number>;
  /** kode desa (huruf kecil) -> villageId */
  villageCodes: Map<string, number>;
}): BackfillPlan {
  const root = params.rootDomain.trim().toLowerCase();
  const plan: BackfillPlan = { actions: [], conflicts: [], alreadyOk: 0 };
  const claimed = new Map<string, number>(params.existingDomains);

  for (const row of params.rows) {
    const code = row.code;
    const website = (row.website ?? "").trim().toLowerCase();
    let handled = false;

    const suffix = `.${root}`;
    if (website.endsWith(suffix)) {
      const label = website.slice(0, -suffix.length);
      const v = validateSubdomainLabel(label);
      if (v.ok) {
        handled = true;
        const owner = claimed.get(website);
        const codeOwner = params.villageCodes.get(v.value);
        if (owner === row.villageId || codeOwner === row.villageId) {
          plan.alreadyOk += 1;
        } else if (owner !== undefined) {
          plan.conflicts.push({ villageId: row.villageId, code, hostname: website, reason: "hostname dipakai desa lain" });
        } else if (codeOwner !== undefined) {
          plan.conflicts.push({ villageId: row.villageId, code, hostname: website, reason: "sama dengan kode desa lain" });
        } else {
          plan.actions.push({ kind: "subdomain", villageId: row.villageId, code, hostname: website });
          claimed.set(website, row.villageId);
        }
      }
    }

    const custom = (row.customDomain ?? "").trim();
    if (custom) {
      const v = validateHostnameFqdn(custom);
      if (!v.ok) {
        plan.conflicts.push({ villageId: row.villageId, code, hostname: custom, reason: v.error });
        continue;
      }
      handled = true;
      const owner = claimed.get(v.value);
      if (owner === row.villageId) plan.alreadyOk += 1;
      else if (owner !== undefined) {
        plan.conflicts.push({ villageId: row.villageId, code, hostname: v.value, reason: "hostname dipakai desa lain" });
      } else {
        plan.actions.push({ kind: "custom", villageId: row.villageId, code, hostname: v.value });
        claimed.set(v.value, row.villageId);
      }
    }

    if (!handled) plan.alreadyOk += 1;
  }
  return plan;
}

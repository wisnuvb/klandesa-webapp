/**
 * Master wilayah desa yang diturunkan dari kolom teks bebas `residents.hamlet/rw/rt`. Murni.
 *
 * Dusun dan RW SALING SILANG (data nyata: RW 01–04 membentang di beberapa dusun; Permendesa 13/2025 Ps 59 juga
 * menyebut batas dusun, RW, dan RT sebagai lapisan terpisah). Jadi ada dua pohon yang tidak saling bertingkat:
 *   - dusun (datar)
 *   - RW → RT  (RT di bawah RW; RT tanpa RW berdiri sendiri)
 * "01", "1", dan "001" dianggap unit yang sama.
 */

export type WilayahType = "dusun" | "rw" | "rt";

export interface WilayahResidentLite {
  id: number;
  hamlet: string | null;
  rw: string | null;
  rt: string | null;
}

export interface WilayahUnitPlan {
  /** Kunci stabil di dalam rencana, mis. "dusun:MAWAR" atau "rt:MAWAR|3|2". */
  key: string;
  type: WilayahType;
  parentKey: string | null;
  /** Label tampilan: bentuk tulisan paling sering dipakai di data. */
  label: string;
  /** Bentuk tulisan lain yang digabung ke unit ini (mis. "01" dan "1"). */
  variants: string[];
  residentCount: number;
}

export interface WilayahPlacement {
  /** Kunci unit dusun, bila warga punya dusun. */
  dusunKey: string | null;
  /** Kunci unit terdalam pada pohon RW → RT (RT, atau RW bila RT kosong). */
  areaKey: string | null;
}

export interface WilayahBackfillPlan {
  units: WilayahUnitPlan[];
  /** residentId → penempatan; warga tanpa dusun, RW, maupun RT tidak ada di sini. */
  placement: Map<number, WilayahPlacement>;
  unassignedIds: number[];
}

const clean = (v: string | null | undefined) => (v ?? "").trim().replace(/\s+/g, " ");

/** Bentuk kanonik untuk membandingkan: angka dibuang nol di depan; teks huruf besar. */
export function canonicalWilayahToken(raw: string | null | undefined): string | null {
  const t = clean(raw);
  if (!t) return null;
  return /^\d+$/.test(t) ? String(Number(t)) : t.toUpperCase();
}

export function planWilayahBackfill(residents: readonly WilayahResidentLite[]): WilayahBackfillPlan {
  type Acc = { type: WilayahType; parentKey: string | null; forms: Map<string, number>; count: number };
  const acc = new Map<string, Acc>();
  const placement = new Map<number, WilayahPlacement>();
  const unassignedIds: number[] = [];

  const touch = (key: string, type: WilayahType, parentKey: string | null, raw: string, countResident: boolean) => {
    let a = acc.get(key);
    if (!a) {
      a = { type, parentKey, forms: new Map(), count: 0 };
      acc.set(key, a);
    }
    a.forms.set(raw, (a.forms.get(raw) ?? 0) + 1);
    if (countResident) a.count += 1;
  };

  for (const r of [...residents].sort((x, y) => x.id - y.id)) {
    const hamlet = canonicalWilayahToken(r.hamlet);
    const rw = canonicalWilayahToken(r.rw);
    const rt = canonicalWilayahToken(r.rt);
    if (!hamlet && !rw && !rt) {
      unassignedIds.push(r.id);
      continue;
    }

    let dusunKey: string | null = null;
    if (hamlet) {
      dusunKey = `dusun:${hamlet}`;
      touch(dusunKey, "dusun", null, clean(r.hamlet), true);
    }

    let areaKey: string | null = null;
    let rwKey: string | null = null;
    if (rw) {
      rwKey = `rw:${rw}`;
      touch(rwKey, "rw", null, clean(r.rw), !rt);
      areaKey = rwKey;
    }
    if (rt) {
      const key = `rt:${rw ?? ""}|${rt}`;
      touch(key, "rt", rwKey, clean(r.rt), true);
      areaKey = key;
    }
    placement.set(r.id, { dusunKey, areaKey });
  }

  const units: WilayahUnitPlan[] = [...acc.entries()]
    .map(([key, a]) => {
      const ordered = [...a.forms.entries()].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1));
      return {
        key,
        type: a.type,
        parentKey: a.parentKey,
        label: ordered[0][0],
        variants: ordered.slice(1).map(([f]) => f),
        residentCount: a.count,
      };
    })
    .sort((x, y) => (x.key < y.key ? -1 : 1));

  return { units, placement, unassignedIds };
}

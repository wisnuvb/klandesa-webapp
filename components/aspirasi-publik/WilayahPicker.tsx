"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { apiJson } from "@/components/admin/security/api";

type Item = { code: string; name: string };
type Level = "provinces" | "regencies" | "districts" | "villages";

export type WilayahHint = { province?: string | null; regency?: string | null; district?: string | null; name?: string | null };

/** Samakan nama untuk pencocokan kasar: huruf kecil, tanpa kata penanda wilayah dan tanda baca. */
export function normWilayah(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(kabupaten|kab|kota|kecamatan|kec|desa|kelurahan|provinsi|prov)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cocokkan petunjuk nama ke daftar: sama persis lebih dulu, lalu saling memuat. null bila tak ada atau ambigu. */
export function matchWilayah(items: Item[], hint: string | null | undefined): Item | null {
  const h = normWilayah(hint ?? "");
  if (!h) return null;
  const exact = items.filter((i) => normWilayah(i.name) === h);
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1) return null;
  const partial = items.filter((i) => {
    const n = normWilayah(i.name);
    return n.length > 0 && (n.includes(h) || h.includes(n));
  });
  return partial.length === 1 ? partial[0]! : null;
}

async function load(level: Level, parent: string): Promise<Item[]> {
  const r = await apiJson<{ items: Item[] }>(`/api/aspirasi/wilayah?level=${level}&parent=${encodeURIComponent(parent)}`);
  return r.items;
}

type Props = {
  /** Terpilih penuh = kode desa (mis. 64.02.05.2003); belum lengkap = "". */
  onChange: (villageCode: string) => void;
  /** Data desa terdaftar untuk pemilihan awal; hanya membantu, pengguna bebas mengganti. */
  hint?: WilayahHint;
  disabled?: boolean;
};

/** Pemilih wilayah bertingkat provinsi → kab/kota → kecamatan → desa dari wilayah.id (via /api/aspirasi/wilayah). */
export function WilayahPicker({ onChange, hint, disabled }: Props) {
  const ids = { p: useId(), r: useId(), d: useId(), v: useId() };
  const [lists, setLists] = useState<Record<Level, Item[]>>({ provinces: [], regencies: [], districts: [], villages: [] });
  const [codes, setCodes] = useState({ p: "", r: "", d: "", v: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<Level | null>("provinces");
  const auto = useRef(true);
  const hintRef = useRef(hint);

  const fetchLevel = async (level: Level, parent: string, hintName: string | null | undefined, set: (code: string) => void) => {
    setLoading(level);
    setError(null);
    try {
      const items = await load(level, parent);
      setLists((l) => ({ ...l, [level]: items }));
      if (items.length === 0) setError("Daftar wilayah belum bisa dimuat. Muat ulang halaman atau coba lagi nanti.");
      if (auto.current) {
        const m = matchWilayah(items, hintName);
        if (m) set(m.code);
        else auto.current = false;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar wilayah.");
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    void fetchLevel("provinces", "", hintRef.current?.province, (c) => setCodes((s) => ({ ...s, p: c })));
  }, []);
  useEffect(() => {
    if (!codes.p) return;
    void fetchLevel("regencies", codes.p, hintRef.current?.regency, (c) => setCodes((s) => ({ ...s, r: c })));
  }, [codes.p]);
  useEffect(() => {
    if (!codes.r) return;
    void fetchLevel("districts", codes.r, hintRef.current?.district, (c) => setCodes((s) => ({ ...s, d: c })));
  }, [codes.r]);
  useEffect(() => {
    if (!codes.d) return;
    void fetchLevel("villages", codes.d, hintRef.current?.name, (c) => setCodes((s) => ({ ...s, v: c })));
  }, [codes.d]);
  useEffect(() => {
    onChange(codes.v);
  }, [codes.v, onChange]);

  const user = (level: "p" | "r" | "d" | "v", value: string) => {
    auto.current = false;
    setCodes((s) => {
      if (level === "p") return { p: value, r: "", d: "", v: "" };
      if (level === "r") return { ...s, r: value, d: "", v: "" };
      if (level === "d") return { ...s, d: value, v: "" };
      return { ...s, v: value };
    });
    if (level === "p") setLists((l) => ({ ...l, regencies: [], districts: [], villages: [] }));
    if (level === "r") setLists((l) => ({ ...l, districts: [], villages: [] }));
    if (level === "d") setLists((l) => ({ ...l, villages: [] }));
  };

  const field = (key: "p" | "r" | "d" | "v", label: string, level: Level, parentOk: boolean, empty: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={ids[key]}>{label}</Label>
      <SearchSelect id={ids[key]} value={codes[key]} onChange={(e) => user(key, e.target.value)} disabled={disabled || !parentOk || loading === level} className="w-full">
        <option value="">{loading === level ? "Memuat…" : empty}</option>
        {lists[level].map((i) => (
          <option key={i.code} value={i.code}>
            {i.name}
          </option>
        ))}
      </SearchSelect>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {field("p", "Provinsi", "provinces", true, "Pilih provinsi")}
        {field("r", "Kabupaten/kota", "regencies", !!codes.p, "Pilih kabupaten/kota")}
        {field("d", "Kecamatan", "districts", !!codes.r, "Pilih kecamatan")}
        {field("v", "Desa/kelurahan", "villages", !!codes.d, "Pilih desa/kelurahan")}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

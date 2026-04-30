"use client";

import React from "react";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Copy,
  RefreshCw,
  Share2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useLandingModals } from "@/app/(landing)/layout";
import { Combobox } from "@/components/ui/combobox";

type Provinsi = { kode_provinsi: string; nama_provinsi: string };
type KabKota = { kode_kab_kota: string; nama_kab_kota: string };

type HargaRow = {
  variant_id: number;
  variant_nama: string;
  satuan_display: string;
  tanggal: string;
  harga: number;
  tanggal_pembanding: string;
  harga_pembanding: number;
  delta_harga: number;
  persen_perubahan: number;
  status_perubahan: string;
};

type HetRow = {
  variant_id: number;
  variant_nama: string;
  harga: number;
  group_wilayah: string;
  referensi_harga: string;
  tanggal: string;
  harga_pembanding: number;
  delta_harga: number;
  persen_perubahan: number;
  status_perubahan: string;
  satuan_display: string;
  order: number;
};

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(date: string, deltaDays: number): string {
  const [y, m, d] = date.split("-").map((v) => Number(v));
  const base = new Date(y, m - 1, d);
  base.setDate(base.getDate() + deltaDays);
  return isoDate(base);
}

function formatRp(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-";
  if (n === 0) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPercent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "-";
  return `${n.toFixed(2)}%`;
}

function extractArray<T = unknown>(payload: unknown): T[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as { data?: unknown };
  const d = p.data as { data?: unknown } | undefined;
  const arr = (d?.data ?? p.data) as unknown;
  return Array.isArray(arr) ? (arr as T[]) : [];
}

function statusBadge(status: string): {
  label: string;
  className: string;
  Icon: typeof TrendingUp | typeof TrendingDown | typeof ChevronDown;
} {
  const s = (status ?? "").toLowerCase();
  if (s.includes("naik")) {
    return {
      label: "Naik",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: TrendingUp,
    };
  }
  if (s.includes("turun")) {
    return {
      label: "Turun",
      className: "bg-rose-50 text-rose-700 border-rose-200",
      Icon: TrendingDown,
    };
  }
  return {
    label: "Tetap",
    className: "bg-gray-50 text-gray-700 border-gray-200",
    Icon: ChevronDown,
  };
}

type CommodityGroup =
  | "Semua"
  | "Beras"
  | "Minyak"
  | "Gula"
  | "Protein"
  | "Cabai"
  | "Bawang"
  | "Lainnya";

function groupForCommodity(name: string): CommodityGroup {
  const n = (name ?? "").toLowerCase();
  if (n.includes("beras")) return "Beras";
  if (n.includes("minyak")) return "Minyak";
  if (n.includes("gula")) return "Gula";
  if (n.includes("daging") || n.includes("ayam") || n.includes("telur"))
    return "Protein";
  if (n.includes("cabai")) return "Cabai";
  if (n.includes("bawang")) return "Bawang";
  return "Lainnya";
}

function loadLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

export default function HargaPanganPage() {
  const { setShowRegistration, setShowContact } = useLandingModals();

  const [provinsi, setProvinsi] = React.useState<Provinsi[]>([]);
  const [kabkota, setKabkota] = React.useState<KabKota[]>([]);
  const [prov, setProv] = React.useState<string>("");
  const [kab, setKab] = React.useState<string>("");
  const pendingKabRef = React.useRef<string | null>(null);
  const autoFetchRef = React.useRef<{
    tanggal: string;
    tanggal_pembanding: string;
    kode_provinsi: string;
    kode_kab_kota: string;
  } | null>(null);

  const defaultTanggal = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return isoDate(d);
  }, []);
  const [tanggal, setTanggal] = React.useState<string>(defaultTanggal);
  const [tanggalPembanding, setTanggalPembanding] = React.useState<string>(
    addDays(defaultTanggal, -7),
  );

  const [group, setGroup] = React.useState<CommodityGroup>("Semua");

  const [loadingProv, setLoadingProv] = React.useState(false);
  const [loadingKab, setLoadingKab] = React.useState(false);
  const [loadingData, setLoadingData] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [hargaRows, setHargaRows] = React.useState<HargaRow[]>([]);
  const [hetRows, setHetRows] = React.useState<HetRow[]>([]);

  const selectedProvName =
    provinsi.find((p) => p.kode_provinsi === prov)?.nama_provinsi ?? "";
  const selectedKabName =
    kabkota.find((k) => k.kode_kab_kota === kab)?.nama_kab_kota ?? "";

  const filteredHarga = React.useMemo(() => {
    const rows =
      group === "Semua"
        ? hargaRows
        : hargaRows.filter((r) => groupForCommodity(r.variant_nama) === group);
    return [...rows].sort((a, b) => {
      const da = Number(a.delta_harga ?? 0);
      const db = Number(b.delta_harga ?? 0);
      return Math.abs(db) - Math.abs(da);
    });
  }, [hargaRows, group]);

  async function fetchProvinsi() {
    setLoadingProv(true);
    try {
      const res = await fetch("/api/pangan/provinsi", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as {
        rows?: Provinsi[];
      } | null;
      const rows = Array.isArray(json?.rows) ? json!.rows! : [];
      setProvinsi(rows);
    } finally {
      setLoadingProv(false);
    }
  }

  async function fetchKabKota(kodeProv: string) {
    setLoadingKab(true);
    setKabkota([]);
    try {
      const res = await fetch(
        `/api/pangan/kab-kota/${encodeURIComponent(kodeProv)}`,
        {
          cache: "no-store",
        },
      );
      const json = (await res.json().catch(() => null)) as {
        data?: unknown;
      } | null;
      const rows = extractArray<KabKota>(json?.data);
      setKabkota(rows);
      const pendingKab = pendingKabRef.current;
      if (pendingKab && rows.some((k) => k.kode_kab_kota === pendingKab)) {
        setKab(pendingKab);
        pendingKabRef.current = null;
      }
      const auto = autoFetchRef.current;
      if (auto && auto.kode_provinsi === kodeProv) {
        if (rows.some((k) => k.kode_kab_kota === auto.kode_kab_kota)) {
          setKab(auto.kode_kab_kota);
          autoFetchRef.current = null;
          void fetchHargaAndHet(auto);
        }
      }
      return rows;
    } finally {
      setLoadingKab(false);
    }
  }

  async function fetchHargaAndHet(input: {
    tanggal: string;
    tanggal_pembanding: string;
    kode_provinsi: string;
    kode_kab_kota: string;
  }) {
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const [hargaRes, hetRes] = await Promise.all([
        fetch("/api/pangan/harga", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }),
        fetch("/api/pangan/het", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tanggal: input.tanggal }),
        }),
      ]);

      const hargaJson = (await hargaRes.json().catch(() => null)) as
        | { data?: unknown }
        | { error?: string }
        | null;
      const hetJson = (await hetRes.json().catch(() => null)) as
        | { data?: unknown }
        | { error?: string }
        | null;

      if (!hargaRes.ok) {
        const msg =
          typeof (hargaJson as { error?: string } | null)?.error === "string"
            ? (hargaJson as { error: string }).error
            : "Gagal mengambil harga. Coba lagi.";
        setErrorMsg(msg);
        setHargaRows([]);
        setHetRows([]);
        return;
      }

      const harga = extractArray<HargaRow>(
        (hargaJson as { data?: unknown } | null)?.data,
      );
      setHargaRows(harga);

      const hetAll = extractArray<HetRow>(
        (hetJson as { data?: unknown } | null)?.data,
      );
      const hetNasional = hetAll.filter(
        (r) => String(r.group_wilayah ?? "").toLowerCase() === "nasional",
      );
      setHetRows(hetNasional.length > 0 ? hetNasional : hetAll);

      const url = new URL(window.location.href);
      url.searchParams.set("prov", input.kode_provinsi);
      url.searchParams.set("kab", input.kode_kab_kota);
      url.searchParams.set("tanggal", input.tanggal);
      url.searchParams.set("banding", input.tanggal_pembanding);
      window.history.replaceState(null, "", url.toString());
    } catch {
      setErrorMsg("Terjadi gangguan jaringan. Coba lagi.");
      setHargaRows([]);
      setHetRows([]);
    } finally {
      setLoadingData(false);
    }
  }

  async function onSubmit() {
    if (!prov || !kab) {
      setErrorMsg("Pilih provinsi dan kab/kota dulu.");
      return;
    }
    if (!tanggal || !tanggalPembanding) {
      setErrorMsg("Tanggal wajib diisi.");
      return;
    }
    saveLS("pangan_prov", prov);
    saveLS("pangan_kab", kab);
    saveLS("pangan_tanggal", tanggal);
    saveLS("pangan_banding", tanggalPembanding);
    await fetchHargaAndHet({
      tanggal,
      tanggal_pembanding: tanggalPembanding,
      kode_provinsi: prov,
      kode_kab_kota: kab,
    });
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Pantau Harga Pangan",
          text: "Cek harga bahan pokok dan bandingkan per kab/kota.",
          url,
        });
        return;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(url);
      setErrorMsg("Tautan disalin.");
      setTimeout(() => setErrorMsg(null), 1500);
    } catch {
      setErrorMsg("Gagal menyalin tautan.");
      setTimeout(() => setErrorMsg(null), 1500);
    }
  }

  React.useEffect(() => {
    void fetchProvinsi();
  }, []);

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const qpProv = url.searchParams.get("prov")?.trim() || null;
    const qpKab = url.searchParams.get("kab")?.trim() || null;
    const qpTanggal = url.searchParams.get("tanggal")?.trim() || null;
    const qpBanding = url.searchParams.get("banding")?.trim() || null;

    const savedProv = loadLS("pangan_prov");
    const savedKab = loadLS("pangan_kab");
    const savedTanggal = loadLS("pangan_tanggal");
    const savedBanding = loadLS("pangan_banding");

    const initTanggal =
      (qpTanggal && /^\d{4}-\d{2}-\d{2}$/.test(qpTanggal) ? qpTanggal : null) ||
      (savedTanggal && /^\d{4}-\d{2}-\d{2}$/.test(savedTanggal)
        ? savedTanggal
        : null);
    const initBanding =
      (qpBanding && /^\d{4}-\d{2}-\d{2}$/.test(qpBanding) ? qpBanding : null) ||
      (savedBanding && /^\d{4}-\d{2}-\d{2}$/.test(savedBanding)
        ? savedBanding
        : null);

    if (initTanggal) setTanggal(initTanggal);
    if (initBanding) setTanggalPembanding(initBanding);

    const initProv =
      (qpProv && /^\d{2}$/.test(qpProv) ? qpProv : null) ||
      (savedProv && /^\d{2}$/.test(savedProv) ? savedProv : null);
    const initKab =
      (qpKab && /^\d{2,4}$/.test(qpKab) ? qpKab : null) ||
      (savedKab && /^\d{2,4}$/.test(savedKab) ? savedKab : null);

    if (initProv) {
      setProv(initProv);
      pendingKabRef.current = initKab;
      if (initKab && initTanggal && initBanding) {
        autoFetchRef.current = {
          tanggal: initTanggal,
          tanggal_pembanding: initBanding,
          kode_provinsi: initProv,
          kode_kab_kota: initKab,
        };
      }
    }
  }, []);

  React.useEffect(() => {
    if (!prov) return;
    setKab("");
    void fetchKabKota(prov);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prov]);

  return (
    <>
      <section className="relative pt-28 md:pt-32 pb-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-16 left-8 w-80 h-80 bg-[#0d9488] rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-24 right-10 w-80 h-80 bg-[#6366f1] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-10 left-1/2 w-80 h-80 bg-[#fbbf24] rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-2 bg-[#0d9488]/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-[#0d9488]/20">
              <Building2 className="w-4 h-4 text-[#0d9488]" />
              <span className="text-sm text-[#0d9488]">
                Sumber data: SP2KP Kemendag
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl text-gray-900 mb-4 leading-tight">
              Pantau Harga Pangan{" "}
              <span className="text-[#0d9488]">per Kab/Kota</span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
              Cek harga rata-rata bahan pokok, bandingkan dengan periode
              sebelumnya, dan lihat referensi HET/HA.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowRegistration(true)}
                className="bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all cursor-pointer"
              >
                Daftarkan Desa
                <ArrowRight className="inline-block w-4 h-4 ml-2" />
              </button>
              <button
                onClick={() => setShowContact(true)}
                className="bg-white text-gray-800 px-6 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Hubungi Kami
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-xl p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-2">
                  Provinsi
                </label>
                <Combobox
                  value={prov}
                  onValueChange={(next) => {
                    pendingKabRef.current = null;
                    autoFetchRef.current = null;
                    setKab("");
                    setProv(next);
                  }}
                  options={provinsi.map((p) => ({
                    value: p.kode_provinsi,
                    label: p.nama_provinsi,
                  }))}
                  placeholder={loadingProv ? "Memuat..." : "Pilih provinsi"}
                  searchPlaceholder="Cari provinsi..."
                  emptyText="Provinsi tidak ditemukan."
                  allowClear
                  clearLabel="Kosongkan provinsi"
                  disabled={loadingProv}
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-700">
                    Kab/Kota
                  </label>
                  {prov ? (
                    <span className="text-xs text-gray-500">
                      {loadingKab ? "Memuat..." : `${kabkota.length} opsi`}
                    </span>
                  ) : null}
                </div>
                <Combobox
                  value={kab}
                  onValueChange={(next) => setKab(next)}
                  options={kabkota.map((k) => ({
                    value: k.kode_kab_kota,
                    label: k.nama_kab_kota,
                  }))}
                  placeholder={
                    !prov
                      ? "Pilih provinsi dulu"
                      : loadingKab
                        ? "Memuat..."
                        : "Pilih kab/kota"
                  }
                  searchPlaceholder="Cari kab/kota..."
                  emptyText={
                    loadingKab ? "Memuat..." : "Kab/Kota tidak ditemukan."
                  }
                  allowClear
                  clearLabel="Kosongkan kab/kota"
                  disabled={!prov || loadingKab}
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-2">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm text-gray-700 mb-2">
                  Bandingkan dengan
                </label>
                <input
                  type="date"
                  value={tanggalPembanding}
                  onChange={(e) => setTanggalPembanding(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0d9488] focus:border-transparent transition-all outline-none bg-white"
                />
                <div className="flex gap-2 mt-2">
                  {[
                    { label: "H-1", days: -1 },
                    { label: "H-7", days: -7 },
                    { label: "H-30", days: -30 },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() =>
                        setTanggalPembanding(addDays(tanggal, c.days))
                      }
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="text-sm text-gray-600">
                {prov && kab ? (
                  <span>
                    {selectedProvName} • {selectedKabName} • {tanggal} vs{" "}
                    {tanggalPembanding}
                  </span>
                ) : (
                  <span>Pilih provinsi dan kab/kota untuk melihat data.</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onShare}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  Bagikan
                </button>
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={loadingData || !prov || !kab}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingData ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Memuat
                    </>
                  ) : (
                    <>
                      Tampilkan
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {errorMsg ? (
              <div
                className="mt-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm flex items-center justify-between gap-3"
                role="alert"
              >
                <span>{errorMsg}</span>
                <button
                  type="button"
                  onClick={() => void onSubmit()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-white/60 hover:bg-white transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Coba lagi
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-6">
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  "Semua",
                  "Beras",
                  "Minyak",
                  "Gula",
                  "Protein",
                  "Cabai",
                  "Bawang",
                ] as const
              ).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`px-3.5 py-2 rounded-full text-sm border transition-colors cursor-pointer ${
                    group === g
                      ? "bg-[#0d9488] text-white border-[#0d9488]"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {loadingData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-gray-200 bg-white p-4 animate-pulse"
                  >
                    <div className="h-5 bg-gray-200 rounded w-2/3 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : hargaRows.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-600">
                Belum ada data untuk ditampilkan.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:hidden gap-4">
                  {filteredHarga.map((r) => {
                    const badge = statusBadge(r.status_perubahan);
                    return (
                      <div
                        key={r.variant_id}
                        className="rounded-2xl border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base text-gray-900">
                              {r.variant_nama}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Satuan: {r.satuan_display}
                            </div>
                          </div>
                          <div
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${badge.className}`}
                          >
                            <badge.Icon className="w-3.5 h-3.5" />
                            {badge.label}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              {tanggal}
                            </div>
                            <div className="text-gray-900 font-medium">
                              {formatRp(r.harga)}
                            </div>
                          </div>
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <div className="text-xs text-gray-500 mb-1">
                              {tanggalPembanding}
                            </div>
                            <div className="text-gray-900 font-medium">
                              {formatRp(r.harga_pembanding)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <div className="text-gray-600">
                            Selisih:{" "}
                            <span className="text-gray-900 font-medium">
                              {formatRp(r.delta_harga)}
                            </span>
                          </div>
                          <div className="text-gray-600">
                            {formatPercent(r.persen_perubahan)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden md:block rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="text-left px-5 py-3">Komoditas</th>
                          <th className="text-right px-5 py-3">{tanggal}</th>
                          <th className="text-right px-5 py-3">
                            {tanggalPembanding}
                          </th>
                          <th className="text-right px-5 py-3">Selisih</th>
                          <th className="text-right px-5 py-3">%</th>
                          <th className="text-left px-5 py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHarga.map((r) => {
                          const badge = statusBadge(r.status_perubahan);
                          return (
                            <tr key={r.variant_id} className="border-t">
                              <td className="px-5 py-3">
                                <div className="text-gray-900">
                                  {r.variant_nama}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {r.satuan_display}
                                </div>
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums">
                                {formatRp(r.harga)}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums">
                                {formatRp(r.harga_pembanding)}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums">
                                {formatRp(r.delta_harga)}
                              </td>
                              <td className="px-5 py-3 text-right tabular-nums">
                                {formatPercent(r.persen_perubahan)}
                              </td>
                              <td className="px-5 py-3">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${badge.className}`}
                                >
                                  <badge.Icon className="w-3.5 h-3.5" />
                                  {badge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
            <details>
              <summary className="cursor-pointer select-none flex items-center justify-between gap-3">
                <div>
                  <div className="text-gray-900 text-base">
                    Referensi HET/HA (Nasional)
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Untuk konteks perbandingan, bukan patokan transaksi.
                  </div>
                </div>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </summary>
              <div className="mt-4 overflow-x-auto">
                {hetRows.length === 0 ? (
                  <div className="text-sm text-gray-600">
                    Data HET/HA belum tersedia.
                  </div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="text-left px-4 py-2.5">Komoditas</th>
                        <th className="text-right px-4 py-2.5">Harga</th>
                        <th className="text-left px-4 py-2.5">Ref</th>
                        <th className="text-right px-4 py-2.5">Selisih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hetRows.slice(0, 20).map((r) => (
                        <tr
                          key={`${r.variant_id}-${r.referensi_harga}-${r.order}`}
                          className="border-t"
                        >
                          <td className="px-4 py-2.5 text-gray-900">
                            {r.variant_nama}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatRp(r.harga)}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700">
                            {r.referensi_harga || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatRp(r.delta_harga)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </details>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 md:p-6 text-sm text-gray-700">
            <div className="font-medium text-gray-900 mb-2">Catatan</div>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                Data bersumber dari SP2KP Kemendag. Harga yang tampil adalah
                rata-rata, bisa berbeda di pasar sekitar Anda.
              </li>
              <li>
                Jika ada komoditas bernilai 0 atau kosong, kemungkinan data
                belum tersedia pada tanggal tersebut.
              </li>
              <li>
                HET/HA adalah referensi kebijakan. Gunakan sebagai pembanding
                umum.
              </li>
            </ul>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowRegistration(true)}
                className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-[#0d9488] to-[#0f766e] text-white px-5 py-3 rounded-xl hover:shadow-lg transition-all cursor-pointer"
              >
                Buat Layanan Warga di Desa
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onShare}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                Salin Tautan
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

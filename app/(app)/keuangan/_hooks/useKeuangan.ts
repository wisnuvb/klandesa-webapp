"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import {
  parseModuleNotEntitledBody,
  type AsyncPageError,
} from "@/lib/modules/client-error";
import { buildYearOptions, subKategoriOptions } from "../_lib/constants";
import type {
  ApbdesData,
  BelanjaFormState,
  BelanjaItem,
  FinanceResponse,
  KasSummary,
  KeuanganTab,
  PendapatanFormState,
  PendapatanItem,
  SPPItem,
  SppFormState,
  SppStatusCount,
  TransaksiFormState,
  TransaksiKasItem,
  TrendItem,
} from "../_lib/types";
import { KEUANGAN_TABS } from "../_lib/types";

/** Tanggal hari ini menurut zona waktu pengguna (bukan UTC, agar tidak mundur sehari dini hari WIB). */
function todayIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type ApiErrorBody = { error?: string; message?: string } | null;

/** Pesan untuk pengguna: kode kuota dari API diganti penjelasan, bukan "RESOURCE_LIMIT_REACHED". */
function financeErrorMessage(body: ApiErrorBody, fallback: string) {
  if (body?.error === "RESOURCE_LIMIT_REACHED") {
    return (
      body.message ||
      "Batas transaksi paket Anda sudah tercapai. Tingkatkan paket atau aktifkan add-on Keuangan di menu Langganan."
    );
  }
  return body?.error || fallback;
}

function defaultApbdes(): ApbdesData {
  return {
    tahun: new Date().getFullYear(),
    totalPendapatan: 0,
    totalBelanja: 0,
    realisasiPendapatan: 0,
    realisasiBelanja: 0,
    budgetPendapatan: 0,
    budgetBelanja: 0,
  };
}

function defaultPendapatanForm(): PendapatanFormState {
  return {
    tanggal: todayIso(),
    kategori: "",
    subKategori: "",
    uraian: "",
    jumlah: "",
    nomorBukti: "",
  };
}

function defaultBelanjaForm(): BelanjaFormState {
  return {
    tanggal: todayIso(),
    bidang: "",
    subKegiatan: "",
    keterangan: "",
    jumlah: "",
    nomorBukti: "",
  };
}

function defaultTransaksiForm(): TransaksiFormState {
  return {
    id: null,
    tanggal: todayIso(),
    jenis: "masuk",
    kategori: "",
    uraian: "",
    jumlah: "",
    nomorBukti: "",
  };
}

function defaultSppForm(): SppFormState {
  return {
    id: null,
    nomorSPP: "",
    tanggal: todayIso(),
    kegiatan: "",
    subKegiatan: "",
    uraian: "",
    jumlah: "",
    kodeRekening: "",
    keterangan: "",
  };
}

export function useKeuangan() {
  const { appAlert } = useAppDialogs();

  const [selectedYear, setSelectedYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const yearOptions = useMemo(() => buildYearOptions(selectedYear), [selectedYear]);
  // Selalu menunjuk tahun yang sedang ditampilkan, agar refetch setelah simpan tidak memakai tahun basi.
  const yearRef = useRef(selectedYear);
  const [activeTab, setActiveTab] = usePersistedTab<KeuanganTab>(
    "keuangan",
    "overview",
    KEUANGAN_TABS,
  );

  // `refreshing` true selama ada muat data non-senyap; `hasLoaded` membedakan muat pertama (layar penuh)
  // dari ganti tahun (konten tetap terpasang, hanya diredupkan).
  const [refreshing, setRefreshing] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const submittingRef = useRef(false);
  const loading = refreshing && !hasLoaded;
  const [error, setError] = useState<AsyncPageError | null>(null);

  const [apbdesData, setApbdesData] = useState<ApbdesData>(() =>
    defaultApbdes(),
  );
  const [pendapatanData, setPendapatanData] = useState<PendapatanItem[]>([]);
  const [belanjaData, setBelanjaData] = useState<BelanjaItem[]>([]);
  const [transaksiKas, setTransaksiKas] = useState<TransaksiKasItem[]>([]);
  const [sppData, setSppData] = useState<SPPItem[]>([]);
  const [trendKeuangan, setTrendKeuangan] = useState<TrendItem[]>([]);
  const [kas, setKas] = useState<KasSummary>({
    totalPemasukan: 0,
    totalPengeluaran: 0,
    saldo: 0,
    jumlahTransaksi: 0,
    terpotong: false,
  });
  const [sppStatus, setSppStatus] = useState<SppStatusCount>({
    approved: 0,
    pending: 0,
    rejected: 0,
    total: 0,
  });

  const [showSPPDialog, setShowSPPDialog] = useState(false);
  const [selectedSPP, setSelectedSPP] = useState<SPPItem | null>(null);

  const [showPendapatanDialog, setShowPendapatanDialog] = useState(false);
  const [formPendapatan, setFormPendapatan] = useState<PendapatanFormState>(
    () => defaultPendapatanForm(),
  );

  const [showBelanjaDialog, setShowBelanjaDialog] = useState(false);
  const [formBelanja, setFormBelanja] = useState<BelanjaFormState>(() =>
    defaultBelanjaForm(),
  );

  const [showDetailBelanjaDialog, setShowDetailBelanjaDialog] = useState(false);
  const [selectedBelanja, setSelectedBelanja] = useState<BelanjaItem | null>(
    null,
  );

  const [showTransaksiDialog, setShowTransaksiDialog] = useState(false);
  const [transaksiMode, setTransaksiMode] = useState<"create" | "edit">(
    "create",
  );
  const [formTransaksi, setFormTransaksi] = useState<TransaksiFormState>(() =>
    defaultTransaksiForm(),
  );

  const [showDetailTransaksiDialog, setShowDetailTransaksiDialog] =
    useState(false);
  const [selectedTransaksi, setSelectedTransaksi] =
    useState<TransaksiKasItem | null>(null);

  const [sppMode, setSppMode] = useState<"create" | "edit">("create");
  const [formSPP, setFormSPP] = useState<SppFormState>(() => defaultSppForm());

  const [showDetailSPPDialog, setShowDetailSPPDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"approve" | "reject">(
    "approve",
  );
  const [alasanReject, setAlasanReject] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendapatanFormError, setPendapatanFormError] = useState<string | null>(
    null,
  );

  const fetchFinance = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    const year = yearRef.current;

    // Request baru membatalkan yang lama: respons tahun A tidak boleh menimpa data tahun B.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrent = () => abortRef.current === controller;

    if (!silent) {
      setRefreshing(true);
      setError(null);
    }

    try {
      const res = await fetch(`/api/finance/summary?year=${year}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!isCurrent()) return;

      if (!res.ok) {
        const entitled = parseModuleNotEntitledBody(body);
        if (entitled) {
          setError(entitled);
          return;
        }

        const message =
          body &&
          typeof body === "object" &&
          typeof (body as { error?: string }).error === "string"
            ? (body as { error: string }).error
            : "Gagal memuat data keuangan";
        if (silent) {
          // Data sudah tersimpan; jangan ganti seluruh halaman dengan panel error.
          toast.error(`${message}. Muat ulang halaman untuk melihat data terbaru.`);
        } else {
          setError(message);
        }
        return;
      }

      const result = body as { data: FinanceResponse };
      setApbdesData(result.data.apbdes);
      setPendapatanData(result.data.pendapatan);
      setBelanjaData(result.data.belanja);
      setTransaksiKas(result.data.transaksi);
      setSppData(result.data.spp);
      setTrendKeuangan(result.data.trend);
      setKas(result.data.kas);
      setSppStatus(result.data.sppStatus);
      setHasLoaded(true);
    } catch (err) {
      if (controller.signal.aborted || !isCurrent()) return;
      const message =
        err instanceof Error ? err.message : "Terjadi kesalahan";
      console.error("fetchFinance error", err);
      if (silent) {
        toast.error(`${message}. Muat ulang halaman untuk melihat data terbaru.`);
      } else {
        setError(message);
      }
    } finally {
      if (isCurrent()) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    yearRef.current = selectedYear;
    void fetchFinance();
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [selectedYear, fetchFinance]);

  /** Setelah simpan: bila tanggal jatuh di tahun lain, pindah ke tahun itu agar data baru langsung terlihat. */
  const refreshAfterSave = useCallback(
    async (tanggal: string) => {
      const savedYear = tanggal.slice(0, 4);
      if (/^\d{4}$/.test(savedYear) && savedYear !== yearRef.current) {
        toast.info(`Menampilkan data tahun ${savedYear} agar catatan baru terlihat.`);
        setSelectedYear(savedYear);
        return;
      }
      await fetchFinance({ silent: true });
    },
    [fetchFinance],
  );

  const beginSubmit = useCallback(() => {
    if (submittingRef.current) return false;
    submittingRef.current = true;
    setIsSubmitting(true);
    return true;
  }, []);

  const endSubmit = useCallback(() => {
    submittingRef.current = false;
    setIsSubmitting(false);
  }, []);

  const persentaseRealisasiPendapatan = useMemo(() => {
    return apbdesData.totalPendapatan > 0
      ? (apbdesData.realisasiPendapatan / apbdesData.totalPendapatan) * 100
      : 0;
  }, [apbdesData.realisasiPendapatan, apbdesData.totalPendapatan]);

  const persentaseRealisasiBelanja = useMemo(() => {
    return apbdesData.totalBelanja > 0
      ? (apbdesData.realisasiBelanja / apbdesData.totalBelanja) * 100
      : 0;
  }, [apbdesData.realisasiBelanja, apbdesData.totalBelanja]);

  const sisaAnggaran = useMemo(() => {
    return apbdesData.totalPendapatan - apbdesData.totalBelanja;
  }, [apbdesData.totalBelanja, apbdesData.totalPendapatan]);

  // Total & saldo dihitung server dari semua transaksi sah, bukan dari baris yang dimuat di tabel.
  const totalPemasukan = kas.totalPemasukan;
  const totalPengeluaran = kas.totalPengeluaran;
  const saldoKas = kas.saldo;

  const handlePendapatanChange = useCallback(
    (field: keyof PendapatanFormState, value: string) => {
      setPendapatanFormError(null);
      setFormPendapatan((prev) => ({
        ...prev,
        [field]: value,
        ...(field === "kategori" ? { subKategori: "" } : {}),
      }));
    },
    [],
  );

  const handleSavePendapatan = useCallback(async () => {
    setPendapatanFormError(null);

    const uraianTrim = formPendapatan.uraian.trim();
    const subsForKat = subKategoriOptions[formPendapatan.kategori]?.length ?? 0;

    if (!formPendapatan.tanggal) {
      setPendapatanFormError("Tanggal harus diisi.");
      return;
    }
    const tanggalParsed = new Date(formPendapatan.tanggal);
    if (Number.isNaN(tanggalParsed.getTime())) {
      setPendapatanFormError("Format tanggal tidak valid.");
      return;
    }

    if (!formPendapatan.kategori) {
      setPendapatanFormError("Kategori harus dipilih.");
      return;
    }
    if (subsForKat > 0 && !formPendapatan.subKategori.trim()) {
      setPendapatanFormError("Sub kategori harus dipilih.");
      return;
    }
    if (!uraianTrim) {
      setPendapatanFormError("Uraian harus diisi.");
      return;
    }

    const jumlahParsed = parseFloat(
      String(formPendapatan.jumlah).replace(",", "."),
    );
    if (!Number.isFinite(jumlahParsed) || jumlahParsed <= 0) {
      setPendapatanFormError("Jumlah harus berupa angka lebih dari 0.");
      return;
    }

    const descriptionPayload =
      formPendapatan.subKategori.trim().length > 0
        ? `${uraianTrim} (${formPendapatan.subKategori.trim()})`
        : uraianTrim;

    if (!beginSubmit()) return;
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "income",
          category: formPendapatan.kategori,
          description: descriptionPayload,
          amount: jumlahParsed,
          transactionDate: formPendapatan.tanggal,
          referenceNumber: formPendapatan.nomorBukti.trim() || undefined,
        }),
      });

      const raw = await response.text();
      let parsed: NonNullable<ApiErrorBody> = {};
      try {
        parsed = raw ? (JSON.parse(raw) as NonNullable<ApiErrorBody>) : {};
      } catch {
        parsed = {
          error:
            raw?.slice(0, 200) ||
            response.statusText ||
            "Respons server tidak valid",
        };
      }

      if (!response.ok) {
        throw new Error(
          financeErrorMessage(parsed, `Gagal menyimpan (${response.status}).`),
        );
      }

      const savedTanggal = formPendapatan.tanggal;
      setFormPendapatan(defaultPendapatanForm());
      setPendapatanFormError(null);
      setShowPendapatanDialog(false);
      toast.success("Pendapatan berhasil disimpan");
      await refreshAfterSave(savedTanggal);
    } catch (err) {
      console.error("Error saving pendapatan:", err);
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan pendapatan";
      setPendapatanFormError(msg);
    } finally {
      endSubmit();
    }
  }, [beginSubmit, endSubmit, refreshAfterSave, formPendapatan]);

  const handleBelanjaChange = useCallback(
    (field: keyof BelanjaFormState, value: string) => {
      setFormBelanja((prev) => ({
        ...prev,
        [field]: value,
        ...(field === "bidang" ? { subKegiatan: "" } : {}),
      }));
    },
    [],
  );

  const handleSaveBelanja = useCallback(async () => {
    if (!formBelanja.bidang) {
      void appAlert("Bidang belanja harus diisi");
      return;
    }
    if (!formBelanja.keterangan) {
      void appAlert("Keterangan harus diisi");
      return;
    }
    if (!formBelanja.jumlah || parseFloat(formBelanja.jumlah) <= 0) {
      void appAlert("Jumlah harus lebih dari 0");
      return;
    }

    if (!beginSubmit()) return;
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          category: formBelanja.bidang,
          description: formBelanja.subKegiatan
            ? `${formBelanja.keterangan.trim()} (${formBelanja.subKegiatan})`
            : formBelanja.keterangan.trim(),
          amount: parseFloat(formBelanja.jumlah),
          transactionDate: formBelanja.tanggal,
          referenceNumber: formBelanja.nomorBukti || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(financeErrorMessage(result, "Gagal menyimpan belanja"));
      }

      const savedTanggal = formBelanja.tanggal;
      setFormBelanja(defaultBelanjaForm());
      setShowBelanjaDialog(false);
      toast.success("Belanja berhasil disimpan");
      await refreshAfterSave(savedTanggal);
    } catch (err) {
      console.error("Error saving belanja:", err);
      void appAlert(
        err instanceof Error ? err.message : "Gagal menyimpan belanja",
      );
    } finally {
      endSubmit();
    }
  }, [appAlert, beginSubmit, endSubmit, refreshAfterSave, formBelanja]);

  const handleTransaksiChange = useCallback(
    (field: keyof TransaksiFormState, value: string) => {
      setFormTransaksi((prev) => ({
        ...prev,
        [field]: value,
        ...(field === "jenis" ? { kategori: "" } : {}),
      }));
    },
    [],
  );

  const handleOpenTransaksiDialog = useCallback(
    (mode: "create" | "edit", transaksi?: TransaksiKasItem) => {
      setTransaksiMode(mode);
      if (mode === "edit" && transaksi) {
        setFormTransaksi({
          id: transaksi.id,
          tanggal: transaksi.tanggal.slice(0, 10),
          jenis: transaksi.jenis,
          kategori: "",
          uraian: transaksi.uraian,
          jumlah: transaksi.jumlah.toString(),
          nomorBukti: transaksi.referensi,
        });
      } else {
        setFormTransaksi(defaultTransaksiForm());
      }
      setShowTransaksiDialog(true);
    },
    [],
  );

  const handleSaveTransaksi = useCallback(async () => {
    if (!formTransaksi.kategori) {
      void appAlert("Kategori harus diisi");
      return;
    }
    if (!formTransaksi.uraian) {
      void appAlert("Uraian harus diisi");
      return;
    }
    if (!formTransaksi.jumlah || parseFloat(formTransaksi.jumlah) <= 0) {
      void appAlert("Jumlah harus lebih dari 0");
      return;
    }

    if (!beginSubmit()) return;
    try {
      const url = "/api/finance/transactions";
      const method = formTransaksi.id ? "PUT" : "POST";
      const body = formTransaksi.id
        ? {
            id: formTransaksi.id,
            type: formTransaksi.jenis === "masuk" ? "income" : "expense",
            category: formTransaksi.kategori,
            description: formTransaksi.uraian,
            amount: parseFloat(formTransaksi.jumlah),
            transactionDate: formTransaksi.tanggal,
            referenceNumber: formTransaksi.nomorBukti || undefined,
          }
        : {
            type: formTransaksi.jenis === "masuk" ? "income" : "expense",
            category: formTransaksi.kategori,
            description: formTransaksi.uraian,
            amount: parseFloat(formTransaksi.jumlah),
            transactionDate: formTransaksi.tanggal,
            referenceNumber: formTransaksi.nomorBukti || undefined,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(financeErrorMessage(result, "Gagal menyimpan transaksi"));
      }

      const savedTanggal = formTransaksi.tanggal;
      setFormTransaksi(defaultTransaksiForm());
      setShowTransaksiDialog(false);
      toast.success(
        formTransaksi.id
          ? "Transaksi berhasil diupdate"
          : "Transaksi berhasil disimpan",
      );
      await refreshAfterSave(savedTanggal);
    } catch (err) {
      console.error("Error saving transaksi:", err);
      void appAlert(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi",
      );
    } finally {
      endSubmit();
    }
  }, [appAlert, beginSubmit, endSubmit, refreshAfterSave, formTransaksi]);

  const handleSPPChange = useCallback(
    (field: keyof SppFormState, value: string) => {
      setFormSPP((prev) => ({
        ...prev,
        [field]: value,
        ...(field === "kegiatan" ? { subKegiatan: "" } : {}),
      }));
    },
    [],
  );

  const handleOpenSPPDialog = useCallback(
    (mode: "create" | "edit", spp?: SPPItem) => {
      setSppMode(mode);
      if (mode === "edit" && spp) {
        setFormSPP({
          id: spp.id,
          nomorSPP: spp.nomor,
          tanggal: spp.tanggal.slice(0, 10),
          kegiatan: "",
          subKegiatan: "",
          uraian: spp.keperluan,
          jumlah: spp.jumlah.toString(),
          kodeRekening: "",
          keterangan: "",
        });
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const autoNomor = `SPP/${month}/${year}/${String(sppStatus.total + 1).padStart(3, "0")}`;
        setFormSPP({
          id: null,
          nomorSPP: autoNomor,
          tanggal: todayIso(),
          kegiatan: "",
          subKegiatan: "",
          uraian: "",
          jumlah: "",
          kodeRekening: "",
          keterangan: "",
        });
      }
      setShowSPPDialog(true);
    },
    [sppStatus.total],
  );

  const handleSaveSPP = useCallback(async () => {
    if (!formSPP.kegiatan) {
      void appAlert("Kegiatan harus diisi");
      return;
    }
    if (!formSPP.uraian) {
      void appAlert("Uraian/Keperluan harus diisi");
      return;
    }
    if (!formSPP.jumlah || parseFloat(formSPP.jumlah) <= 0) {
      void appAlert("Jumlah harus lebih dari 0");
      return;
    }
    if (!formSPP.nomorSPP) {
      void appAlert("Nomor SPP harus diisi");
      return;
    }

    if (!beginSubmit()) return;
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          category: formSPP.kegiatan,
          description: formSPP.subKegiatan
            ? `${formSPP.uraian.trim()} (${formSPP.subKegiatan})`
            : formSPP.uraian.trim(),
          amount: parseFloat(formSPP.jumlah),
          transactionDate: formSPP.tanggal,
          referenceNumber: formSPP.nomorSPP,
          status: "pending",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(financeErrorMessage(result, "Gagal menyimpan SPP"));
      }

      const savedTanggal = formSPP.tanggal;
      setFormSPP(defaultSppForm());
      setShowSPPDialog(false);
      toast.success("SPP berhasil diajukan");
      await refreshAfterSave(savedTanggal);
    } catch (err) {
      console.error("Error saving SPP:", err);
      void appAlert(err instanceof Error ? err.message : "Gagal menyimpan SPP");
    } finally {
      endSubmit();
    }
  }, [appAlert, beginSubmit, endSubmit, refreshAfterSave, formSPP]);

  const handleOpenConfirmDialog = useCallback(
    (mode: "approve" | "reject", spp: SPPItem) => {
      setConfirmMode(mode);
      setSelectedSPP(spp);
      setAlasanReject("");
      setShowConfirmDialog(true);
    },
    [],
  );

  const handleConfirmAction = useCallback(async () => {
    if (!selectedSPP) return;

    if (confirmMode === "reject" && !alasanReject.trim()) {
      void appAlert("Alasan penolakan harus diisi");
      return;
    }

    if (!beginSubmit()) return;
    try {
      const response = await fetch("/api/finance/spp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: selectedSPP.id,
          action: confirmMode,
          ...(confirmMode === "reject" && { reason: alasanReject }),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody;
        throw new Error(
          financeErrorMessage(
            body,
            `Gagal ${confirmMode === "approve" ? "menyetujui" : "menolak"} SPP`,
          ),
        );
      }

      setShowConfirmDialog(false);
      setShowDetailSPPDialog(false);
      setAlasanReject("");
      toast.success(
        confirmMode === "approve" ? "SPP disetujui" : "SPP ditolak",
      );
      await fetchFinance({ silent: true });
    } catch (err) {
      console.error(`Error ${confirmMode} SPP:`, err);
      void appAlert(
        err instanceof Error
          ? err.message
          : `Gagal ${confirmMode === "approve" ? "menyetujui" : "menolak"} SPP`,
      );
    } finally {
      endSubmit();
    }
  }, [alasanReject, appAlert, beginSubmit, confirmMode, endSubmit, fetchFinance, selectedSPP]);

  return {
    selectedYear,
    setSelectedYear,
    yearOptions,
    refreshing,
    activeTab,
    setActiveTab,
    loading,
    error,

    apbdesData,
    pendapatanData,
    belanjaData,
    transaksiKas,
    sppData,
    trendKeuangan,

    persentaseRealisasiPendapatan,
    persentaseRealisasiBelanja,
    sisaAnggaran,
    totalPemasukan,
    totalPengeluaran,
    saldoKas,
    kas,
    sppStatus,

    fetchFinance,

    showSPPDialog,
    setShowSPPDialog,
    selectedSPP,
    setSelectedSPP,
    sppMode,
    formSPP,
    handleSPPChange,
    handleOpenSPPDialog,
    handleSaveSPP,

    showPendapatanDialog,
    setShowPendapatanDialog,
    formPendapatan,
    handlePendapatanChange,
    handleSavePendapatan,

    showBelanjaDialog,
    setShowBelanjaDialog,
    formBelanja,
    handleBelanjaChange,
    handleSaveBelanja,
    showDetailBelanjaDialog,
    setShowDetailBelanjaDialog,
    selectedBelanja,
    setSelectedBelanja,

    showTransaksiDialog,
    setShowTransaksiDialog,
    transaksiMode,
    formTransaksi,
    handleTransaksiChange,
    handleOpenTransaksiDialog,
    handleSaveTransaksi,
    showDetailTransaksiDialog,
    setShowDetailTransaksiDialog,
    selectedTransaksi,
    setSelectedTransaksi,

    showDetailSPPDialog,
    setShowDetailSPPDialog,
    showConfirmDialog,
    setShowConfirmDialog,
    confirmMode,
    alasanReject,
    setAlasanReject,
    handleOpenConfirmDialog,
    handleConfirmAction,

    isSubmitting,
    pendapatanFormError,
    setPendapatanFormError,
  };
}

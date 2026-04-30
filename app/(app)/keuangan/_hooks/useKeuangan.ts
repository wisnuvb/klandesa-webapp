"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { usePersistedTab } from "@/hooks/usePersistedTab";
import { subKategoriOptions } from "../_lib/constants";
import type {
  ApbdesData,
  BelanjaFormState,
  BelanjaItem,
  FinanceResponse,
  KeuanganTab,
  PendapatanFormState,
  PendapatanItem,
  SPPItem,
  SppFormState,
  TransaksiFormState,
  TransaksiKasItem,
  TrendItem,
} from "../_lib/types";
import { KEUANGAN_TABS } from "../_lib/types";

function todayIso() {
  return new Date().toISOString().split("T")[0]!;
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

  const [selectedYear, setSelectedYear] = useState("2025");
  const [activeTab, setActiveTab] = usePersistedTab<KeuanganTab>(
    "keuangan",
    "overview",
    KEUANGAN_TABS,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [apbdesData, setApbdesData] = useState<ApbdesData>(() =>
    defaultApbdes(),
  );
  const [pendapatanData, setPendapatanData] = useState<PendapatanItem[]>([]);
  const [belanjaData, setBelanjaData] = useState<BelanjaItem[]>([]);
  const [transaksiKas, setTransaksiKas] = useState<TransaksiKasItem[]>([]);
  const [sppData, setSppData] = useState<SPPItem[]>([]);
  const [trendKeuangan, setTrendKeuangan] = useState<TrendItem[]>([]);

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

  const fetchFinance = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false;
      try {
        if (!silent) setLoading(true);
        setError(null);
        const res = await fetch(`/api/finance/summary?year=${selectedYear}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Gagal memuat data keuangan");

        const result: { data: FinanceResponse } = await res.json();
        setApbdesData(result.data.apbdes);
        setPendapatanData(result.data.pendapatan);
        setBelanjaData(result.data.belanja);
        setTransaksiKas(result.data.transaksi);
        setSppData(result.data.spp);
        setTrendKeuangan(result.data.trend);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        console.error("fetchFinance error", err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [selectedYear],
  );

  useEffect(() => {
    void fetchFinance();
  }, [fetchFinance]);

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

  const totalPemasukan = useMemo(() => {
    return transaksiKas
      .filter((t) => t.jenis === "masuk")
      .reduce((sum, t) => sum + t.jumlah, 0);
  }, [transaksiKas]);

  const totalPengeluaran = useMemo(() => {
    return transaksiKas
      .filter((t) => t.jenis === "keluar")
      .reduce((sum, t) => sum + t.jumlah, 0);
  }, [transaksiKas]);

  const saldoKas = useMemo(
    () => totalPemasukan - totalPengeluaran,
    [totalPemasukan, totalPengeluaran],
  );

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

    try {
      setIsSubmitting(true);
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
      let parsed: { error?: string } = {};
      try {
        parsed = raw ? (JSON.parse(raw) as { error?: string }) : {};
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
          parsed.error || `Gagal menyimpan (${response.status}).`,
        );
      }

      await fetchFinance({ silent: true });

      setFormPendapatan(defaultPendapatanForm());
      setPendapatanFormError(null);
      setShowPendapatanDialog(false);
      toast.success("Pendapatan berhasil disimpan");
    } catch (err) {
      console.error("Error saving pendapatan:", err);
      const msg =
        err instanceof Error ? err.message : "Gagal menyimpan pendapatan";
      setPendapatanFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchFinance, formPendapatan]);

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

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          category: formBelanja.bidang,
          description: formBelanja.keterangan,
          amount: parseFloat(formBelanja.jumlah),
          transactionDate: formBelanja.tanggal,
          referenceNumber: formBelanja.nomorBukti || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan belanja");
      }

      await fetchFinance({ silent: true });

      setFormBelanja(defaultBelanjaForm());
      setShowBelanjaDialog(false);
      toast.success("Belanja berhasil disimpan");
    } catch (err) {
      console.error("Error saving belanja:", err);
      void appAlert(
        err instanceof Error ? err.message : "Gagal menyimpan belanja",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [appAlert, fetchFinance, formBelanja]);

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
          tanggal: transaksi.tanggal,
          jenis: transaksi.jenis,
          kategori: "",
          uraian: transaksi.uraian,
          jumlah: transaksi.jumlah.toString(),
          nomorBukti: transaksi.kode,
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

    try {
      setIsSubmitting(true);
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
        throw new Error(result.error || "Gagal menyimpan transaksi");
      }

      await fetchFinance({ silent: true });

      setFormTransaksi(defaultTransaksiForm());
      setShowTransaksiDialog(false);
      toast.success(
        formTransaksi.id
          ? "Transaksi berhasil diupdate"
          : "Transaksi berhasil disimpan",
      );
    } catch (err) {
      console.error("Error saving transaksi:", err);
      void appAlert(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [appAlert, fetchFinance, formTransaksi]);

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
          tanggal: spp.tanggal,
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
        const autoNomor = `SPP/${month}/${year}/001`;
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
    [],
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

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "expense",
          category: formSPP.kegiatan,
          description: formSPP.uraian,
          amount: parseFloat(formSPP.jumlah),
          transactionDate: formSPP.tanggal,
          referenceNumber: formSPP.nomorSPP,
          status: "pending",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan SPP");
      }

      await fetchFinance({ silent: true });

      setFormSPP(defaultSppForm());
      setShowSPPDialog(false);
      toast.success("SPP berhasil diajukan");
    } catch (err) {
      console.error("Error saving SPP:", err);
      void appAlert(err instanceof Error ? err.message : "Gagal menyimpan SPP");
    } finally {
      setIsSubmitting(false);
    }
  }, [appAlert, fetchFinance, formSPP]);

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

    try {
      setIsSubmitting(true);
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
        throw new Error(`Gagal ${confirmMode} SPP`);
      }

      await fetchFinance({ silent: true });

      setShowConfirmDialog(false);
      setShowDetailSPPDialog(false);
      setAlasanReject("");
    } catch (err) {
      console.error(`Error ${confirmMode} SPP:`, err);
      void appAlert(`Gagal ${confirmMode} SPP`);
    } finally {
      setIsSubmitting(false);
    }
  }, [alasanReject, appAlert, confirmMode, fetchFinance, selectedSPP]);

  return {
    selectedYear,
    setSelectedYear,
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

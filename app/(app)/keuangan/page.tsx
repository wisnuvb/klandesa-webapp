"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Search,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";

// Types for finance data coming from API
type ApbdesData = {
  tahun: number;
  totalPendapatan: number;
  totalBelanja: number;
  realisasiPendapatan: number;
  realisasiBelanja: number;
  budgetPendapatan?: number;
  budgetBelanja?: number;
};

type PendapatanItem = {
  kategori: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
  subKategori: Array<{ nama: string; anggaran: number; realisasi: number }>;
};

type BelanjaItem = {
  bidang: string;
  anggaran: number;
  realisasi: number;
  persentase: number;
  color?: string;
  subItems: Array<{
    nama: string;
    anggaran: number;
    realisasi: number;
    persentase: number;
  }>;
};

type TransaksiKasItem = {
  id: number;
  tanggal: string;
  kode: string;
  uraian: string;
  jenis: "masuk" | "keluar";
  jumlah: number;
  saldo: number;
  status: string;
};

type SPPItem = {
  id: number;
  nomor: string;
  tanggal: string;
  keperluan: string;
  bidang: string;
  jumlah: number;
  status: string;
  pengaju: string;
};

type TrendItem = { bulan: string; pendapatan: number; belanja: number };

type FinanceResponse = {
  apbdes: ApbdesData;
  pendapatan: PendapatanItem[];
  belanja: BelanjaItem[];
  transaksi: TransaksiKasItem[];
  spp: SPPItem[];
  trend: TrendItem[];
};

// Colors are assigned in API; keep local palette if needed

const formatRupiah = (angka: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
};

const formatRupiahShort = (angka: number) => {
  if (angka >= 1000000000) {
    return `Rp ${(angka / 1000000000).toFixed(2)} M`;
  } else if (angka >= 1000000) {
    return `Rp ${(angka / 1000000).toFixed(2)} Jt`;
  }
  return formatRupiah(angka);
};

export function Keuangan() {
  const [selectedYear, setSelectedYear] = useState("2025");
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apbdesData, setApbdesData] = useState<ApbdesData>({
    tahun: new Date().getFullYear(),
    totalPendapatan: 0,
    totalBelanja: 0,
    realisasiPendapatan: 0,
    realisasiBelanja: 0,
    budgetPendapatan: 0,
    budgetBelanja: 0,
  });
  const [pendapatanData, setPendapatanData] = useState<PendapatanItem[]>([]);
  const [belanjaData, setBelanjaData] = useState<BelanjaItem[]>([]);
  const [transaksiKas, setTransaksiKas] = useState<TransaksiKasItem[]>([]);
  const [sppData, setSppData] = useState<SPPItem[]>([]);
  const [trendKeuangan, setTrendKeuangan] = useState<TrendItem[]>([]);
  const [showSPPDialog, setShowSPPDialog] = useState(false);
  const [selectedSPP, setSelectedSPP] = useState<SPPItem | null>(null);
  const [showPendapatanDialog, setShowPendapatanDialog] = useState(false);
  const [formPendapatan, setFormPendapatan] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    kategori: "",
    subKategori: "",
    uraian: "",
    jumlah: "",
    nomorBukti: "",
  });
  const [showBelanjaDialog, setShowBelanjaDialog] = useState(false);
  const [formBelanja, setFormBelanja] = useState({
    tanggal: new Date().toISOString().split("T")[0],
    bidang: "",
    subKegiatan: "",
    keterangan: "",
    jumlah: "",
    nomorBukti: "",
  });
  const [showDetailBelanjaDialog, setShowDetailBelanjaDialog] = useState(false);
  const [selectedBelanja, setSelectedBelanja] = useState<BelanjaItem | null>(
    null
  );
  const [showTransaksiDialog, setShowTransaksiDialog] = useState(false);
  const [transaksiMode, setTransaksiMode] = useState<"create" | "edit">(
    "create"
  );
  const [formTransaksi, setFormTransaksi] = useState({
    id: null as number | null,
    tanggal: new Date().toISOString().split("T")[0],
    jenis: "masuk" as "masuk" | "keluar",
    kategori: "",
    uraian: "",
    jumlah: "",
    nomorBukti: "",
  });
  const [showDetailTransaksiDialog, setShowDetailTransaksiDialog] =
    useState(false);
  const [selectedTransaksi, setSelectedTransaksi] =
    useState<TransaksiKasItem | null>(null);
  const [sppMode, setSppMode] = useState<"create" | "edit">("create");
  const [formSPP, setFormSPP] = useState({
    id: null as number | null,
    nomorSPP: "",
    tanggal: new Date().toISOString().split("T")[0],
    kegiatan: "",
    subKegiatan: "",
    uraian: "",
    jumlah: "",
    kodeRekening: "",
    keterangan: "",
  });
  const [showDetailSPPDialog, setShowDetailSPPDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"approve" | "reject">(
    "approve"
  );
  const [alasanReject, setAlasanReject] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFinance = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/finance/summary?year=${selectedYear}`);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const persentaseRealisasiPendapatan =
    apbdesData.totalPendapatan > 0
      ? (apbdesData.realisasiPendapatan / apbdesData.totalPendapatan) * 100
      : 0;
  const persentaseRealisasiBelanja =
    apbdesData.totalBelanja > 0
      ? (apbdesData.realisasiBelanja / apbdesData.totalBelanja) * 100
      : 0;
  const sisaAnggaran = apbdesData.totalPendapatan - apbdesData.totalBelanja;

  // Calculate totals from transactions
  const totalPemasukan = transaksiKas
    .filter((t) => t.jenis === "masuk")
    .reduce((sum, t) => sum + t.jumlah, 0);
  const totalPengeluaran = transaksiKas
    .filter((t) => t.jenis === "keluar")
    .reduce((sum, t) => sum + t.jumlah, 0);
  const saldoKas = totalPemasukan - totalPengeluaran;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Memuat data keuangan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="text-center space-y-4">
          <div className="text-red-500 text-4xl mb-2">⚠️</div>
          <h3 className="text-lg font-semibold">Gagal memuat data</h3>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchFinance}>Coba Lagi</Button>
        </div>
      </div>
    );
  }

  // Sub kategori mapping
  const subKategoriOptions: Record<string, string[]> = {
    PADes: [
      "Hasil Usaha Desa",
      "Hasil Aset Desa",
      "Swadaya dan Partisipasi",
      "Lain-lain PADes",
    ],
    Transfer: [
      "Dana Desa",
      "Alokasi Dana Desa (ADD)",
      "Bagi Hasil Pajak & Retribusi",
    ],
    "Lain-lain": ["Hibah dan Sumbangan", "Lain-lain Pendapatan Desa"],
  };

  // Sub kegiatan per bidang belanja
  const subKegiatanOptions: Record<string, string[]> = {
    "Penyelenggaraan Pemerintahan Desa": [
      "Penyelenggaraan Belanja Siltap, Tunjangan dan Operasional Pemerintah Desa",
      "Sarana dan Prasarana Pemerintah Desa",
      "Administrasi Pemerintahan Desa",
      "Tunjangan BPD",
      "Operasional BPD",
    ],
    "Pelaksanaan Pembangunan Desa": [
      "Pembangunan Jalan Desa",
      "Pembangunan Jembatan",
      "Pembangunan Irigasi",
      "Pembangunan Air Bersih",
      "Pembangunan Sanitasi",
      "Pembangunan Fasilitas Umum",
    ],
    "Pembinaan Kemasyarakatan": [
      "Kegiatan Pembinaan Ketentraman dan Ketertiban",
      "Pembinaan Kerukunan Umat Beragama",
      "Pengadaan Sarana Prasarana Olahraga",
      "Pembinaan Lembaga Adat",
      "Kegiatan Posyandu",
    ],
    "Pemberdayaan Masyarakat": [
      "Pelatihan Kepala Desa dan Perangkat Desa",
      "Pelatihan BPD",
      "Peningkatan Kapasitas Masyarakat",
      "Pelatihan Kelompok Tani",
      "Pelatihan UMKM",
    ],
    "Penanggulangan Bencana & Darurat": [
      "Penanggulangan Bencana",
      "Keadaan Darurat",
      "Keadaan Mendesak",
    ],
  };

  // Kategori transaksi kas
  const kategoriTransaksiMasuk = [
    "Penerimaan Dana Desa",
    "Penerimaan ADD",
    "Penerimaan Bagi Hasil Pajak",
    "Hasil Usaha Desa",
    "Hasil Aset Desa",
    "Swadaya Masyarakat",
    "Hibah dan Sumbangan",
    "Lain-lain Pendapatan",
  ];

  const kategoriTransaksiKeluar = [
    "Belanja Pegawai",
    "Belanja Barang dan Jasa",
    "Belanja Modal",
    "Belanja Tak Terduga",
    "Honorarium",
    "Operasional Pemerintahan",
    "Pembangunan",
    "Pemberdayaan Masyarakat",
  ];

  const handlePendapatanChange = (field: string, value: string) => {
    setFormPendapatan((prev) => ({
      ...prev,
      [field]: value,
      // Reset sub kategori when kategori changes
      ...(field === "kategori" ? { subKategori: "" } : {}),
    }));
  };

  const handleSavePendapatan = async () => {
    // Validation
    if (!formPendapatan.kategori) {
      alert("Kategori harus diisi");
      return;
    }
    if (!formPendapatan.uraian) {
      alert("Uraian harus diisi");
      return;
    }
    if (!formPendapatan.jumlah || parseFloat(formPendapatan.jumlah) <= 0) {
      alert("Jumlah harus lebih dari 0");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "income",
          category: formPendapatan.kategori,
          description: formPendapatan.uraian,
          amount: parseFloat(formPendapatan.jumlah),
          transactionDate: formPendapatan.tanggal,
          referenceNumber: formPendapatan.nomorBukti || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan pendapatan");
      }

      // Refetch data
      await fetchFinance();

      // Reset form
      setFormPendapatan({
        tanggal: new Date().toISOString().split("T")[0],
        kategori: "",
        subKategori: "",
        uraian: "",
        jumlah: "",
        nomorBukti: "",
      });
      setShowPendapatanDialog(false);
      alert("Pendapatan berhasil disimpan");
    } catch (err) {
      console.error("Error saving pendapatan:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan pendapatan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBelanjaChange = (field: string, value: string) => {
    setFormBelanja((prev) => ({
      ...prev,
      [field]: value,
      // Reset sub kegiatan when bidang changes
      ...(field === "bidang" ? { subKegiatan: "" } : {}),
    }));
  };

  const handleSaveBelanja = async () => {
    // Validation
    if (!formBelanja.bidang) {
      alert("Bidang belanja harus diisi");
      return;
    }
    if (!formBelanja.keterangan) {
      alert("Keterangan harus diisi");
      return;
    }
    if (!formBelanja.jumlah || parseFloat(formBelanja.jumlah) <= 0) {
      alert("Jumlah harus lebih dari 0");
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

      // Refetch data
      await fetchFinance();

      // Reset form
      setFormBelanja({
        tanggal: new Date().toISOString().split("T")[0],
        bidang: "",
        subKegiatan: "",
        keterangan: "",
        jumlah: "",
        nomorBukti: "",
      });
      setShowBelanjaDialog(false);
      alert("Belanja berhasil disimpan");
    } catch (err) {
      console.error("Error saving belanja:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan belanja");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransaksiChange = (field: string, value: string) => {
    setFormTransaksi((prev) => ({
      ...prev,
      [field]: value,
      // Reset kategori when jenis changes
      ...(field === "jenis" ? { kategori: "" } : {}),
    }));
  };

  const handleOpenTransaksiDialog = (
    mode: "create" | "edit",
    transaksi?: TransaksiKasItem
  ) => {
    setTransaksiMode(mode);
    if (mode === "edit" && transaksi) {
      setFormTransaksi({
        id: transaksi.id,
        tanggal: transaksi.tanggal,
        jenis: transaksi.jenis,
        kategori: "", // Will be populated from real data
        uraian: transaksi.uraian,
        jumlah: transaksi.jumlah.toString(),
        nomorBukti: transaksi.kode,
      });
    } else {
      setFormTransaksi({
        id: null,
        tanggal: new Date().toISOString().split("T")[0],
        jenis: "masuk",
        kategori: "",
        uraian: "",
        jumlah: "",
        nomorBukti: "",
      });
    }
    setShowTransaksiDialog(true);
  };

  const handleSaveTransaksi = async () => {
    // Validation
    if (!formTransaksi.kategori) {
      alert("Kategori harus diisi");
      return;
    }
    if (!formTransaksi.uraian) {
      alert("Uraian harus diisi");
      return;
    }
    if (!formTransaksi.jumlah || parseFloat(formTransaksi.jumlah) <= 0) {
      alert("Jumlah harus lebih dari 0");
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

      // Refetch data
      await fetchFinance();

      // Reset form
      setFormTransaksi({
        id: null,
        tanggal: new Date().toISOString().split("T")[0],
        jenis: "masuk",
        kategori: "",
        uraian: "",
        jumlah: "",
        nomorBukti: "",
      });
      setShowTransaksiDialog(false);
      alert(
        formTransaksi.id
          ? "Transaksi berhasil diupdate"
          : "Transaksi berhasil disimpan"
      );
    } catch (err) {
      console.error("Error saving transaksi:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSPPChange = (field: string, value: string) => {
    setFormSPP((prev) => ({
      ...prev,
      [field]: value,
      // Reset sub kegiatan when kegiatan changes
      ...(field === "kegiatan" ? { subKegiatan: "" } : {}),
    }));
  };

  const handleOpenSPPDialog = (mode: "create" | "edit", spp?: SPPItem) => {
    setSppMode(mode);
    if (mode === "edit" && spp) {
      setFormSPP({
        id: spp.id,
        nomorSPP: spp.nomor,
        tanggal: spp.tanggal,
        kegiatan: "", // Will be populated from real data
        subKegiatan: "", // Will be populated from real data
        uraian: spp.keperluan,
        jumlah: spp.jumlah.toString(),
        kodeRekening: "",
        keterangan: "",
      });
    } else {
      // Auto-generate nomor SPP
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const autoNomor = `SPP/${month}/${year}/001`;
      setFormSPP({
        id: null,
        nomorSPP: autoNomor,
        tanggal: new Date().toISOString().split("T")[0],
        kegiatan: "",
        subKegiatan: "",
        uraian: "",
        jumlah: "",
        kodeRekening: "",
        keterangan: "",
      });
    }
    setShowSPPDialog(true);
  };

  const handleSaveSPP = async () => {
    // Validation
    if (!formSPP.kegiatan) {
      alert("Kegiatan harus diisi");
      return;
    }
    if (!formSPP.uraian) {
      alert("Uraian/Keperluan harus diisi");
      return;
    }
    if (!formSPP.jumlah || parseFloat(formSPP.jumlah) <= 0) {
      alert("Jumlah harus lebih dari 0");
      return;
    }
    if (!formSPP.nomorSPP) {
      alert("Nomor SPP harus diisi");
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
          status: "pending", // SPP starts as pending
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal menyimpan SPP");
      }

      // Refetch data
      await fetchFinance();

      // Reset form
      setFormSPP({
        id: null,
        nomorSPP: "",
        tanggal: new Date().toISOString().split("T")[0],
        kegiatan: "",
        subKegiatan: "",
        uraian: "",
        jumlah: "",
        kodeRekening: "",
        keterangan: "",
      });
      setShowSPPDialog(false);
      alert("SPP berhasil diajukan");
    } catch (err) {
      console.error("Error saving SPP:", err);
      alert(err instanceof Error ? err.message : "Gagal menyimpan SPP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenConfirmDialog = (
    mode: "approve" | "reject",
    spp: SPPItem
  ) => {
    setConfirmMode(mode);
    setSelectedSPP(spp);
    setAlasanReject("");
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    // Validation
    if (!selectedSPP) return;

    if (confirmMode === "reject" && !alasanReject.trim()) {
      alert("Alasan penolakan harus diisi");
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

      // Refetch data
      await fetchFinance();

      setShowConfirmDialog(false);
      setShowDetailSPPDialog(false);
      setAlasanReject("");
    } catch (err) {
      console.error(`Error ${confirmMode} SPP:`, err);
      alert(`Gagal ${confirmMode} SPP`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Sistem Keuangan Desa</h1>
          <p className="text-muted-foreground mt-1">
            Pengelolaan APBDes, Kas Desa, dan Laporan Keuangan
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Laporan
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total APBDes</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatRupiahShort(apbdesData.totalPendapatan)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">
                      {persentaseRealisasiPendapatan.toFixed(1)}% Realisasi
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Realisasi Pendapatan
                  </p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatRupiahShort(apbdesData.realisasiPendapatan)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">
                      Masuk
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Realisasi Belanja
                  </p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatRupiahShort(apbdesData.realisasiBelanja)}
                  </p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowDownRight className="h-4 w-4 text-orange-600" />
                    <span className="text-sm text-orange-600 font-medium">
                      {persentaseRealisasiBelanja.toFixed(1)}% dari Anggaran
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Saldo Kas</p>
                  <p className="text-2xl font-semibold mt-1">
                    {formatRupiahShort(saldoKas)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Kas Umum Desa
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pendapatan">Pendapatan</TabsTrigger>
              <TabsTrigger value="belanja">Belanja</TabsTrigger>
              <TabsTrigger value="kas">Buku Kas</TabsTrigger>
              <TabsTrigger value="spp">SPP</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Trend Keuangan */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Trend Pendapatan & Belanja {selectedYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={trendKeuangan}>
                        <defs>
                          <linearGradient
                            id="colorPendapatan"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#0f766e"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#0f766e"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="colorBelanja"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f97316"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f97316"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="bulan" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          formatter={(value: number) =>
                            formatRupiah(Number(value))
                          }
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="pendapatan"
                          stroke="#0f766e"
                          fillOpacity={1}
                          fill="url(#colorPendapatan)"
                          strokeWidth={2}
                          name="Pendapatan"
                        />
                        <Area
                          type="monotone"
                          dataKey="belanja"
                          stroke="#f97316"
                          fillOpacity={1}
                          fill="url(#colorBelanja)"
                          strokeWidth={2}
                          name="Belanja"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Komposisi Belanja */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5 text-primary" />
                      Komposisi Belanja per Bidang
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={belanjaData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ persentase }) =>
                            `${persentase.toFixed(0)}%`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="anggaran"
                        >
                          {belanjaData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) =>
                            formatRupiah(Number(value))
                          }
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-2">
                      {belanjaData.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-sm"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="flex-1 text-muted-foreground">
                            {item.bidang}
                          </span>
                          <span className="font-medium">
                            {formatRupiahShort(item.anggaran)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Surplus/(Defisit)
                    </p>
                    <p className="text-2xl font-semibold mt-1">
                      {formatRupiahShort(sisaAnggaran)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Selisih Pendapatan - Belanja
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Sisa Anggaran Belanja
                    </p>
                    <p className="text-2xl font-semibold mt-1">
                      {formatRupiahShort(
                        apbdesData.totalBelanja - apbdesData.realisasiBelanja
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(
                        ((apbdesData.totalBelanja -
                          apbdesData.realisasiBelanja) /
                          apbdesData.totalBelanja) *
                        100
                      ).toFixed(1)}
                      % dari total anggaran
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Target Pendapatan
                    </p>
                    <p className="text-2xl font-semibold mt-1">
                      {formatRupiahShort(
                        apbdesData.totalPendapatan -
                          apbdesData.realisasiPendapatan
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Sisa target tahun ini
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pendapatan Tab */}
            <TabsContent value="pendapatan" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Pendapatan Desa {selectedYear}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Rincian sumber pendapatan dan realisasinya
                    </p>
                  </div>
                  <Button
                    className="gap-2"
                    onClick={() => setShowPendapatanDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Catat Pendapatan
                  </Button>
                </div>

                {pendapatanData.map((kategori, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {kategori.kategori}
                        </CardTitle>
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {kategori.persentase.toFixed(1)}%
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Summary */}
                      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Anggaran
                          </p>
                          <p className="font-semibold">
                            {formatRupiah(kategori.anggaran)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Realisasi
                          </p>
                          <p className="font-semibold text-primary">
                            {formatRupiah(kategori.realisasi)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Sisa</p>
                          <p className="font-semibold text-orange-600">
                            {formatRupiah(
                              kategori.anggaran - kategori.realisasi
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Realisasi Anggaran
                          </span>
                          <span className="font-medium">
                            {kategori.persentase.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${kategori.persentase}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>

                      {/* Sub Kategori */}
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3 font-medium text-sm">
                                Uraian
                              </th>
                              <th className="text-right p-3 font-medium text-sm">
                                Anggaran
                              </th>
                              <th className="text-right p-3 font-medium text-sm">
                                Realisasi
                              </th>
                              <th className="text-right p-3 font-medium text-sm">
                                %
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {kategori.subKategori.map((sub, idx) => (
                              <tr
                                key={idx}
                                className="border-t hover:bg-muted/50 transition-colors"
                              >
                                <td className="p-3 text-sm">{sub.nama}</td>
                                <td className="p-3 text-sm text-right">
                                  {formatRupiah(sub.anggaran)}
                                </td>
                                <td className="p-3 text-sm text-right font-medium text-primary">
                                  {formatRupiah(sub.realisasi)}
                                </td>
                                <td className="p-3 text-sm text-right">
                                  {(
                                    (sub.realisasi / sub.anggaran) *
                                    100
                                  ).toFixed(1)}
                                  %
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Belanja Tab */}
            <TabsContent value="belanja" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Belanja Desa {selectedYear}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Rincian belanja per bidang dan realisasinya
                    </p>
                  </div>
                  <Button
                    className="gap-2"
                    onClick={() => setShowBelanjaDialog(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Catat Belanja
                  </Button>
                </div>

                {/* Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Perbandingan Anggaran vs Realisasi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={belanjaData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="bidang"
                          stroke="#6b7280"
                          angle={-20}
                          textAnchor="end"
                          height={120}
                        />
                        <YAxis stroke="#6b7280" />
                        <Tooltip
                          formatter={(value: number) =>
                            formatRupiah(Number(value))
                          }
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          dataKey="anggaran"
                          fill="#94a3b8"
                          name="Anggaran"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="realisasi"
                          fill="#0f766e"
                          name="Realisasi"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Detailed List */}
                {belanjaData.map((bidang, index) => (
                  <Card key={index}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{bidang.bidang}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Realisasi: {bidang.persentase.toFixed(1)}%
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            setSelectedBelanja(bidang);
                            setShowDetailBelanjaDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          Detail
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            Anggaran
                          </p>
                          <p className="font-semibold mt-1">
                            {formatRupiah(bidang.anggaran)}
                          </p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">
                            Realisasi
                          </p>
                          <p className="font-semibold text-primary mt-1">
                            {formatRupiah(bidang.realisasi)}
                          </p>
                        </div>
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">Sisa</p>
                          <p className="font-semibold text-orange-600 mt-1">
                            {formatRupiah(bidang.anggaran - bidang.realisasi)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${bidang.persentase}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: bidang.color }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Buku Kas Tab */}
            <TabsContent value="kas" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Buku Kas Umum</h3>
                    <p className="text-sm text-muted-foreground">
                      Catatan transaksi kas desa
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari transaksi..."
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button
                      className="gap-2"
                      onClick={() => handleOpenTransaksiDialog("create")}
                    >
                      <Plus className="h-4 w-4" />
                      Catat Transaksi
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-muted-foreground">
                          Total Pemasukan
                        </p>
                      </div>
                      <p className="text-2xl font-semibold mt-2">
                        {formatRupiahShort(totalPemasukan)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                        <p className="text-sm text-muted-foreground">
                          Total Pengeluaran
                        </p>
                      </div>
                      <p className="text-2xl font-semibold mt-2">
                        {formatRupiahShort(totalPengeluaran)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <p className="text-sm text-muted-foreground">
                          Saldo Akhir
                        </p>
                      </div>
                      <p className="text-2xl font-semibold mt-2">
                        {formatRupiahShort(saldoKas)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Transactions Table */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-4 font-medium">
                              Tanggal
                            </th>
                            <th className="text-left p-4 font-medium">Kode</th>
                            <th className="text-left p-4 font-medium">
                              Uraian
                            </th>
                            <th className="text-right p-4 font-medium">
                              Pemasukan
                            </th>
                            <th className="text-right p-4 font-medium">
                              Pengeluaran
                            </th>
                            <th className="text-right p-4 font-medium">
                              Saldo
                            </th>
                            <th className="text-center p-4 font-medium">
                              Status
                            </th>
                            <th className="text-center p-4 font-medium">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transaksiKas.map((transaksi) => (
                            <tr
                              key={transaksi.id}
                              className="border-t hover:bg-muted/50 transition-colors"
                            >
                              <td className="p-4 text-sm">
                                {new Date(transaksi.tanggal).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </td>
                              <td className="p-4 text-sm font-mono">
                                {transaksi.kode}
                              </td>
                              <td className="p-4 text-sm">
                                {transaksi.uraian}
                              </td>
                              <td className="p-4 text-sm text-right">
                                {transaksi.jenis === "masuk" ? (
                                  <span className="text-green-600 font-medium">
                                    {formatRupiah(transaksi.jumlah)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="p-4 text-sm text-right">
                                {transaksi.jenis === "keluar" ? (
                                  <span className="text-red-600 font-medium">
                                    {formatRupiah(transaksi.jumlah)}
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="p-4 text-sm text-right font-medium">
                                {formatRupiah(transaksi.saldo)}
                              </td>
                              <td className="p-4 text-center">
                                {transaksi.status === "verified" ? (
                                  <Badge variant="default" className="gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    Pending
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTransaksi(transaksi);
                                      setShowDetailTransaksiDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleOpenTransaksiDialog(
                                        "edit",
                                        transaksi
                                      )
                                    }
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* SPP Tab */}
            <TabsContent value="spp" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Surat Permintaan Pembayaran (SPP)
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Kelola pengajuan dan persetujuan SPP
                    </p>
                  </div>
                  <Button
                    className="gap-2"
                    onClick={() => handleOpenSPPDialog("create")}
                  >
                    <Plus className="h-4 w-4" />
                    Buat SPP Baru
                  </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-muted-foreground">
                          Disetujui
                        </p>
                      </div>
                      <p className="text-2xl font-semibold mt-2">
                        {sppData.filter((s) => s.status === "approved").length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <p className="text-sm text-muted-foreground">
                          Menunggu
                        </p>
                      </div>
                      <p className="text-2xl font-semibold mt-2">
                        {sppData.filter((s) => s.status === "pending").length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <p className="text-sm text-muted-foreground">Ditolak</p>
                      </div>
                      <p className="text-2xl font-semibold mt-2">
                        {sppData.filter((s) => s.status === "rejected").length}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* SPP List */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-4 font-medium">
                              Nomor SPP
                            </th>
                            <th className="text-left p-4 font-medium">
                              Tanggal
                            </th>
                            <th className="text-left p-4 font-medium">
                              Keperluan
                            </th>
                            <th className="text-left p-4 font-medium">
                              Bidang
                            </th>
                            <th className="text-right p-4 font-medium">
                              Jumlah
                            </th>
                            <th className="text-left p-4 font-medium">
                              Pengaju
                            </th>
                            <th className="text-center p-4 font-medium">
                              Status
                            </th>
                            <th className="text-center p-4 font-medium">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sppData.map((spp) => (
                            <tr
                              key={spp.id}
                              className="border-t hover:bg-muted/50 transition-colors"
                            >
                              <td className="p-4 text-sm font-mono">
                                {spp.nomor}
                              </td>
                              <td className="p-4 text-sm">
                                {new Date(spp.tanggal).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  }
                                )}
                              </td>
                              <td className="p-4 text-sm max-w-xs">
                                {spp.keperluan}
                              </td>
                              <td className="p-4 text-sm text-muted-foreground">
                                {spp.bidang}
                              </td>
                              <td className="p-4 text-sm text-right font-medium">
                                {formatRupiah(spp.jumlah)}
                              </td>
                              <td className="p-4 text-sm">{spp.pengaju}</td>
                              <td className="p-4 text-center">
                                {spp.status === "approved" && (
                                  <Badge
                                    variant="default"
                                    className="gap-1 bg-green-600"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                    Disetujui
                                  </Badge>
                                )}
                                {spp.status === "pending" && (
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock className="h-3 w-3" />
                                    Menunggu
                                  </Badge>
                                )}
                                {spp.status === "rejected" && (
                                  <Badge
                                    variant="destructive"
                                    className="gap-1"
                                  >
                                    <XCircle className="h-3 w-3" />
                                    Ditolak
                                  </Badge>
                                )}
                              </td>
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedSPP(spp);
                                      setShowDetailSPPDialog(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {spp.status === "pending" && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600"
                                        onClick={() =>
                                          handleOpenConfirmDialog(
                                            "approve",
                                            spp
                                          )
                                        }
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600"
                                        onClick={() =>
                                          handleOpenConfirmDialog("reject", spp)
                                        }
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* SPP Form Dialog (Create/Edit) */}
      <Dialog open={showSPPDialog} onOpenChange={setShowSPPDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {sppMode === "create" ? "Buat SPP Baru" : "Edit SPP"}
            </DialogTitle>
            <DialogDescription>
              Formulir Surat Permintaan Pembayaran sesuai standar SISKEUDES
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nomor SPP</p>
                <Input
                  value={formSPP.nomorSPP}
                  onChange={(e) => handleSPPChange("nomorSPP", e.target.value)}
                  className="mt-1"
                  placeholder="SPP/MM/YYYY/XXX"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tanggal SPP</p>
                <Input
                  type="date"
                  value={formSPP.tanggal}
                  onChange={(e) => handleSPPChange("tanggal", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Bidang Kegiatan</p>
              <Select
                value={formSPP.kegiatan}
                onValueChange={(value) => handleSPPChange("kegiatan", value)}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih bidang kegiatan..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(subKegiatanOptions).map((kegiatan) => (
                    <SelectItem key={kegiatan} value={kegiatan}>
                      {kegiatan}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formSPP.kegiatan && (
              <div>
                <p className="text-sm text-muted-foreground">Sub Kegiatan</p>
                <Select
                  value={formSPP.subKegiatan}
                  onValueChange={(value) =>
                    handleSPPChange("subKegiatan", value)
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Pilih sub kegiatan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subKegiatanOptions[formSPP.kegiatan]?.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <p className="text-sm text-muted-foreground">
                Uraian Kegiatan/Keperluan
              </p>
              <Textarea
                value={formSPP.uraian}
                onChange={(e) => handleSPPChange("uraian", e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Deskripsi detail kegiatan dan keperluan pembayaran..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Kode Rekening</p>
                <Input
                  value={formSPP.kodeRekening}
                  onChange={(e) =>
                    handleSPPChange("kodeRekening", e.target.value)
                  }
                  className="mt-1"
                  placeholder="X.XX.XX"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: Kode rekening belanja
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Jumlah yang Diminta (Rp)
                </p>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="number"
                    value={formSPP.jumlah}
                    onChange={(e) => handleSPPChange("jumlah", e.target.value)}
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
                {formSPP.jumlah && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRupiah(Number(formSPP.jumlah))}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Keterangan Tambahan (Opsional)
              </p>
              <Textarea
                value={formSPP.keterangan}
                onChange={(e) => handleSPPChange("keterangan", e.target.value)}
                className="mt-1"
                rows={2}
                placeholder="Catatan atau informasi tambahan..."
              />
            </div>

            {/* Preview Card */}
            <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-l-primary">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Pengajuan SPP
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formSPP.kegiatan || "Pilih bidang kegiatan"}
                    {formSPP.subKegiatan && ` - ${formSPP.subKegiatan}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {formSPP.jumlah
                      ? formatRupiah(Number(formSPP.jumlah))
                      : "Rp 0"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formSPP.nomorSPP || "Nomor SPP"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="flex-1 gap-2"
                onClick={handleSaveSPP}
                disabled={
                  !formSPP.kegiatan ||
                  !formSPP.subKegiatan ||
                  !formSPP.uraian ||
                  !formSPP.jumlah ||
                  !formSPP.kodeRekening
                }
              >
                <CheckCircle className="h-4 w-4" />
                {sppMode === "create" ? "Simpan SPP" : "Update SPP"}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setShowSPPDialog(false)}
              >
                <XCircle className="h-4 w-4" />
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SPP Detail/Review Dialog */}
      <Dialog open={showDetailSPPDialog} onOpenChange={setShowDetailSPPDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review Surat Permintaan Pembayaran</DialogTitle>
            <DialogDescription>
              Detail lengkap pengajuan SPP untuk proses verifikasi
            </DialogDescription>
          </DialogHeader>

          {selectedSPP && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Header Card */}
              <Card
                className={`border-l-4 ${
                  selectedSPP.status === "approved"
                    ? "border-l-green-500 bg-green-50"
                    : selectedSPP.status === "rejected"
                    ? "border-l-red-500 bg-red-50"
                    : "border-l-yellow-500 bg-yellow-50"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">
                        {selectedSPP.nomor}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedSPP.keperluan}
                      </p>
                      <p className="text-3xl font-bold text-primary mt-3">
                        {formatRupiah(selectedSPP.jumlah)}
                      </p>
                    </div>
                    <div className="text-right">
                      {selectedSPP.status === "approved" && (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Disetujui
                        </Badge>
                      )}
                      {selectedSPP.status === "pending" && (
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-yellow-600"
                        >
                          <Clock className="h-3 w-3" />
                          Menunggu Persetujuan
                        </Badge>
                      )}
                      {selectedSPP.status === "rejected" && (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Ditolak
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(selectedSPP.tanggal).toLocaleDateString(
                          "id-ID",
                          {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          }
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Pengaju</p>
                    </div>
                    <p className="font-semibold">{selectedSPP.pengaju}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Tanggal Pengajuan
                      </p>
                    </div>
                    <p className="font-semibold">
                      {new Date(selectedSPP.tanggal).toLocaleDateString(
                        "id-ID",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Bidang Kegiatan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    Bidang Kegiatan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{selectedSPP.bidang}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kode Rekening: 5.1.2.01
                  </p>
                </CardContent>
              </Card>

              {/* Keperluan/Uraian */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Uraian Keperluan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {selectedSPP.keperluan}
                  </p>
                </CardContent>
              </Card>

              {/* Rincian Anggaran */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Rincian Anggaran
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Jumlah yang Diajukan</span>
                      <span className="font-semibold text-primary">
                        {formatRupiah(selectedSPP.jumlah)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm">Sisa Anggaran Kegiatan</span>
                      <span className="font-semibold">
                        {formatRupiah(
                          (() => {
                            const item = belanjaData.find(
                              (b) => b.bidang === selectedSPP.bidang
                            );
                            const sisa =
                              (item?.anggaran || 0) - (item?.realisasi || 0);
                            return sisa > 0 ? sisa : 0;
                          })()
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline/History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Riwayat Proses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedSPP.status === "approved" && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">SPP Disetujui</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(selectedSPP.tanggal).toLocaleDateString(
                                "id-ID"
                              )}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Disetujui oleh Kepala Desa
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedSPP.status === "rejected" && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-600 mt-2" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">SPP Ditolak</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(selectedSPP.tanggal).toLocaleDateString(
                                "id-ID"
                              )}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Alasan: Dokumen pendukung belum lengkap
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">SPP Diajukan</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(selectedSPP.tanggal).toLocaleDateString(
                              "id-ID"
                            )}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Diajukan oleh {selectedSPP.pengaju}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {selectedSPP.status === "pending" && (
                  <>
                    <Button
                      className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleOpenConfirmDialog("approve", selectedSPP)
                      }
                    >
                      <CheckCircle className="h-4 w-4" />
                      Setujui SPP
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      onClick={() =>
                        handleOpenConfirmDialog("reject", selectedSPP)
                      }
                    >
                      <XCircle className="h-4 w-4" />
                      Tolak SPP
                    </Button>
                  </>
                )}
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Cetak SPP
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowDetailSPPDialog(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog (Approve/Reject) */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmMode === "approve" ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Konfirmasi Persetujuan SPP
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Konfirmasi Penolakan SPP
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {confirmMode === "approve"
                ? "Anda akan menyetujui SPP ini. Pastikan semua informasi telah diverifikasi."
                : "Anda akan menolak SPP ini. Berikan alasan penolakan untuk pengaju."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedSPP && (
              <Card className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">Nomor SPP</p>
                  <p className="font-semibold">{selectedSPP.nomor}</p>
                  <p className="text-sm text-muted-foreground mt-2">Jumlah</p>
                  <p className="text-lg font-bold text-primary">
                    {formatRupiah(selectedSPP.jumlah)}
                  </p>
                </CardContent>
              </Card>
            )}

            {confirmMode === "reject" && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Alasan Penolakan *
                </p>
                <Textarea
                  value={alasanReject}
                  onChange={(e) => setAlasanReject(e.target.value)}
                  rows={4}
                  placeholder="Jelaskan alasan penolakan SPP ini..."
                  className="resize-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              {confirmMode === "approve" ? (
                <Button
                  className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmAction}
                >
                  <CheckCircle className="h-4 w-4" />
                  Ya, Setujui
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={handleConfirmAction}
                  disabled={!alasanReject.trim()}
                >
                  <XCircle className="h-4 w-4" />
                  Ya, Tolak
                </Button>
              )}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowConfirmDialog(false)}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pendapatan Dialog */}
      <Dialog
        open={showPendapatanDialog}
        onOpenChange={setShowPendapatanDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Catat Pendapatan</DialogTitle>
            <DialogDescription>
              Formulir untuk mencatat pendapatan baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tanggal</p>
                <Input
                  type="date"
                  value={formPendapatan.tanggal}
                  onChange={(e) =>
                    handlePendapatanChange("tanggal", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kategori</p>
                <Select
                  value={formPendapatan.kategori}
                  onValueChange={(value) =>
                    handlePendapatanChange("kategori", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PADes">
                      Pendapatan Asli Desa (PADes)
                    </SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                    <SelectItem value="Lain-lain">
                      Pendapatan Lain-lain
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sub Kategori</p>
                <Select
                  value={formPendapatan.subKategori}
                  onValueChange={(value) =>
                    handlePendapatanChange("subKategori", value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subKategoriOptions[formPendapatan.kategori]?.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uraian</p>
                <Input
                  value={formPendapatan.uraian}
                  onChange={(e) =>
                    handlePendapatanChange("uraian", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jumlah</p>
                <Input
                  type="number"
                  value={formPendapatan.jumlah}
                  onChange={(e) =>
                    handlePendapatanChange("jumlah", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nomor Bukti</p>
                <Input
                  value={formPendapatan.nomorBukti}
                  onChange={(e) =>
                    handlePendapatanChange("nomorBukti", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleSavePendapatan}
                disabled={
                  isSubmitting ||
                  !formPendapatan.kategori ||
                  !formPendapatan.uraian ||
                  !formPendapatan.jumlah
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => setShowPendapatanDialog(false)}
              >
                <XCircle className="h-4 w-4" />
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Belanja Dialog */}
      <Dialog open={showBelanjaDialog} onOpenChange={setShowBelanjaDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Catat Belanja</DialogTitle>
            <DialogDescription>
              Formulir untuk mencatat belanja desa baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tanggal</p>
                <Input
                  type="date"
                  value={formBelanja.tanggal}
                  onChange={(e) =>
                    handleBelanjaChange("tanggal", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bidang Belanja</p>
                <Select
                  value={formBelanja.bidang}
                  onValueChange={(value) =>
                    handleBelanjaChange("bidang", value)
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="Pilih bidang..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Penyelenggaraan Pemerintahan Desa">
                      Penyelenggaraan Pemerintahan Desa
                    </SelectItem>
                    <SelectItem value="Pelaksanaan Pembangunan Desa">
                      Pelaksanaan Pembangunan Desa
                    </SelectItem>
                    <SelectItem value="Pembinaan Kemasyarakatan">
                      Pembinaan Kemasyarakatan
                    </SelectItem>
                    <SelectItem value="Pemberdayaan Masyarakat">
                      Pemberdayaan Masyarakat
                    </SelectItem>
                    <SelectItem value="Penanggulangan Bencana & Darurat">
                      Penanggulangan Bencana & Darurat
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Sub Kegiatan</p>
              <Select
                value={formBelanja.subKegiatan}
                onValueChange={(value) =>
                  handleBelanjaChange("subKegiatan", value)
                }
                disabled={!formBelanja.bidang}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih sub kegiatan..." />
                </SelectTrigger>
                <SelectContent>
                  {subKegiatanOptions[formBelanja.bidang]?.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Keterangan</p>
              <Textarea
                value={formBelanja.keterangan}
                onChange={(e) =>
                  handleBelanjaChange("keterangan", e.target.value)
                }
                className="mt-1"
                rows={3}
                placeholder="Keterangan detail belanja..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Jumlah (Rupiah)</p>
                <Input
                  type="number"
                  value={formBelanja.jumlah}
                  onChange={(e) =>
                    handleBelanjaChange("jumlah", e.target.value)
                  }
                  className="mt-1"
                  placeholder="0"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Nomor Bukti/Kwitansi
                </p>
                <Input
                  value={formBelanja.nomorBukti}
                  onChange={(e) =>
                    handleBelanjaChange("nomorBukti", e.target.value)
                  }
                  className="mt-1"
                  placeholder="No. Kwitansi"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleSaveBelanja}
                disabled={
                  isSubmitting ||
                  !formBelanja.bidang ||
                  !formBelanja.keterangan ||
                  !formBelanja.jumlah
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => setShowBelanjaDialog(false)}
              >
                <XCircle className="h-4 w-4" />
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Belanja Dialog */}
      <Dialog
        open={showDetailBelanjaDialog}
        onOpenChange={setShowDetailBelanjaDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detail Belanja - {selectedBelanja?.bidang}
            </DialogTitle>
            <DialogDescription>
              Informasi lengkap anggaran dan realisasi belanja
            </DialogDescription>
          </DialogHeader>

          {selectedBelanja && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Total Anggaran
                    </p>
                    <p className="text-2xl font-semibold mt-2">
                      {formatRupiah(selectedBelanja.anggaran)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Realisasi</p>
                    <p className="text-2xl font-semibold mt-2 text-primary">
                      {formatRupiah(selectedBelanja.realisasi)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedBelanja.persentase.toFixed(1)}% dari anggaran
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Sisa Anggaran
                    </p>
                    <p className="text-2xl font-semibold mt-2 text-orange-600">
                      {formatRupiah(
                        selectedBelanja.anggaran - selectedBelanja.realisasi
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(100 - selectedBelanja.persentase).toFixed(1)}% belum
                      terpakai
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Progress Realisasi
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {selectedBelanja.persentase.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedBelanja.persentase}%` }}
                    transition={{ duration: 1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: selectedBelanja.color }}
                  />
                </div>
              </div>

              {/* Rincian Kegiatan */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Rincian Kegiatan & Program
                </h4>
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium text-sm">
                            No
                          </th>
                          <th className="text-left p-3 font-medium text-sm">
                            Kegiatan
                          </th>
                          <th className="text-right p-3 font-medium text-sm">
                            Anggaran
                          </th>
                          <th className="text-right p-3 font-medium text-sm">
                            Realisasi
                          </th>
                          <th className="text-right p-3 font-medium text-sm">
                            %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedBelanja?.subItems ?? []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="p-4 text-center text-sm text-muted-foreground"
                            >
                              Belum ada data rincian kegiatan.
                            </td>
                          </tr>
                        ) : (
                          (selectedBelanja?.subItems ?? []).map(
                            (kegiatan, idx: number) => (
                              <tr
                                key={idx}
                                className="border-t hover:bg-muted/50 transition-colors"
                              >
                                <td className="p-3 text-sm">{idx + 1}</td>
                                <td className="p-3 text-sm">{kegiatan.nama}</td>
                                <td className="p-3 text-sm text-right">
                                  {formatRupiah(kegiatan.anggaran)}
                                </td>
                                <td className="p-3 text-sm text-right font-medium text-primary">
                                  {formatRupiah(kegiatan.realisasi)}
                                </td>
                                <td className="p-3 text-sm text-right">
                                  <Badge variant="outline">
                                    {kegiatan.persentase.toFixed(1)}%
                                  </Badge>
                                </td>
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Riwayat Transaksi */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Riwayat Transaksi Belanja
                </h4>
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3 font-medium text-sm">
                            Tanggal
                          </th>
                          <th className="text-left p-3 font-medium text-sm">
                            Keterangan
                          </th>
                          <th className="text-right p-3 font-medium text-sm">
                            Jumlah
                          </th>
                          <th className="text-center p-3 font-medium text-sm">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          {
                            tanggal: "2024-12-15",
                            keterangan: "Pembayaran Honorarium Bulanan",
                            jumlah: 25000000,
                            status: "verified",
                          },
                          {
                            tanggal: "2024-12-10",
                            keterangan: "Pengadaan ATK",
                            jumlah: 5000000,
                            status: "verified",
                          },
                          {
                            tanggal: "2024-12-05",
                            keterangan: "Biaya Operasional Kantor",
                            jumlah: 8000000,
                            status: "verified",
                          },
                          {
                            tanggal: "2024-11-28",
                            keterangan: "Pemeliharaan Gedung",
                            jumlah: 15000000,
                            status: "verified",
                          },
                          {
                            tanggal: "2024-11-20",
                            keterangan: "Belanja Modal",
                            jumlah: 45000000,
                            status: "verified",
                          },
                        ].map((transaksi, idx) => (
                          <tr
                            key={idx}
                            className="border-t hover:bg-muted/50 transition-colors"
                          >
                            <td className="p-3 text-sm">
                              {new Date(transaksi.tanggal).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {transaksi.keterangan}
                            </td>
                            <td className="p-3 text-sm text-right font-medium">
                              {formatRupiah(transaksi.jumlah)}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Export Detail
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => setShowDetailBelanjaDialog(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaksi Kas Dialog (Create/Edit) */}
      <Dialog open={showTransaksiDialog} onOpenChange={setShowTransaksiDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {transaksiMode === "create"
                ? "Catat Transaksi Baru"
                : "Edit Transaksi"}
            </DialogTitle>
            <DialogDescription>
              Formulir untuk{" "}
              {transaksiMode === "create" ? "mencatat" : "mengedit"} transaksi
              kas desa
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Tanggal Transaksi
                </p>
                <Input
                  type="date"
                  value={formTransaksi.tanggal}
                  onChange={(e) =>
                    handleTransaksiChange("tanggal", e.target.value)
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Jenis Transaksi</p>
                <Select
                  value={formTransaksi.jenis}
                  onValueChange={(value) =>
                    handleTransaksiChange("jenis", value)
                  }
                >
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masuk">
                      <div className="flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                        Pemasukan (Kas Masuk)
                      </div>
                    </SelectItem>
                    <SelectItem value="keluar">
                      <div className="flex items-center gap-2">
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                        Pengeluaran (Kas Keluar)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Kategori{" "}
                {formTransaksi.jenis === "masuk" ? "Penerimaan" : "Pengeluaran"}
              </p>
              <Select
                value={formTransaksi.kategori}
                onValueChange={(value) =>
                  handleTransaksiChange("kategori", value)
                }
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Pilih kategori..." />
                </SelectTrigger>
                <SelectContent>
                  {(formTransaksi.jenis === "masuk"
                    ? kategoriTransaksiMasuk
                    : kategoriTransaksiKeluar
                  ).map((kategori) => (
                    <SelectItem key={kategori} value={kategori}>
                      {kategori}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Uraian/Keterangan</p>
              <Textarea
                value={formTransaksi.uraian}
                onChange={(e) =>
                  handleTransaksiChange("uraian", e.target.value)
                }
                className="mt-1"
                rows={3}
                placeholder="Deskripsi detail transaksi..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Jumlah (Rupiah)</p>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    type="number"
                    value={formTransaksi.jumlah}
                    onChange={(e) =>
                      handleTransaksiChange("jumlah", e.target.value)
                    }
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
                {formTransaksi.jumlah && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRupiah(Number(formTransaksi.jumlah))}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nomor Bukti</p>
                <Input
                  value={formTransaksi.nomorBukti}
                  onChange={(e) =>
                    handleTransaksiChange("nomorBukti", e.target.value)
                  }
                  className="mt-1"
                  placeholder="BKU-2024-xxxx"
                />
              </div>
            </div>

            {/* Preview */}
            <div
              className={`p-4 rounded-lg border-l-4 ${
                formTransaksi.jenis === "masuk"
                  ? "bg-green-50 border-l-green-500"
                  : "bg-red-50 border-l-red-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {formTransaksi.jenis === "masuk"
                      ? "Pemasukan"
                      : "Pengeluaran"}{" "}
                    Kas
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formTransaksi.kategori || "Pilih kategori"}
                  </p>
                </div>
                <div
                  className={`text-xl font-semibold ${
                    formTransaksi.jenis === "masuk"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formTransaksi.jumlah
                    ? formatRupiah(Number(formTransaksi.jumlah))
                    : "Rp 0"}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={handleSaveTransaksi}
                disabled={
                  !formTransaksi.kategori ||
                  !formTransaksi.uraian ||
                  !formTransaksi.jumlah
                }
              >
                <CheckCircle className="h-4 w-4" />
                {transaksiMode === "create"
                  ? "Simpan Transaksi"
                  : "Update Transaksi"}
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => setShowTransaksiDialog(false)}
              >
                <XCircle className="h-4 w-4" />
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Transaksi Dialog */}
      <Dialog
        open={showDetailTransaksiDialog}
        onOpenChange={setShowDetailTransaksiDialog}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detail Transaksi Kas</DialogTitle>
            <DialogDescription>
              Informasi lengkap transaksi kas desa
            </DialogDescription>
          </DialogHeader>

          {selectedTransaksi && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              {/* Header Card */}
              <Card
                className={`border-l-4 ${
                  selectedTransaksi.jenis === "masuk"
                    ? "border-l-green-500 bg-green-50"
                    : "border-l-red-500 bg-red-50"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {selectedTransaksi.jenis === "masuk" ? (
                          <ArrowUpRight className="h-6 w-6 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-6 w-6 text-red-600" />
                        )}
                        <h3 className="text-xl font-semibold">
                          {selectedTransaksi.jenis === "masuk"
                            ? "Pemasukan Kas"
                            : "Pengeluaran Kas"}
                        </h3>
                      </div>
                      <p
                        className="text-3xl font-bold mt-2"
                        style={{
                          color:
                            selectedTransaksi.jenis === "masuk"
                              ? "#16a34a"
                              : "#dc2626",
                        }}
                      >
                        {formatRupiah(selectedTransaksi.jumlah)}
                      </p>
                    </div>
                    <div className="text-right">
                      {selectedTransaksi.status === "verified" ? (
                        <Badge variant="default" className="gap-1 bg-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedTransaksi.kode}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Tanggal Transaksi
                      </p>
                    </div>
                    <p className="font-semibold">
                      {new Date(selectedTransaksi.tanggal).toLocaleDateString(
                        "id-ID",
                        {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Nomor Bukti
                      </p>
                    </div>
                    <p className="font-semibold font-mono">
                      {selectedTransaksi.kode}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Uraian */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Uraian Transaksi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {selectedTransaksi.uraian}
                  </p>
                </CardContent>
              </Card>

              {/* Saldo Information */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Saldo Sebelum
                    </p>
                    <p className="text-xl font-semibold mt-2">
                      {formatRupiah(
                        selectedTransaksi.saldo -
                          (selectedTransaksi.jenis === "masuk"
                            ? selectedTransaksi.jumlah
                            : -selectedTransaksi.jumlah)
                      )}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">
                      Saldo Sesudah
                    </p>
                    <p className="text-xl font-semibold mt-2 text-primary">
                      {formatRupiah(selectedTransaksi.saldo)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Riwayat Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-600 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            Transaksi Diverifikasi
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              selectedTransaksi.tanggal
                            ).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Transaksi telah diverifikasi oleh Bendahara Desa
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            Transaksi Dicatat
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(
                              selectedTransaksi.tanggal
                            ).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Transaksi berhasil dicatat dalam Buku Kas Umum
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    setShowDetailTransaksiDialog(false);
                    handleOpenTransaksiDialog("edit", selectedTransaksi);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit Transaksi
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Download className="h-4 w-4" />
                  Cetak Bukti
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => setShowDetailTransaksiDialog(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Keuangan;

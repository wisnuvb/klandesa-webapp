"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Clock,
  Loader,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  Play,
  Check,
  X,
  Send,
  Users,
  Calendar,
  Tag,
  Globe,
  Lock,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

// Types
type ReportStatus = "DRAFT" | "PENDING" | "PROCESS" | "DONE" | "REJECT";
type ReportType = "PEMDES" | "BPD" | "KADUS" | "RT" | "RW" | "WARGA";
type IsPublic = "Y" | "N";

interface CitizenReport {
  id: number;
  village_id?: number;
  report_type: ReportType;
  title: string;
  images: string | null;
  content: string;
  status: ReportStatus;
  is_public: IsPublic;
  done_by: number | null;
  reporter_name: string;
  reporter_nik: string | null;
  responses_count: number;
  created_at: string;
  updated_at: string;
}

interface ReportResponse {
  id: number;
  response: string;
  images: string | null;
  responder_name: string;
  responder_role: string;
  created_at: string;
}


export default function PengaduanMasyarakat() {
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "ALL">("ALL");
  const [filterType, setFilterType] = useState<ReportType | "ALL">("ALL");
  const [filterPublic, setFilterPublic] = useState<IsPublic | "ALL">("ALL");

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"PROCESS" | "DONE" | "REJECT" | null>(null);

  // Responses per report (lazy loaded)
  const [responsesMap, setResponsesMap] = useState<Record<number, ReportResponse[]>>({});
  const [isLoadingResponses, setIsLoadingResponses] = useState(false);

  // Form states
  const [responseText, setResponseText] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterType !== "ALL") params.set("reportType", filterType);
      if (filterPublic !== "ALL") params.set("isPublic", filterPublic);

      const res = await fetch(`/api/citizen-reports?${params}`);
      if (!res.ok) throw new Error("Gagal memuat data laporan");
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterType, filterPublic]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const fetchResponses = useCallback(
    async (reportId: number) => {
      if (responsesMap[reportId]) return;
      setIsLoadingResponses(true);
      try {
        const res = await fetch(`/api/citizen-reports/${reportId}`);
        if (!res.ok) throw new Error("Gagal memuat tanggapan");
        const data = await res.json();
        setResponsesMap((prev) => ({ ...prev, [reportId]: data.responses ?? [] }));
      } catch {
        setResponsesMap((prev) => ({ ...prev, [reportId]: [] }));
      } finally {
        setIsLoadingResponses(false);
      }
    },
    [responsesMap],
  );

  // ─── Stats ───────────────────────────────────────────────────────────────

  const stats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === "PENDING").length,
    process: reports.filter((r) => r.status === "PROCESS").length,
    done: reports.filter((r) => r.status === "DONE").length,
  };

  // ─── Client-side Search Filter ───────────────────────────────────────────

  const filteredReports = reports.filter((report) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      report.title.toLowerCase().includes(q) ||
      report.content.toLowerCase().includes(q) ||
      report.reporter_name.toLowerCase().includes(q)
    );
  });

  // ─── Badges ──────────────────────────────────────────────────────────────

  const getStatusBadge = (status: ReportStatus) => {
    const badges: Record<
      ReportStatus,
      { bg: string; text: string; label: string; icon: React.ElementType }
    > = {
      DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft", icon: Clock },
      PENDING: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Menunggu", icon: Clock },
      PROCESS: { bg: "bg-blue-100", text: "text-blue-700", label: "Diproses", icon: Loader },
      DONE: { bg: "bg-green-100", text: "text-green-700", label: "Selesai", icon: CheckCircle },
      REJECT: { bg: "bg-red-100", text: "text-red-700", label: "Ditolak", icon: XCircle },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${badge.bg} ${badge.text}`}
      >
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: ReportType) => {
    const badges: Record<ReportType, { bg: string; text: string; label: string }> = {
      PEMDES: { bg: "bg-teal-100", text: "text-teal-700", label: "Pemdes" },
      BPD: { bg: "bg-purple-100", text: "text-purple-700", label: "BPD" },
      KADUS: { bg: "bg-orange-100", text: "text-orange-700", label: "Kadus" },
      RT: { bg: "bg-cyan-100", text: "text-cyan-700", label: "RT" },
      RW: { bg: "bg-indigo-100", text: "text-indigo-700", label: "RW" },
      WARGA: { bg: "bg-pink-100", text: "text-pink-700", label: "Warga" },
    };
    const badge = badges[type];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${badge.bg} ${badge.text}`}
      >
        <Tag className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleViewDetail = (report: CitizenReport) => {
    setSelectedReport(report);
    setShowDetailModal(true);
    fetchResponses(report.id);
  };

  const handleAction = (action: "PROCESS" | "DONE" | "REJECT", report: CitizenReport) => {
    setSelectedReport(report);
    setConfirmAction(action);
    setRejectReason("");
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedReport || !confirmAction) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { status: confirmAction };
      if (confirmAction === "REJECT" && rejectReason.trim()) body.reason = rejectReason.trim();

      const res = await fetch(`/api/citizen-reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui status laporan");
      }

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? { ...r, status: confirmAction, updated_at: new Date().toISOString() }
            : r,
        ),
      );

      if (confirmAction === "REJECT" && rejectReason.trim()) {
        setResponsesMap((prev) => ({
          ...prev,
          [selectedReport.id]: [
            ...(prev[selectedReport.id] ?? []),
            {
              id: Date.now(),
              response: rejectReason.trim(),
              images: null,
              responder_name: "Admin",
              responder_role: "Admin Desa",
              created_at: new Date().toISOString(),
            },
          ],
        }));
      }

      setShowConfirmDialog(false);
      setShowDetailModal(false);
      setConfirmAction(null);
      setRejectReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddResponse = async () => {
    if (!selectedReport || !responseText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/citizen-reports/${selectedReport.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengirim tanggapan");
      }
      const newResponse: ReportResponse = await res.json();

      setResponsesMap((prev) => ({
        ...prev,
        [selectedReport.id]: [...(prev[selectedReport.id] ?? []), newResponse],
      }));

      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id ? { ...r, responses_count: r.responses_count + 1 } : r,
        ),
      );

      setResponseText("");
      setShowResponseModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateStr));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Laporan", value: stats.total, color: "teal", icon: MessageSquare },
          { label: "Menunggu", value: stats.pending, color: "yellow", icon: Clock },
          { label: "Diproses", value: stats.process, color: "blue", icon: Loader },
          { label: "Selesai", value: stats.done, color: "green", icon: CheckCircle },
        ].map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{card.label}</p>
                  <p
                    className={`text-3xl font-semibold mt-2 ${card.color === "teal" ? "text-gray-900" : `text-${card.color}-600`}`}
                  >
                    {isLoading ? "—" : card.value}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 bg-${card.color}-100 rounded-lg flex items-center justify-center`}
                >
                  <Icon className={`w-6 h-6 text-${card.color}-600`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Filters & Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari laporan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Filter Status */}
          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as ReportStatus | "ALL")
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="PROCESS">Diproses</option>
              <option value="DONE">Selesai</option>
              <option value="REJECT">Ditolak</option>
              <option value="DRAFT">Draft</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter Type */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as ReportType | "ALL")
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="PEMDES">Pemdes</option>
              <option value="BPD">BPD</option>
              <option value="KADUS">Kadus</option>
              <option value="RT">RT</option>
              <option value="RW">RW</option>
              <option value="WARGA">Warga</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          {/* Filter Public */}
          <div className="relative">
            <select
              value={filterPublic}
              onChange={(e) =>
                setFilterPublic(e.target.value as IsPublic | "ALL")
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="ALL">Semua Visibilitas</option>
              <option value="Y">Publik</option>
              <option value="N">Privat</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </motion.div>

      {/* Reports Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-red-500 gap-2">
            <AlertCircle className="w-10 h-10" />
            <p>{error}</p>
            <button onClick={fetchReports} className="text-sm text-teal-600 hover:underline mt-1">
              Coba lagi
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader className="w-6 h-6 animate-spin" />
            <span>Memuat data...</span>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pelapor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Judul Laporan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visibilitas
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <AnimatePresence mode="popLayout">
                {filteredReports.map((report, index) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(report.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <div className="font-medium text-gray-900">
                          {report.reporter_name}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {report.reporter_nik}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="max-w-xs">
                        <div className="font-medium text-gray-900 truncate">
                          {report.title}
                        </div>
                        <div className="text-gray-500 text-xs truncate">
                          {report.content}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getTypeBadge(report.report_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {report.is_public === "Y" ? (
                        <span className="inline-flex items-center gap-1 text-teal-600">
                          <Globe className="w-4 h-4" />
                          <span className="text-xs">Publik</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Lock className="w-4 h-4" />
                          <span className="text-xs">Privat</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetail(report)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">Detail</span>
                        </button>
                        {report.status === "PENDING" && (
                          <button
                            onClick={() => handleAction("PROCESS", report)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                            <span className="text-xs">Proses</span>
                          </button>
                        )}
                        {report.status === "PROCESS" && (
                          <button
                            onClick={() => handleAction("DONE", report)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span className="text-xs">Selesai</span>
                          </button>
                        )}
                        {(report.status === "PENDING" ||
                          report.status === "PROCESS") && (
                          <button
                            onClick={() => handleAction("REJECT", report)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-xs">Tolak</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {filteredReports.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Tidak ada laporan yang ditemukan</p>
            </div>
          )}
        </div>
        )}
      </motion.div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Detail Laporan
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    #{selectedReport.id}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Report Info */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {selectedReport.title}
                      </h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {selectedReport.content}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {getStatusBadge(selectedReport.status)}
                      {getTypeBadge(selectedReport.report_type)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pelapor</p>
                        <p className="font-medium text-gray-900">
                          {selectedReport.reporter_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedReport.reporter_nik}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Tanggal Laporan</p>
                        <p className="font-medium text-gray-900 text-sm">
                          {formatDate(selectedReport.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                        {selectedReport.is_public === "Y" ? (
                          <Globe className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Lock className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Visibilitas</p>
                        <p className="font-medium text-gray-900">
                          {selectedReport.is_public === "Y"
                            ? "Publik"
                            : "Privat"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          Terakhir Diupdate
                        </p>
                        <p className="font-medium text-gray-900 text-sm">
                          {formatDate(selectedReport.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Timeline */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                      Timeline Tanggapan
                    </h4>
                    {selectedReport.status !== "DONE" && selectedReport.status !== "REJECT" && (
                    <button
                      onClick={() => setShowResponseModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Tambah Tanggapan
                    </button>
                    )}
                  </div>

                  {isLoadingResponses ? (
                    <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                      <Loader className="w-5 h-5 animate-spin" />
                      <span className="text-sm">Memuat tanggapan...</span>
                    </div>
                  ) : (responsesMap[selectedReport.id] ?? []).length > 0 ? (
                    <div className="space-y-4">
                      {(responsesMap[selectedReport.id] ?? []).map(
                        (response, index) => {
                          const list = responsesMap[selectedReport.id] ?? [];
                          return (
                          <motion.div
                            key={response.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex gap-4"
                          >
                            <div className="flex flex-col items-center">
                              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5 text-teal-600" />
                              </div>
                              {index < list.length - 1 && (
                                <div className="w-0.5 h-full bg-gray-200 my-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {response.responder_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {response.responder_role}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-500">
                                    {formatDate(response.created_at)}
                                  </p>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed">
                                  {response.response}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">
                        Belum ada tanggapan
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                {selectedReport.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => handleAction("PROCESS", selectedReport)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Proses Laporan
                    </button>
                    <button
                      onClick={() => handleAction("REJECT", selectedReport)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Tolak Laporan
                    </button>
                  </>
                )}
                {selectedReport.status === "PROCESS" && (
                  <>
                    <button
                      onClick={() => handleAction("DONE", selectedReport)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Tandai Selesai
                    </button>
                    <button
                      onClick={() => handleAction("REJECT", selectedReport)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Tolak Laporan
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Response Modal */}
      <AnimatePresence>
        {showResponseModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResponseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-lg"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Tambah Tanggapan
                </h2>
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tanggapan
                  </label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={5}
                    placeholder="Tulis tanggapan Anda..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowResponseModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  onClick={handleAddResponse}
                  disabled={!responseText.trim() || isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Kirim Tanggapan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Action Dialog */}
      <AnimatePresence>
        {showConfirmDialog && selectedReport && confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl w-full max-w-md"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {confirmAction === "PROCESS" && "Proses Laporan"}
                  {confirmAction === "DONE" && "Tandai Selesai"}
                  {confirmAction === "REJECT" && "Tolak Laporan"}
                </h2>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  {confirmAction === "PROCESS" &&
                    "Apakah Anda yakin ingin memproses laporan ini?"}
                  {confirmAction === "DONE" &&
                    "Apakah Anda yakin laporan ini sudah selesai ditangani?"}
                  {confirmAction === "REJECT" &&
                    "Apakah Anda yakin ingin menolak laporan ini?"}
                </p>

                {confirmAction === "REJECT" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Alasan Penolakan
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={4}
                      placeholder="Jelaskan alasan penolakan..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={(confirmAction === "REJECT" && !rejectReason.trim()) || isSubmitting}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    confirmAction === "PROCESS"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : confirmAction === "DONE"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                  {confirmAction === "PROCESS" && "Ya, Proses"}
                  {confirmAction === "DONE" && "Ya, Selesai"}
                  {confirmAction === "REJECT" && "Ya, Tolak"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

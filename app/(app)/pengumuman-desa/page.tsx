"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  User,
  Eye,
  Edit,
  Trash2,
  X,
  Pin,
  ChevronDown,
  Loader2,
} from "lucide-react";

// Types
type AnnouncementCategory =
  | "UMUM"
  | "KEGIATAN"
  | "LAYANAN"
  | "PEMBANGUNAN"
  | "KESEHATAN"
  | "PENDIDIKAN";

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: AnnouncementCategory | string;
  imageUrl: string | null;
  isPinned: boolean;
  publishDate: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    name: string;
  };
}

export function PengumumanDesa() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<
    AnnouncementCategory | "ALL"
  >("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "UMUM" as AnnouncementCategory,
    isPinned: false,
  });

  const fetchAnnouncements = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterCategory !== "ALL") params.set("category", filterCategory);

      const res = await fetch(`/api/announcements?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat pengumuman");
      const data = await res.json();
      setAnnouncements(data.rows);
    } catch (error) {
      console.error("Fetch announcements error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filterCategory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAnnouncements();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [fetchAnnouncements]);

  // Stats
  const stats = {
    total: announcements.length,
    published: announcements.length, // Since we only fetch active ones
    pinned: announcements.filter((a) => a.isPinned).length,
    totalViews: announcements.reduce((sum, a) => sum + a.viewCount, 0),
  };

  // Filtered list (for local display after fetch)
  const filteredAnnouncements = announcements;

  // Category badge
  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        UMUM: { bg: "bg-gray-100", text: "text-gray-700", label: "Umum" },
        KEGIATAN: {
          bg: "bg-blue-100",
          text: "text-blue-700",
          label: "Kegiatan",
        },
        LAYANAN: { bg: "bg-teal-100", text: "text-teal-700", label: "Layanan" },
        PEMBANGUNAN: {
          bg: "bg-orange-100",
          text: "text-orange-700",
          label: "Pembangunan",
        },
        KESEHATAN: {
          bg: "bg-green-100",
          text: "text-green-700",
          label: "Kesehatan",
        },
        PENDIDIKAN: {
          bg: "bg-purple-100",
          text: "text-purple-700",
          label: "Pendidikan",
        },
      };
    const badge = badges[category] || {
      bg: "bg-gray-100",
      text: "text-gray-700",
      label: category,
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Handle view detail
  const handleViewDetail = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);
    // Increment views via API
    try {
      await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewCount: announcement.viewCount + 1 }),
      });
      // Update local state
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcement.id ? { ...a, viewCount: a.viewCount + 1 } : a,
        ),
      );
    } catch (error) {
      console.error("Update viewCount error:", error);
    }
  };

  // Handle add/edit
  const handleOpenAddModal = () => {
    setEditMode(false);
    setFormData({
      title: "",
      content: "",
      category: "UMUM",
      isPinned: false,
    });
    setShowAddModal(true);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditMode(true);
    setSelectedAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: (announcement.category as AnnouncementCategory) || "UMUM",
      isPinned: announcement.isPinned,
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (editMode && selectedAnnouncement) {
        const res = await fetch(
          `/api/announcements/${selectedAnnouncement.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          },
        );
        if (!res.ok) throw new Error("Gagal memperbarui pengumuman");
      } else {
        const res = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Gagal membuat pengumuman");
      }
      setShowAddModal(false);
      fetchAnnouncements();
    } catch (error) {
      console.error("Save announcement error:", error);
      alert("Gagal menyimpan pengumuman. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) {
      try {
        const res = await fetch(`/api/announcements/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Gagal menghapus pengumuman");
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        setShowDetailModal(false);
      } catch (error) {
        console.error("Delete announcement error:", error);
        alert("Gagal menghapus pengumuman.");
      }
    }
  };

  // Toggle pin
  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !announcement.isPinned }),
      });
      if (!res.ok) throw new Error("Gagal mengubah status pin");
      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcement.id ? { ...a, isPinned: !a.isPinned } : a,
        ),
      );
    } catch (error) {
      console.error("Toggle pin error:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pengumuman</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dipublikasikan</p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.published}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dipasang Pin</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {stats.pinned}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Pin className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tayangan</p>
              <p className="text-3xl font-bold text-teal-600 mt-1">
                {stats.totalViews}
              </p>
            </div>
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-teal-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters & Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Cari pengumuman..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(
                    e.target.value as AnnouncementCategory | "ALL",
                  )
                }
                className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="UMUM">Umum</option>
                <option value="KEGIATAN">Kegiatan</option>
                <option value="LAYANAN">Layanan</option>
                <option value="PEMBANGUNAN">Pembangunan</option>
                <option value="KESEHATAN">Kesehatan</option>
                <option value="PENDIDIKAN">Pendidikan</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            </div>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Tambah Pengumuman
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Loader2 className="w-12 h-12 text-teal-600 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">Memuat pengumuman...</p>
          </div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {filteredAnnouncements.map((announcement) => (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        {announcement.isPinned && (
                          <Pin className="w-5 h-5 text-orange-600 shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {announcement.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                            {getCategoryBadge(announcement.category)}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(announcement.publishDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {announcement.createdBy?.name || "Admin"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {announcement.viewCount} tayangan
                            </span>
                          </div>
                          <p className="text-gray-700 line-clamp-3 whitespace-pre-line">
                            {announcement.content}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleViewDetail(announcement)}
                        className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        title="Lihat Detail"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleTogglePin(announcement)}
                        className={`p-2 rounded-lg transition-colors ${
                          announcement.isPinned
                            ? "text-orange-600 bg-orange-50"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        title={
                          announcement.isPinned ? "Lepas Pin" : "Pasang Pin"
                        }
                      >
                        <Pin className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredAnnouncements.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">Tidak ada pengumuman</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editMode ? "Edit Pengumuman" : "Tambah Pengumuman"}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Judul Pengumuman *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Masukkan judul pengumuman"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kategori *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as AnnouncementCategory,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="UMUM">Umum</option>
                    <option value="KEGIATAN">Kegiatan</option>
                    <option value="LAYANAN">Layanan</option>
                    <option value="PEMBANGUNAN">Pembangunan</option>
                    <option value="KESEHATAN">Kesehatan</option>
                    <option value="PENDIDIKAN">Pendidikan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Isi Pengumuman *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Masukkan isi pengumuman..."
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isPinned"
                    checked={formData.isPinned}
                    onChange={(e) =>
                      setFormData({ ...formData, isPinned: e.target.checked })
                    }
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                  />
                  <label
                    htmlFor="isPinned"
                    className="text-sm font-medium text-gray-700"
                  >
                    Pasang di bagian atas (Pin)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!formData.title || !formData.content || isSaving}
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editMode ? "Simpan Perubahan" : "Publikasikan"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedAnnouncement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {selectedAnnouncement.isPinned && (
                    <Pin className="w-5 h-5 text-orange-600" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedAnnouncement.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      {getCategoryBadge(selectedAnnouncement.category)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDate(selectedAnnouncement.publishDate)}
                  </span>
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {selectedAnnouncement.createdBy?.name || "Admin"}
                  </span>
                  <span className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    {selectedAnnouncement.viewCount} tayangan
                  </span>
                </div>

                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {selectedAnnouncement.content}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PengumumanDesa;

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageCircle,
  Plus,
  Search,
  ThumbsUp,
  MessageSquare,
  User,
  Clock,
  Eye,
  X,
  Send,
  ChevronDown,
  Pin,
  Lock,
  Globe,
} from "lucide-react";

type ThreadCategory =
  | "UMUM"
  | "PEMBANGUNAN"
  | "KESEHATAN"
  | "PENDIDIKAN"
  | "KEAMANAN"
  | "EKONOMI";
type ThreadStatus = "OPEN" | "CLOSED";

interface Thread {
  id: number;
  title: string;
  content: string;
  category: ThreadCategory;
  status: ThreadStatus;
  is_pinned: boolean;
  is_locked: boolean;
  created_by: string;
  created_by_role: string;
  created_at: string;
  replies_count: number;
  likes_count: number;
  views_count: number;
}

interface Reply {
  id: number;
  thread_id: number;
  content: string;
  created_by: string;
  created_by_role: string;
  created_at: string;
  likes_count: number;
}

export function ForumDiskusi() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Record<number, Reply[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<ThreadCategory | "ALL">(
    "ALL",
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingThread, setIsSubmittingThread] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "UMUM" as ThreadCategory,
  });

  const fetchThreads = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/forum-threads", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Gagal mengambil data diskusi");
      }
      const rows: Thread[] = await response.json();
      setThreads(rows);
    } catch (error) {
      console.error("fetchThreads error:", error);
      setErrorMessage("Data diskusi belum bisa dimuat. Coba lagi sebentar.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReplies = async (threadId: number) => {
    const response = await fetch(`/api/forum-threads/${threadId}/replies`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("Gagal mengambil balasan");
    }
    const rows: Reply[] = await response.json();
    setReplies((prev) => ({ ...prev, [threadId]: rows }));
  };

  useEffect(() => {
    void fetchThreads();
  }, []);

  const stats = {
    totalThreads: threads.length,
    openThreads: threads.filter((t) => t.status === "OPEN").length,
    totalReplies: threads.reduce((sum, t) => sum + t.replies_count, 0),
    totalViews: threads.reduce((sum, t) => sum + t.views_count, 0),
  };

  const filteredThreads = threads
    .filter((thread) => {
      const matchSearch =
        thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        filterCategory === "ALL" || thread.category === filterCategory;
      return matchSearch && matchCategory;
    })
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getCategoryBadge = (category: ThreadCategory) => {
    const badges = {
      UMUM: { bg: "bg-gray-100", text: "text-gray-700", label: "Umum" },
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
      KEAMANAN: { bg: "bg-red-100", text: "text-red-700", label: "Keamanan" },
      EKONOMI: { bg: "bg-blue-100", text: "text-blue-700", label: "Ekonomi" },
    };
    const badge = badges[category];
    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
      >
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} menit yang lalu`;
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays < 7) return `${diffDays} hari yang lalu`;

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const handleViewThread = async (thread: Thread) => {
    setSelectedThread(thread);
    setShowThreadModal(true);

    if (!replies[thread.id]) {
      try {
        await fetchReplies(thread.id);
      } catch (error) {
        console.error("fetchReplies error:", error);
      }
    }

    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id ? { ...t, views_count: t.views_count + 1 } : t,
      ),
    );
    setSelectedThread((prev) =>
      prev && prev.id === thread.id
        ? { ...prev, views_count: prev.views_count + 1 }
        : prev,
    );

    try {
      const response = await fetch(`/api/forum-threads/${thread.id}/view`, {
        method: "POST",
      });
      if (response.ok) {
        const data: { views_count: number } = await response.json();
        setThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id ? { ...t, views_count: data.views_count } : t,
          ),
        );
        setSelectedThread((prev) =>
          prev && prev.id === thread.id
            ? { ...prev, views_count: data.views_count }
            : prev,
        );
      }
    } catch (error) {
      console.error("view thread error:", error);
    }
  };

  const handleAddThread = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSubmittingThread(true);
    try {
      const response = await fetch("/api/forum-threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal membuat diskusi");
      }

      const created: Thread = await response.json();
      setThreads((prev) => [created, ...prev]);
      setShowAddModal(false);
      setFormData({ title: "", content: "", category: "UMUM" });
    } catch (error) {
      console.error("handleAddThread error:", error);
      alert(error instanceof Error ? error.message : "Gagal membuat diskusi");
    } finally {
      setIsSubmittingThread(false);
    }
  };

  const handleAddReply = async () => {
    if (!selectedThread || !replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      const response = await fetch(`/api/forum-threads/${selectedThread.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Gagal mengirim balasan");
      }

      const newReply: Reply = await response.json();

      setReplies((prev) => ({
        ...prev,
        [selectedThread.id]: [...(prev[selectedThread.id] || []), newReply],
      }));

      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThread.id
            ? { ...t, replies_count: t.replies_count + 1 }
            : t,
        ),
      );
      setSelectedThread((prev) =>
        prev ? { ...prev, replies_count: prev.replies_count + 1 } : prev,
      );
      setReplyText("");
    } catch (error) {
      console.error("handleAddReply error:", error);
      alert(error instanceof Error ? error.message : "Gagal mengirim balasan");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleLikeThread = async (id: number) => {
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, likes_count: t.likes_count + 1 } : t)),
    );
    setSelectedThread((prev) =>
      prev && prev.id === id ? { ...prev, likes_count: prev.likes_count + 1 } : prev,
    );

    try {
      const response = await fetch(`/api/forum-threads/${id}/like`, {
        method: "POST",
      });
      if (response.ok) {
        const data: { likes_count: number } = await response.json();
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, likes_count: data.likes_count } : t)),
        );
        setSelectedThread((prev) =>
          prev && prev.id === id ? { ...prev, likes_count: data.likes_count } : prev,
        );
      }
    } catch (error) {
      console.error("handleLikeThread error:", error);
    }
  };

  const selectedReplies = selectedThread ? replies[selectedThread.id] || [] : [];

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Diskusi</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{stats.totalThreads}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Diskusi Aktif</p>
              <p className="mt-1 text-3xl font-bold text-green-600">{stats.openThreads}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <Globe className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Komentar</p>
              <p className="mt-1 text-3xl font-bold text-teal-600">{stats.totalReplies}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-100">
              <MessageSquare className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tayangan</p>
              <p className="mt-1 text-3xl font-bold text-purple-600">{stats.totalViews}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <Eye className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex w-full flex-1 flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari diskusi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) =>
                  setFilterCategory(e.target.value as ThreadCategory | "ALL")
                }
                className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-4 pr-10 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="UMUM">Umum</option>
                <option value="PEMBANGUNAN">Pembangunan</option>
                <option value="KESEHATAN">Kesehatan</option>
                <option value="PENDIDIKAN">Pendidikan</option>
                <option value="KEAMANAN">Keamanan</option>
                <option value="EKONOMI">Ekonomi</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white transition-colors hover:bg-teal-700"
          >
            <Plus className="h-5 w-5" />
            Mulai Diskusi
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
            Memuat data diskusi...
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredThreads.map((thread) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                onClick={() => handleViewThread(thread)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100">
                    <User className="h-6 w-6 text-teal-600" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {thread.is_pinned && <Pin className="h-4 w-4 text-orange-600" />}
                        {thread.is_locked && <Lock className="h-4 w-4 text-red-600" />}
                        <h3 className="text-lg font-semibold text-gray-900">{thread.title}</h3>
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      {getCategoryBadge(thread.category)}
                      <span className="text-sm text-gray-600">
                        oleh <strong>{thread.created_by}</strong> ({thread.created_by_role})
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {formatDate(thread.created_at)}
                      </span>
                    </div>

                    <p className="mb-4 line-clamp-2 text-gray-700">{thread.content}</p>

                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleLikeThread(thread.id);
                        }}
                        className="flex items-center gap-1 transition-colors hover:text-teal-600"
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{thread.likes_count}</span>
                      </button>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        {thread.replies_count} balasan
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {thread.views_count}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {!isLoading && filteredThreads.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">Tidak ada diskusi</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <h3 className="text-xl font-bold text-gray-900">Mulai Diskusi Baru</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Judul Diskusi *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Masukkan judul diskusi"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Kategori *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as ThreadCategory,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="UMUM">Umum</option>
                    <option value="PEMBANGUNAN">Pembangunan</option>
                    <option value="KESEHATAN">Kesehatan</option>
                    <option value="PENDIDIKAN">Pendidikan</option>
                    <option value="KEAMANAN">Keamanan</option>
                    <option value="EKONOMI">Ekonomi</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Isi Diskusi *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Tulis pertanyaan atau topik diskusi Anda..."
                    rows={6}
                    className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => void handleAddThread()}
                    disabled={
                      isSubmittingThread || !formData.title.trim() || !formData.content.trim()
                    }
                    className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:bg-gray-300"
                  >
                    {isSubmittingThread ? "Memproses..." : "Posting Diskusi"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showThreadModal && selectedThread && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowThreadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                  {selectedThread.is_pinned && <Pin className="h-5 w-5 text-orange-600" />}
                  {selectedThread.is_locked && <Lock className="h-5 w-5 text-red-600" />}
                  <h3 className="text-xl font-bold text-gray-900">{selectedThread.title}</h3>
                </div>
                <button
                  onClick={() => setShowThreadModal(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                <div className="rounded-lg bg-gray-50 p-6">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal-100">
                      <User className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <strong className="text-gray-900">{selectedThread.created_by}</strong>
                        <span className="text-sm text-gray-600">
                          ({selectedThread.created_by_role})
                        </span>
                        {getCategoryBadge(selectedThread.category)}
                      </div>
                      <p className="mb-3 text-sm text-gray-500">
                        {formatDate(selectedThread.created_at)}
                      </p>
                      <p className="whitespace-pre-line text-gray-700">{selectedThread.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 border-t border-gray-200 pt-4 text-sm text-gray-600">
                    <button
                      onClick={() => void handleLikeThread(selectedThread.id)}
                      className="flex items-center gap-1 hover:text-teal-600"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      {selectedThread.likes_count}
                    </button>
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {selectedThread.views_count}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">{selectedReplies.length} Balasan</h4>

                  {selectedReplies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-lg border border-gray-200 bg-white p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <strong className="text-sm text-gray-900">{reply.created_by}</strong>
                            <span className="text-xs text-gray-600">({reply.created_by_role})</span>
                            <span className="text-xs text-gray-500">{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!selectedThread.is_locked && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Tulis balasan Anda..."
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleAddReply();
                        }
                      }}
                    />
                    <button
                      onClick={() => void handleAddReply()}
                      disabled={isSubmittingReply || !replyText.trim()}
                      className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:bg-gray-300"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmittingReply ? "Mengirim..." : "Kirim"}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ForumDiskusi;

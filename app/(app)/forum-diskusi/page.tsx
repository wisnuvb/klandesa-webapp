"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   MessageCircle,
//   Plus,
//   Search,
//   ThumbsUp,
//   MessageSquare,
//   User,
//   Clock,
//   Eye,
//   X,
//   Send,
//   ChevronDown,
//   Pin,
//   Lock,
//   Globe,
// } from "lucide-react";

// // Types
// type ThreadCategory =
//   | "UMUM"
//   | "PEMBANGUNAN"
//   | "KESEHATAN"
//   | "PENDIDIKAN"
//   | "KEAMANAN"
//   | "EKONOMI";
// type ThreadStatus = "OPEN" | "CLOSED";

// interface Thread {
//   id: number;
//   title: string;
//   content: string;
//   category: ThreadCategory;
//   status: ThreadStatus;
//   is_pinned: boolean;
//   is_locked: boolean;
//   created_by: string;
//   created_by_role: string;
//   created_at: string;
//   replies_count: number;
//   likes_count: number;
//   views_count: number;
// }

// interface Reply {
//   id: number;
//   thread_id: number;
//   content: string;
//   created_by: string;
//   created_by_role: string;
//   created_at: string;
//   likes_count: number;
// }

// // Mock Data
// const mockThreads: Thread[] = [
//   {
//     id: 1,
//     title: "Usulan Pembangunan Taman Bermain Anak",
//     content:
//       "Saya mengusulkan agar di desa kita dibangun taman bermain anak. Saat ini anak-anak hanya bisa bermain di jalan yang cukup berbahaya. Bagaimana pendapat warga lainnya?",
//     category: "PEMBANGUNAN",
//     status: "OPEN",
//     is_pinned: true,
//     is_locked: false,
//     created_by: "Budi Santoso",
//     created_by_role: "Warga",
//     created_at: "2025-01-18T10:30:00",
//     replies_count: 12,
//     likes_count: 24,
//     views_count: 156,
//   },
//   {
//     id: 2,
//     title: "Jadwal Kerja Bakti Rutin Setiap Minggu?",
//     content:
//       "Bagaimana kalau kita buat jadwal kerja bakti rutin setiap minggu? Misalnya setiap Minggu pagi. Biar desa kita selalu bersih dan rapi.",
//     category: "UMUM",
//     status: "OPEN",
//     is_pinned: false,
//     is_locked: false,
//     created_by: "Siti Aminah",
//     created_by_role: "Warga",
//     created_at: "2025-01-19T08:15:00",
//     replies_count: 8,
//     likes_count: 15,
//     views_count: 89,
//   },
//   {
//     id: 3,
//     title: "Info Posyandu dan Imunisasi Balita",
//     content:
//       "Kepada ibu-ibu yang punya balita, jangan lupa untuk rutin ke posyandu ya. Imunisasi sangat penting untuk kesehatan anak kita.",
//     category: "KESEHATAN",
//     status: "OPEN",
//     is_pinned: false,
//     is_locked: false,
//     created_by: "Dr. Dewi",
//     created_by_role: "Bidan Desa",
//     created_at: "2025-01-17T14:00:00",
//     replies_count: 5,
//     likes_count: 18,
//     views_count: 67,
//   },
//   {
//     id: 4,
//     title: "Keamanan Lingkungan RT 03",
//     content:
//       "Akhir-akhir ini ada beberapa kejadian pencurian di RT 03. Mungkin kita perlu membentuk ronda malam rutin. Bagaimana pendapat teman-teman?",
//     category: "KEAMANAN",
//     status: "OPEN",
//     is_pinned: true,
//     is_locked: false,
//     created_by: "Ahmad Yani",
//     created_by_role: "Ketua RT 03",
//     created_at: "2025-01-16T16:45:00",
//     replies_count: 20,
//     likes_count: 32,
//     views_count: 203,
//   },
//   {
//     id: 5,
//     title: "Pelatihan Kerajinan Tangan untuk Ibu-Ibu PKK",
//     content:
//       "Pemerintah desa akan mengadakan pelatihan membuat kerajinan tangan untuk ibu-ibu PKK. Siapa yang berminat? Gratis!",
//     category: "EKONOMI",
//     status: "CLOSED",
//     is_pinned: false,
//     is_locked: true,
//     created_by: "Kepala Desa",
//     created_by_role: "Kepala Desa",
//     created_at: "2025-01-10T09:00:00",
//     replies_count: 15,
//     likes_count: 28,
//     views_count: 142,
//   },
// ];

// const mockReplies: Record<number, Reply[]> = {
//   1: [
//     {
//       id: 1,
//       thread_id: 1,
//       content:
//         "Ide bagus! Saya sangat setuju. Anak-anak perlu tempat bermain yang aman.",
//       created_by: "Rudi Hermawan",
//       created_by_role: "Warga",
//       created_at: "2025-01-18T11:00:00",
//       likes_count: 5,
//     },
//     {
//       id: 2,
//       thread_id: 1,
//       content:
//         "Setuju sekali. Mungkin bisa dibangun di tanah kosong dekat balai desa?",
//       created_by: "Dewi Kartika",
//       created_by_role: "Warga",
//       created_at: "2025-01-18T12:30:00",
//       likes_count: 8,
//     },
//     {
//       id: 3,
//       thread_id: 1,
//       content:
//         "Terima kasih atas usulannya. Kami akan diskusikan di rapat desa bulan depan.",
//       created_by: "Sekretaris Desa",
//       created_by_role: "Sekretaris Desa",
//       created_at: "2025-01-18T14:15:00",
//       likes_count: 12,
//     },
//   ],
//   2: [
//     {
//       id: 4,
//       thread_id: 2,
//       content: "Ide bagus! Tapi mungkin 2 minggu sekali lebih realistis.",
//       created_by: "Hendra Kusuma",
//       created_by_role: "Warga",
//       created_at: "2025-01-19T09:00:00",
//       likes_count: 3,
//     },
//   ],
// };

// export function ForumDiskusi() {
//   const [threads, setThreads] = useState<Thread[]>(mockThreads);
//   const [replies, setReplies] = useState<Record<number, Reply[]>>(mockReplies);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState<ThreadCategory | "ALL">(
//     "ALL"
//   );
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showThreadModal, setShowThreadModal] = useState(false);
//   const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
//   const [replyText, setReplyText] = useState("");

//   // Form state
//   const [formData, setFormData] = useState({
//     title: "",
//     content: "",
//     category: "UMUM" as ThreadCategory,
//   });

//   // Stats
//   const stats = {
//     totalThreads: threads.length,
//     openThreads: threads.filter((t) => t.status === "OPEN").length,
//     totalReplies: Object.values(replies).reduce((sum, r) => sum + r.length, 0),
//     totalViews: threads.reduce((sum, t) => sum + t.views_count, 0),
//   };

//   // Filter
//   const filteredThreads = threads
//     .filter((thread) => {
//       const matchSearch =
//         thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         thread.content.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchCategory =
//         filterCategory === "ALL" || thread.category === filterCategory;
//       return matchSearch && matchCategory;
//     })
//     .sort((a, b) => {
//       if (a.is_pinned && !b.is_pinned) return -1;
//       if (!a.is_pinned && b.is_pinned) return 1;
//       return (
//         new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//       );
//     });

//   // Category badge
//   const getCategoryBadge = (category: ThreadCategory) => {
//     const badges = {
//       UMUM: { bg: "bg-gray-100", text: "text-gray-700", label: "Umum" },
//       PEMBANGUNAN: {
//         bg: "bg-orange-100",
//         text: "text-orange-700",
//         label: "Pembangunan",
//       },
//       KESEHATAN: {
//         bg: "bg-green-100",
//         text: "text-green-700",
//         label: "Kesehatan",
//       },
//       PENDIDIKAN: {
//         bg: "bg-purple-100",
//         text: "text-purple-700",
//         label: "Pendidikan",
//       },
//       KEAMANAN: { bg: "bg-red-100", text: "text-red-700", label: "Keamanan" },
//       EKONOMI: { bg: "bg-blue-100", text: "text-blue-700", label: "Ekonomi" },
//     };
//     const badge = badges[category];
//     return (
//       <span
//         className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
//       >
//         {badge.label}
//       </span>
//     );
//   };

//   // Format date
//   const formatDate = (dateStr: string) => {
//     const date = new Date(dateStr);
//     const now = new Date();
//     const diffMs = now.getTime() - date.getTime();
//     const diffMins = Math.floor(diffMs / 60000);
//     const diffHours = Math.floor(diffMs / 3600000);
//     const diffDays = Math.floor(diffMs / 86400000);

//     if (diffMins < 60) return `${diffMins} menit yang lalu`;
//     if (diffHours < 24) return `${diffHours} jam yang lalu`;
//     if (diffDays < 7) return `${diffDays} hari yang lalu`;

//     return new Intl.DateTimeFormat("id-ID", {
//       day: "numeric",
//       month: "short",
//       year: "numeric",
//     }).format(date);
//   };

//   // Handle view thread
//   const handleViewThread = (thread: Thread) => {
//     setSelectedThread(thread);
//     setShowThreadModal(true);
//     setThreads((prev) =>
//       prev.map((t) =>
//         t.id === thread.id ? { ...t, views_count: t.views_count + 1 } : t
//       )
//     );
//   };

//   // Handle add thread
//   const handleAddThread = () => {
//     if (!formData.title || !formData.content) return;

//     const newThread: Thread = {
//       id: threads.length + 1,
//       ...formData,
//       status: "OPEN",
//       is_pinned: false,
//       is_locked: false,
//       created_by: "Anda",
//       created_by_role: "Warga",
//       created_at: new Date().toISOString(),
//       replies_count: 0,
//       likes_count: 0,
//       views_count: 0,
//     };

//     setThreads((prev) => [newThread, ...prev]);
//     setShowAddModal(false);
//     setFormData({ title: "", content: "", category: "UMUM" });
//   };

//   // Handle add reply
//   const handleAddReply = () => {
//     if (!selectedThread || !replyText.trim()) return;

//     const newReply: Reply = {
//       id: Date.now(),
//       thread_id: selectedThread.id,
//       content: replyText,
//       created_by: "Anda",
//       created_by_role: "Warga",
//       created_at: new Date().toISOString(),
//       likes_count: 0,
//     };

//     setReplies((prev) => ({
//       ...prev,
//       [selectedThread.id]: [...(prev[selectedThread.id] || []), newReply],
//     }));

//     setThreads((prev) =>
//       prev.map((t) =>
//         t.id === selectedThread.id
//           ? { ...t, replies_count: t.replies_count + 1 }
//           : t
//       )
//     );

//     setReplyText("");
//   };

//   // Handle like thread
//   const handleLikeThread = (id: number) => {
//     setThreads((prev) =>
//       prev.map((t) =>
//         t.id === id ? { ...t, likes_count: t.likes_count + 1 } : t
//       )
//     );
//   };

//   return (
//     <div className="space-y-6">
//       {/* Stats Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Total Diskusi</p>
//               <p className="text-3xl font-bold text-gray-900 mt-1">
//                 {stats.totalThreads}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//               <MessageCircle className="w-6 h-6 text-blue-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.1 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Diskusi Aktif</p>
//               <p className="text-3xl font-bold text-green-600 mt-1">
//                 {stats.openThreads}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//               <Globe className="w-6 h-6 text-green-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Total Komentar</p>
//               <p className="text-3xl font-bold text-teal-600 mt-1">
//                 {stats.totalReplies}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
//               <MessageSquare className="w-6 h-6 text-teal-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.3 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Total Tayangan</p>
//               <p className="text-3xl font-bold text-purple-600 mt-1">
//                 {stats.totalViews}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
//               <Eye className="w-6 h-6 text-purple-600" />
//             </div>
//           </div>
//         </motion.div>
//       </div>

//       {/* Filters & Actions */}
//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//         <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
//           <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//               <input
//                 type="text"
//                 placeholder="Cari diskusi..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//               />
//             </div>
//             <div className="relative">
//               <select
//                 value={filterCategory}
//                 onChange={(e) =>
//                   setFilterCategory(e.target.value as ThreadCategory | "ALL")
//                 }
//                 className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
//               >
//                 <option value="ALL">Semua Kategori</option>
//                 <option value="UMUM">Umum</option>
//                 <option value="PEMBANGUNAN">Pembangunan</option>
//                 <option value="KESEHATAN">Kesehatan</option>
//                 <option value="PENDIDIKAN">Pendidikan</option>
//                 <option value="KEAMANAN">Keamanan</option>
//                 <option value="EKONOMI">Ekonomi</option>
//               </select>
//               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
//             </div>
//           </div>
//           <button
//             onClick={() => setShowAddModal(true)}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
//           >
//             <Plus className="w-5 h-5" />
//             Mulai Diskusi
//           </button>
//         </div>
//       </div>

//       {/* Threads List */}
//       <div className="space-y-4">
//         <AnimatePresence mode="popLayout">
//           {filteredThreads.map((thread) => (
//             <motion.div
//               key={thread.id}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -20 }}
//               className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
//               onClick={() => handleViewThread(thread)}
//             >
//               <div className="flex items-start gap-4">
//                 <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
//                   <User className="w-6 h-6 text-teal-600" />
//                 </div>

//                 <div className="flex-1 min-w-0">
//                   <div className="flex items-start justify-between gap-3 mb-2">
//                     <div className="flex items-center gap-2 flex-wrap">
//                       {thread.is_pinned && (
//                         <Pin className="w-4 h-4 text-orange-600" />
//                       )}
//                       {thread.is_locked && (
//                         <Lock className="w-4 h-4 text-red-600" />
//                       )}
//                       <h3 className="text-lg font-semibold text-gray-900">
//                         {thread.title}
//                       </h3>
//                     </div>
//                   </div>

//                   <div className="flex items-center gap-3 mb-3 flex-wrap">
//                     {getCategoryBadge(thread.category)}
//                     <span className="text-sm text-gray-600">
//                       oleh <strong>{thread.created_by}</strong> (
//                       {thread.created_by_role})
//                     </span>
//                     <span className="flex items-center gap-1 text-sm text-gray-500">
//                       <Clock className="w-4 h-4" />
//                       {formatDate(thread.created_at)}
//                     </span>
//                   </div>

//                   <p className="text-gray-700 mb-4 line-clamp-2">
//                     {thread.content}
//                   </p>

//                   <div className="flex items-center gap-6 text-sm text-gray-600">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleLikeThread(thread.id);
//                       }}
//                       className="flex items-center gap-1 hover:text-teal-600 transition-colors"
//                     >
//                       <ThumbsUp className="w-4 h-4" />
//                       <span>{thread.likes_count}</span>
//                     </button>
//                     <span className="flex items-center gap-1">
//                       <MessageSquare className="w-4 h-4" />
//                       {thread.replies_count} balasan
//                     </span>
//                     <span className="flex items-center gap-1">
//                       <Eye className="w-4 h-4" />
//                       {thread.views_count}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           ))}
//         </AnimatePresence>

//         {filteredThreads.length === 0 && (
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
//             <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//             <p className="text-gray-500">Tidak ada diskusi</p>
//           </div>
//         )}
//       </div>

//       {/* Add Thread Modal */}
//       <AnimatePresence>
//         {showAddModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowAddModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <h3 className="text-xl font-bold text-gray-900">
//                   Mulai Diskusi Baru
//                 </h3>
//                 <button
//                   onClick={() => setShowAddModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Judul Diskusi *
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.title}
//                     onChange={(e) =>
//                       setFormData({ ...formData, title: e.target.value })
//                     }
//                     placeholder="Masukkan judul diskusi"
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Kategori *
//                   </label>
//                   <select
//                     value={formData.category}
//                     onChange={(e) =>
//                       setFormData({
//                         ...formData,
//                         category: e.target.value as ThreadCategory,
//                       })
//                     }
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//                   >
//                     <option value="UMUM">Umum</option>
//                     <option value="PEMBANGUNAN">Pembangunan</option>
//                     <option value="KESEHATAN">Kesehatan</option>
//                     <option value="PENDIDIKAN">Pendidikan</option>
//                     <option value="KEAMANAN">Keamanan</option>
//                     <option value="EKONOMI">Ekonomi</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Isi Diskusi *
//                   </label>
//                   <textarea
//                     value={formData.content}
//                     onChange={(e) =>
//                       setFormData({ ...formData, content: e.target.value })
//                     }
//                     placeholder="Tulis pertanyaan atau topik diskusi Anda..."
//                     rows={6}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
//                   />
//                 </div>

//                 <div className="flex gap-3 pt-4">
//                   <button
//                     onClick={() => setShowAddModal(false)}
//                     className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     onClick={handleAddThread}
//                     disabled={!formData.title || !formData.content}
//                     className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
//                   >
//                     Posting Diskusi
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Thread Detail Modal */}
//       <AnimatePresence>
//         {showThreadModal && selectedThread && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowThreadModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   {selectedThread.is_pinned && (
//                     <Pin className="w-5 h-5 text-orange-600" />
//                   )}
//                   {selectedThread.is_locked && (
//                     <Lock className="w-5 h-5 text-red-600" />
//                   )}
//                   <h3 className="text-xl font-bold text-gray-900">
//                     {selectedThread.title}
//                   </h3>
//                 </div>
//                 <button
//                   onClick={() => setShowThreadModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="flex-1 overflow-y-auto p-6 space-y-6">
//                 {/* Thread Content */}
//                 <div className="bg-gray-50 rounded-lg p-6">
//                   <div className="flex items-start gap-4 mb-4">
//                     <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
//                       <User className="w-6 h-6 text-teal-600" />
//                     </div>
//                     <div className="flex-1">
//                       <div className="flex items-center gap-3 mb-2">
//                         <strong className="text-gray-900">
//                           {selectedThread.created_by}
//                         </strong>
//                         <span className="text-sm text-gray-600">
//                           ({selectedThread.created_by_role})
//                         </span>
//                         {getCategoryBadge(selectedThread.category)}
//                       </div>
//                       <p className="text-sm text-gray-500 mb-3">
//                         {formatDate(selectedThread.created_at)}
//                       </p>
//                       <p className="text-gray-700 whitespace-pre-line">
//                         {selectedThread.content}
//                       </p>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-6 text-sm text-gray-600 pt-4 border-t border-gray-200">
//                     <button
//                       onClick={() => handleLikeThread(selectedThread.id)}
//                       className="flex items-center gap-1 hover:text-teal-600"
//                     >
//                       <ThumbsUp className="w-4 h-4" />
//                       {selectedThread.likes_count}
//                     </button>
//                     <span className="flex items-center gap-1">
//                       <Eye className="w-4 h-4" />
//                       {selectedThread.views_count}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Replies */}
//                 <div className="space-y-4">
//                   <h4 className="font-semibold text-gray-900">
//                     {(replies[selectedThread.id] || []).length} Balasan
//                   </h4>

//                   {(replies[selectedThread.id] || []).map((reply) => (
//                     <div
//                       key={reply.id}
//                       className="bg-white border border-gray-200 rounded-lg p-4"
//                     >
//                       <div className="flex items-start gap-3">
//                         <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
//                           <User className="w-5 h-5 text-gray-600" />
//                         </div>
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2 mb-1">
//                             <strong className="text-sm text-gray-900">
//                               {reply.created_by}
//                             </strong>
//                             <span className="text-xs text-gray-600">
//                               ({reply.created_by_role})
//                             </span>
//                             <span className="text-xs text-gray-500">
//                               {formatDate(reply.created_at)}
//                             </span>
//                           </div>
//                           <p className="text-sm text-gray-700">
//                             {reply.content}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Reply Form */}
//               {!selectedThread.is_locked && (
//                 <div className="px-6 py-4 border-t border-gray-200">
//                   <div className="flex gap-3">
//                     <input
//                       type="text"
//                       value={replyText}
//                       onChange={(e) => setReplyText(e.target.value)}
//                       placeholder="Tulis balasan Anda..."
//                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//                       onKeyPress={(e) => e.key === "Enter" && handleAddReply()}
//                     />
//                     <button
//                       onClick={handleAddReply}
//                       disabled={!replyText.trim()}
//                       className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 flex items-center gap-2"
//                     >
//                       <Send className="w-4 h-4" />
//                       Kirim
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default ForumDiskusi;
const MaintenancePage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Forum Diskusi Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur Forum Diskusi. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    />
  );
};

export default MaintenancePage;

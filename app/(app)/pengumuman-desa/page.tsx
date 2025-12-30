"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   Megaphone,
//   Plus,
//   Search,
//   Calendar,
//   User,
//   Eye,
//   Edit,
//   Trash2,
//   X,
//   Image as ImageIcon,
//   Pin,
//   Clock,
//   ChevronDown,
// } from "lucide-react";

// // Types
// type AnnouncementCategory =
//   | "UMUM"
//   | "KEGIATAN"
//   | "LAYANAN"
//   | "PEMBANGUNAN"
//   | "KESEHATAN"
//   | "PENDIDIKAN";
// type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

// interface Announcement {
//   id: number;
//   title: string;
//   content: string;
//   category: AnnouncementCategory;
//   status: AnnouncementStatus;
//   image_url: string | null;
//   is_pinned: boolean;
//   published_at: string;
//   created_by: string;
//   views: number;
//   created_at: string;
//   updated_at: string;
// }

// // Mock Data
// const mockAnnouncements: Announcement[] = [
//   {
//     id: 1,
//     title: "Jadwal Posyandu Bulan Januari 2025",
//     content:
//       "Kepada seluruh warga, khususnya ibu-ibu yang memiliki balita, diberitahukan bahwa kegiatan Posyandu akan dilaksanakan pada:\n\nTanggal: 25 Januari 2025\nWaktu: 08.00 - 12.00 WIB\nTempat: Balai Desa\n\nMohon hadir tepat waktu dengan membawa KMS anak. Terima kasih.",
//     category: "KESEHATAN",
//     status: "PUBLISHED",
//     image_url: null,
//     is_pinned: true,
//     published_at: "2025-01-15T08:00:00",
//     created_by: "Admin Desa",
//     views: 245,
//     created_at: "2025-01-15T08:00:00",
//     updated_at: "2025-01-15T08:00:00",
//   },
//   {
//     id: 2,
//     title: "Pembangunan Jalan Desa Dimulai Minggu Depan",
//     content:
//       "Dengan bangga kami informasikan bahwa pembangunan jalan desa sepanjang 500 meter akan dimulai pada tanggal 22 Januari 2025.\n\nLokasi: Jalan RT 02 - RT 03\nDurasi: 2 bulan\n\nMohon maaf atas ketidaknyamanan selama proses pembangunan. Terima kasih atas pengertiannya.",
//     category: "PEMBANGUNAN",
//     status: "PUBLISHED",
//     image_url: null,
//     is_pinned: true,
//     published_at: "2025-01-18T10:30:00",
//     created_by: "Kepala Desa",
//     views: 312,
//     created_at: "2025-01-18T10:30:00",
//     updated_at: "2025-01-18T10:30:00",
//   },
//   {
//     id: 3,
//     title: "Pendaftaran Beasiswa Pelajar Berprestasi",
//     content:
//       "Pemerintah Desa membuka pendaftaran beasiswa untuk pelajar berprestasi tahun ajaran 2025/2026.\n\nKuota: 10 siswa\nNilai beasiswa: Rp 1.000.000/semester\nSyarat: Rata-rata rapor min. 8.0, SKTM\n\nPendaftaran dibuka hingga 31 Januari 2025 di kantor desa.",
//     category: "PENDIDIKAN",
//     status: "PUBLISHED",
//     image_url: null,
//     is_pinned: false,
//     published_at: "2025-01-16T09:00:00",
//     created_by: "Sekretaris Desa",
//     views: 189,
//     created_at: "2025-01-16T09:00:00",
//     updated_at: "2025-01-16T09:00:00",
//   },
//   {
//     id: 4,
//     title: "Gotong Royong Bersih Desa",
//     content:
//       "Mengajak seluruh warga untuk ikut serta dalam kegiatan gotong royong bersih desa dalam rangka menyambut Tahun Baru.\n\nTanggal: 21 Januari 2025 (Minggu)\nWaktu: 06.00 - 09.00 WIB\nBerkumpul: Balai Desa\n\nMohon kesediaannya membawa peralatan seperti sapu, cangkul, dan sarung tangan.",
//     category: "KEGIATAN",
//     status: "PUBLISHED",
//     image_url: null,
//     is_pinned: false,
//     published_at: "2025-01-17T14:00:00",
//     created_by: "Kaur Umum",
//     views: 421,
//     created_at: "2025-01-17T14:00:00",
//     updated_at: "2025-01-17T14:00:00",
//   },
//   {
//     id: 5,
//     title: "Layanan Administrasi Libur Cuti Bersama",
//     content:
//       "Diberitahukan bahwa layanan administrasi desa akan libur pada tanggal 24-26 Januari 2025 dalam rangka cuti bersama Tahun Baru Imlek.\n\nLayanan akan kembali normal pada tanggal 27 Januari 2025.\n\nTerima kasih atas perhatiannya.",
//     category: "LAYANAN",
//     status: "PUBLISHED",
//     image_url: null,
//     is_pinned: false,
//     published_at: "2025-01-19T11:15:00",
//     created_by: "Admin Desa",
//     views: 156,
//     created_at: "2025-01-19T11:15:00",
//     updated_at: "2025-01-19T11:15:00",
//   },
// ];

// export function PengumumanDesa() {
//   const [announcements, setAnnouncements] =
//     useState<Announcement[]>(mockAnnouncements);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState<
//     AnnouncementCategory | "ALL"
//   >("ALL");
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showDetailModal, setShowDetailModal] = useState(false);
//   const [selectedAnnouncement, setSelectedAnnouncement] =
//     useState<Announcement | null>(null);
//   const [editMode, setEditMode] = useState(false);

//   // Form state
//   const [formData, setFormData] = useState({
//     title: "",
//     content: "",
//     category: "UMUM" as AnnouncementCategory,
//     is_pinned: false,
//   });

//   // Stats
//   const stats = {
//     total: announcements.length,
//     published: announcements.filter((a) => a.status === "PUBLISHED").length,
//     pinned: announcements.filter((a) => a.is_pinned).length,
//     totalViews: announcements.reduce((sum, a) => sum + a.views, 0),
//   };

//   // Filter
//   const filteredAnnouncements = announcements
//     .filter((announcement) => {
//       const matchSearch =
//         announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchCategory =
//         filterCategory === "ALL" || announcement.category === filterCategory;
//       return matchSearch && matchCategory;
//     })
//     .sort((a, b) => {
//       // Pinned items first
//       if (a.is_pinned && !b.is_pinned) return -1;
//       if (!a.is_pinned && b.is_pinned) return 1;
//       // Then by date
//       return (
//         new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
//       );
//     });

//   // Category badge
//   const getCategoryBadge = (category: AnnouncementCategory) => {
//     const badges = {
//       UMUM: { bg: "bg-gray-100", text: "text-gray-700", label: "Umum" },
//       KEGIATAN: { bg: "bg-blue-100", text: "text-blue-700", label: "Kegiatan" },
//       LAYANAN: { bg: "bg-teal-100", text: "text-teal-700", label: "Layanan" },
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
//     return new Intl.DateTimeFormat("id-ID", {
//       day: "numeric",
//       month: "long",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     }).format(date);
//   };

//   // Handle view detail
//   const handleViewDetail = (announcement: Announcement) => {
//     setSelectedAnnouncement(announcement);
//     setShowDetailModal(true);
//     // Increment views
//     setAnnouncements((prev) =>
//       prev.map((a) =>
//         a.id === announcement.id ? { ...a, views: a.views + 1 } : a
//       )
//     );
//   };

//   // Handle add/edit
//   const handleOpenAddModal = () => {
//     setEditMode(false);
//     setFormData({
//       title: "",
//       content: "",
//       category: "UMUM",
//       is_pinned: false,
//     });
//     setShowAddModal(true);
//   };

//   const handleEdit = (announcement: Announcement) => {
//     setEditMode(true);
//     setSelectedAnnouncement(announcement);
//     setFormData({
//       title: announcement.title,
//       content: announcement.content,
//       category: announcement.category,
//       is_pinned: announcement.is_pinned,
//     });
//     setShowAddModal(true);
//   };

//   const handleSave = () => {
//     if (editMode && selectedAnnouncement) {
//       setAnnouncements((prev) =>
//         prev.map((a) =>
//           a.id === selectedAnnouncement.id
//             ? { ...a, ...formData, updated_at: new Date().toISOString() }
//             : a
//         )
//       );
//     } else {
//       const newAnnouncement: Announcement = {
//         id: announcements.length + 1,
//         ...formData,
//         status: "PUBLISHED",
//         image_url: null,
//         published_at: new Date().toISOString(),
//         created_by: "Admin Desa",
//         views: 0,
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       };
//       setAnnouncements((prev) => [newAnnouncement, ...prev]);
//     }
//     setShowAddModal(false);
//   };

//   // Handle delete
//   const handleDelete = (id: number) => {
//     if (confirm("Apakah Anda yakin ingin menghapus pengumuman ini?")) {
//       setAnnouncements((prev) => prev.filter((a) => a.id !== id));
//       setShowDetailModal(false);
//     }
//   };

//   // Toggle pin
//   const handleTogglePin = (id: number) => {
//     setAnnouncements((prev) =>
//       prev.map((a) => (a.id === id ? { ...a, is_pinned: !a.is_pinned } : a))
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
//               <p className="text-sm text-gray-600">Total Pengumuman</p>
//               <p className="text-3xl font-bold text-gray-900 mt-1">
//                 {stats.total}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//               <Megaphone className="w-6 h-6 text-blue-600" />
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
//               <p className="text-sm text-gray-600">Dipublikasikan</p>
//               <p className="text-3xl font-bold text-green-600 mt-1">
//                 {stats.published}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//               <Eye className="w-6 h-6 text-green-600" />
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
//               <p className="text-sm text-gray-600">Dipasang Pin</p>
//               <p className="text-3xl font-bold text-orange-600 mt-1">
//                 {stats.pinned}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
//               <Pin className="w-6 h-6 text-orange-600" />
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
//               <p className="text-3xl font-bold text-teal-600 mt-1">
//                 {stats.totalViews}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
//               <Eye className="w-6 h-6 text-teal-600" />
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
//                 placeholder="Cari pengumuman..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//               />
//             </div>
//             <div className="relative">
//               <select
//                 value={filterCategory}
//                 onChange={(e) =>
//                   setFilterCategory(
//                     e.target.value as AnnouncementCategory | "ALL"
//                   )
//                 }
//                 className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
//               >
//                 <option value="ALL">Semua Kategori</option>
//                 <option value="UMUM">Umum</option>
//                 <option value="KEGIATAN">Kegiatan</option>
//                 <option value="LAYANAN">Layanan</option>
//                 <option value="PEMBANGUNAN">Pembangunan</option>
//                 <option value="KESEHATAN">Kesehatan</option>
//                 <option value="PENDIDIKAN">Pendidikan</option>
//               </select>
//               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
//             </div>
//           </div>
//           <button
//             onClick={handleOpenAddModal}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
//           >
//             <Plus className="w-5 h-5" />
//             Tambah Pengumuman
//           </button>
//         </div>
//       </div>

//       {/* Announcements List */}
//       <div className="grid grid-cols-1 gap-4">
//         <AnimatePresence mode="popLayout">
//           {filteredAnnouncements.map((announcement) => (
//             <motion.div
//               key={announcement.id}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -20 }}
//               className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
//             >
//               <div className="flex items-start justify-between gap-4">
//                 <div className="flex-1">
//                   <div className="flex items-start gap-3 mb-3">
//                     {announcement.is_pinned && (
//                       <Pin className="w-5 h-5 text-orange-600 shrink-0 mt-1" />
//                     )}
//                     <div className="flex-1">
//                       <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                         {announcement.title}
//                       </h3>
//                       <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
//                         {getCategoryBadge(announcement.category)}
//                         <span className="flex items-center gap-1">
//                           <Calendar className="w-4 h-4" />
//                           {formatDate(announcement.published_at)}
//                         </span>
//                         <span className="flex items-center gap-1">
//                           <User className="w-4 h-4" />
//                           {announcement.created_by}
//                         </span>
//                         <span className="flex items-center gap-1">
//                           <Eye className="w-4 h-4" />
//                           {announcement.views} tayangan
//                         </span>
//                       </div>
//                       <p className="text-gray-700 line-clamp-3 whitespace-pre-line">
//                         {announcement.content}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="flex flex-col gap-2">
//                   <button
//                     onClick={() => handleViewDetail(announcement)}
//                     className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
//                     title="Lihat Detail"
//                   >
//                     <Eye className="w-5 h-5" />
//                   </button>
//                   <button
//                     onClick={() => handleEdit(announcement)}
//                     className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                     title="Edit"
//                   >
//                     <Edit className="w-5 h-5" />
//                   </button>
//                   <button
//                     onClick={() => handleTogglePin(announcement.id)}
//                     className={`p-2 rounded-lg transition-colors ${
//                       announcement.is_pinned
//                         ? "text-orange-600 bg-orange-50"
//                         : "text-gray-600 hover:bg-gray-50"
//                     }`}
//                     title={announcement.is_pinned ? "Lepas Pin" : "Pasang Pin"}
//                   >
//                     <Pin className="w-5 h-5" />
//                   </button>
//                   <button
//                     onClick={() => handleDelete(announcement.id)}
//                     className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                     title="Hapus"
//                   >
//                     <Trash2 className="w-5 h-5" />
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           ))}
//         </AnimatePresence>

//         {filteredAnnouncements.length === 0 && (
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
//             <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//             <p className="text-gray-500">Tidak ada pengumuman</p>
//           </div>
//         )}
//       </div>

//       {/* Add/Edit Modal */}
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
//               className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
//             >
//               <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
//                 <h3 className="text-xl font-bold text-gray-900">
//                   {editMode ? "Edit Pengumuman" : "Tambah Pengumuman"}
//                 </h3>
//                 <button
//                   onClick={() => setShowAddModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Judul Pengumuman *
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.title}
//                     onChange={(e) =>
//                       setFormData({ ...formData, title: e.target.value })
//                     }
//                     placeholder="Masukkan judul pengumuman"
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
//                         category: e.target.value as AnnouncementCategory,
//                       })
//                     }
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//                   >
//                     <option value="UMUM">Umum</option>
//                     <option value="KEGIATAN">Kegiatan</option>
//                     <option value="LAYANAN">Layanan</option>
//                     <option value="PEMBANGUNAN">Pembangunan</option>
//                     <option value="KESEHATAN">Kesehatan</option>
//                     <option value="PENDIDIKAN">Pendidikan</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Isi Pengumuman *
//                   </label>
//                   <textarea
//                     value={formData.content}
//                     onChange={(e) =>
//                       setFormData({ ...formData, content: e.target.value })
//                     }
//                     placeholder="Masukkan isi pengumuman..."
//                     rows={10}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
//                   />
//                 </div>

//                 <div className="flex items-center gap-3">
//                   <input
//                     type="checkbox"
//                     id="is_pinned"
//                     checked={formData.is_pinned}
//                     onChange={(e) =>
//                       setFormData({ ...formData, is_pinned: e.target.checked })
//                     }
//                     className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
//                   />
//                   <label
//                     htmlFor="is_pinned"
//                     className="text-sm font-medium text-gray-700"
//                   >
//                     Pasang di bagian atas (Pin)
//                   </label>
//                 </div>

//                 <div className="flex gap-3 pt-4">
//                   <button
//                     onClick={() => setShowAddModal(false)}
//                     className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     onClick={handleSave}
//                     disabled={!formData.title || !formData.content}
//                     className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
//                   >
//                     {editMode ? "Simpan Perubahan" : "Publikasikan"}
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Detail Modal */}
//       <AnimatePresence>
//         {showDetailModal && selectedAnnouncement && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowDetailModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
//             >
//               <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
//                 <div className="flex items-center gap-3">
//                   {selectedAnnouncement.is_pinned && (
//                     <Pin className="w-5 h-5 text-orange-600" />
//                   )}
//                   <div>
//                     <h3 className="text-xl font-bold text-gray-900">
//                       {selectedAnnouncement.title}
//                     </h3>
//                     <div className="flex items-center gap-3 mt-1">
//                       {getCategoryBadge(selectedAnnouncement.category)}
//                     </div>
//                   </div>
//                 </div>
//                 <button
//                   onClick={() => setShowDetailModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="p-6 space-y-6">
//                 <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 pb-4 border-b border-gray-200">
//                   <span className="flex items-center gap-2">
//                     <Calendar className="w-4 h-4" />
//                     {formatDate(selectedAnnouncement.published_at)}
//                   </span>
//                   <span className="flex items-center gap-2">
//                     <User className="w-4 h-4" />
//                     {selectedAnnouncement.created_by}
//                   </span>
//                   <span className="flex items-center gap-2">
//                     <Eye className="w-4 h-4" />
//                     {selectedAnnouncement.views} tayangan
//                   </span>
//                 </div>

//                 <div className="prose max-w-none">
//                   <p className="text-gray-700 whitespace-pre-line leading-relaxed">
//                     {selectedAnnouncement.content}
//                   </p>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default PengumumanDesa;

const MaintenancePage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Pengumuman Desa Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur Pengumuman Desa. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    />
  );
};

export default MaintenancePage;

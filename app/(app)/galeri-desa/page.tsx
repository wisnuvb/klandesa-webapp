"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   Image as ImageIcon,
//   Plus,
//   Search,
//   Calendar,
//   Eye,
//   Download,
//   Trash2,
//   X,
//   Upload,
//   Grid3x3,
//   LayoutList,
//   ChevronDown,
// } from "lucide-react";

// // Types
// type GalleryCategory =
//   | "KEGIATAN"
//   | "PEMBANGUNAN"
//   | "ACARA"
//   | "FASILITAS"
//   | "LAINNYA";

// interface GalleryImage {
//   id: number;
//   title: string;
//   description: string;
//   category: GalleryCategory;
//   image_url: string;
//   uploaded_by: string;
//   upload_date: string;
//   views_count: number;
//   file_size: string;
// }

// // Mock Data
// const mockImages: GalleryImage[] = [
//   {
//     id: 1,
//     title: "Gotong Royong Bersih Desa",
//     description:
//       "Kegiatan gotong royong bersih desa yang dilaksanakan setiap akhir pekan dengan partisipasi seluruh warga",
//     category: "KEGIATAN",
//     image_url:
//       "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800",
//     uploaded_by: "Admin Desa",
//     upload_date: "2025-01-15T08:00:00",
//     views_count: 245,
//     file_size: "2.4 MB",
//   },
//   {
//     id: 2,
//     title: "Pembangunan Jalan Desa",
//     description:
//       "Proses pembangunan jalan desa sepanjang 500 meter untuk memperlancar akses warga",
//     category: "PEMBANGUNAN",
//     image_url:
//       "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800",
//     uploaded_by: "Sekretaris Desa",
//     upload_date: "2025-01-18T10:30:00",
//     views_count: 312,
//     file_size: "3.1 MB",
//   },
//   {
//     id: 3,
//     title: "Posyandu Balita",
//     description:
//       "Kegiatan posyandu rutin untuk pemeriksaan kesehatan balita dan ibu hamil",
//     category: "KEGIATAN",
//     image_url:
//       "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800",
//     uploaded_by: "Bidan Desa",
//     upload_date: "2025-01-16T09:00:00",
//     views_count: 189,
//     file_size: "1.8 MB",
//   },
//   {
//     id: 4,
//     title: "Perayaan HUT RI ke-79",
//     description:
//       "Perayaan HUT Kemerdekaan RI ke-79 dengan berbagai lomba dan hiburan untuk warga",
//     category: "ACARA",
//     image_url:
//       "https://images.unsplash.com/photo-1555217851-6141535bd771?w=800",
//     uploaded_by: "Kaur Umum",
//     upload_date: "2024-08-17T14:00:00",
//     views_count: 421,
//     file_size: "2.9 MB",
//   },
//   {
//     id: 5,
//     title: "Balai Desa Belo",
//     description:
//       "Gedung balai desa yang telah direnovasi dengan fasilitas lengkap untuk pelayanan warga",
//     category: "FASILITAS",
//     image_url:
//       "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800",
//     uploaded_by: "Admin Desa",
//     upload_date: "2025-01-10T11:15:00",
//     views_count: 156,
//     file_size: "2.2 MB",
//   },
//   {
//     id: 6,
//     title: "Pelatihan UMKM",
//     description:
//       "Pelatihan kewirausahaan dan pembuatan produk UMKM untuk meningkatkan ekonomi masyarakat",
//     category: "KEGIATAN",
//     image_url:
//       "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800",
//     uploaded_by: "Kepala Desa",
//     upload_date: "2025-01-12T13:30:00",
//     views_count: 278,
//     file_size: "2.7 MB",
//   },
//   {
//     id: 7,
//     title: "Taman Bermain Anak",
//     description:
//       "Taman bermain anak yang baru dibangun dengan fasilitas ayunan, perosotan, dan area bermain",
//     category: "FASILITAS",
//     image_url:
//       "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
//     uploaded_by: "Admin Desa",
//     upload_date: "2025-01-14T15:00:00",
//     views_count: 334,
//     file_size: "3.4 MB",
//   },
//   {
//     id: 8,
//     title: "Rapat Koordinasi RT/RW",
//     description:
//       "Rapat koordinasi bulanan RT/RW untuk membahas program dan kegiatan desa",
//     category: "KEGIATAN",
//     image_url:
//       "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800",
//     uploaded_by: "Sekretaris Desa",
//     upload_date: "2025-01-05T09:30:00",
//     views_count: 167,
//     file_size: "1.9 MB",
//   },
// ];

// export function GaleriDesa() {
//   const [images, setImages] = useState<GalleryImage[]>(mockImages);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterCategory, setFilterCategory] = useState<GalleryCategory | "ALL">(
//     "ALL"
//   );
//   const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
//   const [showUploadModal, setShowUploadModal] = useState(false);
//   const [showDetailModal, setShowDetailModal] = useState(false);
//   const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

//   // Form state
//   const [formData, setFormData] = useState({
//     title: "",
//     description: "",
//     category: "KEGIATAN" as GalleryCategory,
//   });

//   // Stats
//   const stats = {
//     totalImages: images.length,
//     totalViews: images.reduce((sum, img) => sum + img.views_count, 0),
//     totalSize: images
//       .reduce((sum, img) => {
//         const size = parseFloat(img.file_size);
//         return sum + size;
//       }, 0)
//       .toFixed(1),
//     categories: [...new Set(images.map((img) => img.category))].length,
//   };

//   // Filter
//   const filteredImages = images
//     .filter((image) => {
//       const matchSearch =
//         image.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//         image.description.toLowerCase().includes(searchQuery.toLowerCase());
//       const matchCategory =
//         filterCategory === "ALL" || image.category === filterCategory;
//       return matchSearch && matchCategory;
//     })
//     .sort(
//       (a, b) =>
//         new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime()
//     );

//   // Category badge
//   const getCategoryBadge = (category: GalleryCategory) => {
//     const badges = {
//       KEGIATAN: { bg: "bg-blue-100", text: "text-blue-700", label: "Kegiatan" },
//       PEMBANGUNAN: {
//         bg: "bg-orange-100",
//         text: "text-orange-700",
//         label: "Pembangunan",
//       },
//       ACARA: { bg: "bg-purple-100", text: "text-purple-700", label: "Acara" },
//       FASILITAS: {
//         bg: "bg-green-100",
//         text: "text-green-700",
//         label: "Fasilitas",
//       },
//       LAINNYA: { bg: "bg-gray-100", text: "text-gray-700", label: "Lainnya" },
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
//     }).format(date);
//   };

//   // Handle view detail
//   const handleViewDetail = (image: GalleryImage) => {
//     setSelectedImage(image);
//     setShowDetailModal(true);
//     // Increment views
//     setImages((prev) =>
//       prev.map((img) =>
//         img.id === image.id ? { ...img, views_count: img.views_count + 1 } : img
//       )
//     );
//   };

//   // Handle upload
//   const handleUpload = () => {
//     if (!formData.title || !formData.description) return;

//     const newImage: GalleryImage = {
//       id: images.length + 1,
//       ...formData,
//       image_url: `https://images.unsplash.com/photo-${Date.now()}?w=800`,
//       uploaded_by: "Anda",
//       upload_date: new Date().toISOString(),
//       views_count: 0,
//       file_size: "2.1 MB",
//     };

//     setImages((prev) => [newImage, ...prev]);
//     setShowUploadModal(false);
//     setFormData({ title: "", description: "", category: "KEGIATAN" });
//   };

//   // Handle delete
//   const handleDelete = (id: number) => {
//     if (confirm("Apakah Anda yakin ingin menghapus gambar ini?")) {
//       setImages((prev) => prev.filter((img) => img.id !== id));
//       setShowDetailModal(false);
//     }
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
//               <p className="text-sm text-gray-600">Total Foto</p>
//               <p className="text-3xl font-bold text-gray-900 mt-1">
//                 {stats.totalImages}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//               <ImageIcon className="w-6 h-6 text-blue-600" />
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

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.2 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Total Ukuran</p>
//               <p className="text-3xl font-bold text-purple-600 mt-1">
//                 {stats.totalSize} MB
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
//               <Upload className="w-6 h-6 text-purple-600" />
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
//               <p className="text-sm text-gray-600">Kategori</p>
//               <p className="text-3xl font-bold text-orange-600 mt-1">
//                 {stats.categories}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
//               <Grid3x3 className="w-6 h-6 text-orange-600" />
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
//                 placeholder="Cari foto..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//               />
//             </div>
//             <div className="relative">
//               <select
//                 value={filterCategory}
//                 onChange={(e) =>
//                   setFilterCategory(e.target.value as GalleryCategory | "ALL")
//                 }
//                 className="pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none bg-white"
//               >
//                 <option value="ALL">Semua Kategori</option>
//                 <option value="KEGIATAN">Kegiatan</option>
//                 <option value="PEMBANGUNAN">Pembangunan</option>
//                 <option value="ACARA">Acara</option>
//                 <option value="FASILITAS">Fasilitas</option>
//                 <option value="LAINNYA">Lainnya</option>
//               </select>
//               <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
//             </div>
//           </div>
//           <div className="flex gap-2">
//             <div className="flex border border-gray-300 rounded-lg overflow-hidden">
//               <button
//                 onClick={() => setViewMode("grid")}
//                 className={`p-2 ${
//                   viewMode === "grid"
//                     ? "bg-teal-600 text-white"
//                     : "bg-white text-gray-600 hover:bg-gray-50"
//                 }`}
//               >
//                 <Grid3x3 className="w-5 h-5" />
//               </button>
//               <button
//                 onClick={() => setViewMode("list")}
//                 className={`p-2 ${
//                   viewMode === "list"
//                     ? "bg-teal-600 text-white"
//                     : "bg-white text-gray-600 hover:bg-gray-50"
//                 }`}
//               >
//                 <LayoutList className="w-5 h-5" />
//               </button>
//             </div>
//             <button
//               onClick={() => setShowUploadModal(true)}
//               className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
//             >
//               <Plus className="w-5 h-5" />
//               Upload Foto
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Gallery */}
//       {viewMode === "grid" ? (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
//           <AnimatePresence mode="popLayout">
//             {filteredImages.map((image) => (
//               <motion.div
//                 key={image.id}
//                 initial={{ opacity: 0, scale: 0.9 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 exit={{ opacity: 0, scale: 0.9 }}
//                 className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
//                 onClick={() => handleViewDetail(image)}
//               >
//                 <div className="relative aspect-video overflow-hidden">
//                   <img
//                     src={image.image_url}
//                     alt={image.title}
//                     className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
//                   />
//                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//                   <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
//                     <div className="flex items-center gap-2 text-white text-sm">
//                       <Eye className="w-4 h-4" />
//                       <span>{image.views_count}</span>
//                     </div>
//                   </div>
//                 </div>
//                 <div className="p-4">
//                   <div className="flex items-start justify-between gap-2 mb-2">
//                     <h3 className="font-semibold text-gray-900 line-clamp-1">
//                       {image.title}
//                     </h3>
//                     {getCategoryBadge(image.category)}
//                   </div>
//                   <p className="text-sm text-gray-600 line-clamp-2 mb-3">
//                     {image.description}
//                   </p>
//                   <div className="flex items-center justify-between text-xs text-gray-500">
//                     <span className="flex items-center gap-1">
//                       <Calendar className="w-3 h-3" />
//                       {formatDate(image.upload_date)}
//                     </span>
//                     <span>{image.file_size}</span>
//                   </div>
//                 </div>
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           <AnimatePresence mode="popLayout">
//             {filteredImages.map((image) => (
//               <motion.div
//                 key={image.id}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0, y: -20 }}
//                 className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
//                 onClick={() => handleViewDetail(image)}
//               >
//                 <div className="flex items-start gap-4">
//                   <div className="w-32 h-24 flex-shrink-0 rounded-lg overflow-hidden">
//                     <img
//                       src={image.image_url}
//                       alt={image.title}
//                       className="w-full h-full object-cover"
//                     />
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <div className="flex items-start justify-between gap-3 mb-2">
//                       <h3 className="text-lg font-semibold text-gray-900">
//                         {image.title}
//                       </h3>
//                       {getCategoryBadge(image.category)}
//                     </div>
//                     <p className="text-gray-600 text-sm mb-3 line-clamp-2">
//                       {image.description}
//                     </p>
//                     <div className="flex items-center gap-6 text-sm text-gray-500">
//                       <span className="flex items-center gap-1">
//                         <Calendar className="w-4 h-4" />
//                         {formatDate(image.upload_date)}
//                       </span>
//                       <span className="flex items-center gap-1">
//                         <Eye className="w-4 h-4" />
//                         {image.views_count} tayangan
//                       </span>
//                       <span>{image.file_size}</span>
//                       <span>oleh {image.uploaded_by}</span>
//                     </div>
//                   </div>
//                 </div>
//               </motion.div>
//             ))}
//           </AnimatePresence>
//         </div>
//       )}

//       {filteredImages.length === 0 && (
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
//           <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//           <p className="text-gray-500">Tidak ada foto</p>
//         </div>
//       )}

//       {/* Upload Modal */}
//       <AnimatePresence>
//         {showUploadModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowUploadModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <h3 className="text-xl font-bold text-gray-900">Upload Foto</h3>
//                 <button
//                   onClick={() => setShowUploadModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="p-6 space-y-4">
//                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-teal-400 transition-colors cursor-pointer">
//                   <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                   <p className="text-gray-700 font-medium mb-1">
//                     Klik untuk upload gambar
//                   </p>
//                   <p className="text-sm text-gray-500">PNG, JPG hingga 5MB</p>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Judul Foto *
//                   </label>
//                   <input
//                     type="text"
//                     value={formData.title}
//                     onChange={(e) =>
//                       setFormData({ ...formData, title: e.target.value })
//                     }
//                     placeholder="Masukkan judul foto"
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
//                         category: e.target.value as GalleryCategory,
//                       })
//                     }
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
//                   >
//                     <option value="KEGIATAN">Kegiatan</option>
//                     <option value="PEMBANGUNAN">Pembangunan</option>
//                     <option value="ACARA">Acara</option>
//                     <option value="FASILITAS">Fasilitas</option>
//                     <option value="LAINNYA">Lainnya</option>
//                   </select>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Deskripsi *
//                   </label>
//                   <textarea
//                     value={formData.description}
//                     onChange={(e) =>
//                       setFormData({ ...formData, description: e.target.value })
//                     }
//                     placeholder="Masukkan deskripsi foto..."
//                     rows={4}
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
//                   />
//                 </div>

//                 <div className="flex gap-3 pt-4">
//                   <button
//                     onClick={() => setShowUploadModal(false)}
//                     className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     onClick={handleUpload}
//                     disabled={!formData.title || !formData.description}
//                     className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300"
//                   >
//                     Upload Foto
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Detail Modal */}
//       <AnimatePresence>
//         {showDetailModal && selectedImage && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowDetailModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   <h3 className="text-xl font-bold text-gray-900">
//                     {selectedImage.title}
//                   </h3>
//                   {getCategoryBadge(selectedImage.category)}
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <a
//                     href={selectedImage.image_url}
//                     download
//                     className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
//                     title="Download"
//                   >
//                     <Download className="w-5 h-5" />
//                   </a>
//                   <button
//                     onClick={() => handleDelete(selectedImage.id)}
//                     className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                     title="Hapus"
//                   >
//                     <Trash2 className="w-5 h-5" />
//                   </button>
//                   <button
//                     onClick={() => setShowDetailModal(false)}
//                     className="p-2 hover:bg-gray-100 rounded-lg"
//                   >
//                     <X className="w-5 h-5" />
//                   </button>
//                 </div>
//               </div>

//               <div className="flex-1 overflow-y-auto">
//                 <div className="aspect-video w-full bg-gray-100">
//                   <img
//                     src={selectedImage.image_url}
//                     alt={selectedImage.title}
//                     className="w-full h-full object-contain"
//                   />
//                 </div>

//                 <div className="p-6 space-y-4">
//                   <div>
//                     <h4 className="font-semibold text-gray-900 mb-2">
//                       Deskripsi
//                     </h4>
//                     <p className="text-gray-700 leading-relaxed">
//                       {selectedImage.description}
//                     </p>
//                   </div>

//                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
//                     <div>
//                       <p className="text-xs text-gray-500 mb-1">
//                         Diupload oleh
//                       </p>
//                       <p className="font-medium text-gray-900">
//                         {selectedImage.uploaded_by}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-gray-500 mb-1">
//                         Tanggal Upload
//                       </p>
//                       <p className="font-medium text-gray-900">
//                         {formatDate(selectedImage.upload_date)}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-gray-500 mb-1">Tayangan</p>
//                       <p className="font-medium text-gray-900">
//                         {selectedImage.views_count}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-xs text-gray-500 mb-1">Ukuran File</p>
//                       <p className="font-medium text-gray-900">
//                         {selectedImage.file_size}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default GaleriDesa;

const MaintenancePage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Galeri Desa Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur Galeri Desa. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    />
  );
};

export default MaintenancePage;

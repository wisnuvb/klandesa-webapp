"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   HardDrive,
//   FolderOpen,
//   FileText,
//   Image as ImageIcon,
//   File,
//   Download,
//   Trash2,
//   Search,
//   Filter,
//   Upload,
//   Grid3x3,
//   List,
//   ChevronRight,
//   Home,
//   Eye,
//   FolderPlus,
//   MoreVertical,
//   X,
//   Check,
//   AlertCircle,
//   FileSpreadsheet,
//   Archive,
//   ChevronDown,
//   Zap,
//   Crown,
//   TrendingUp,
//   Sparkles,
//   Star,
//   Building2,
//   Rocket,
//   CheckCircle2,
// } from "lucide-react";

// // Types
// type FileType = "IMAGE" | "DOCUMENT" | "PDF" | "EXCEL" | "ARCHIVE" | "OTHER";
// type ViewMode = "grid" | "list";
// type StoragePlan =
//   | "FREE"
//   | "STARTER"
//   | "PROFESSIONAL"
//   | "BUSINESS"
//   | "ENTERPRISE"
//   | "PROMAX";
// type PaymentMethod = "QRIS" | "VA" | "EWALLET";

// interface FileItem {
//   id: number;
//   name: string;
//   type: "file" | "folder";
//   file_type?: FileType;
//   extension?: string;
//   size: number; // in bytes
//   created_at: string;
//   modified_at: string;
//   parent_folder: string;
//   thumbnail_url?: string;
//   uploaded_by: string;
// }

// interface PlanDetail {
//   id: StoragePlan;
//   name: string;
//   icon: React.ElementType;
//   storage: number; // in GB
//   storageLabel: string;
//   price: number; // per bulan
//   priceLabel: string;
//   color: string;
//   bgColor: string;
//   borderColor: string;
//   features: string[];
//   popular?: boolean;
// }

// // Plan Data
// const STORAGE_PLANS: PlanDetail[] = [
//   {
//     id: "FREE",
//     name: "Gratis",
//     icon: Zap,
//     storage: 1,
//     storageLabel: "1 GB",
//     price: 0,
//     priceLabel: "GRATIS",
//     color: "text-gray-600",
//     bgColor: "bg-gray-100",
//     borderColor: "border-gray-300",
//     features: [
//       "1 GB Storage",
//       "Upload file dasar",
//       "Akses file manager",
//       "Support email",
//     ],
//   },
//   {
//     id: "STARTER",
//     name: "Starter",
//     icon: Rocket,
//     storage: 5,
//     storageLabel: "5 GB",
//     price: 35000,
//     priceLabel: "Rp 35.000",
//     color: "text-blue-600",
//     bgColor: "bg-blue-100",
//     borderColor: "border-blue-300",
//     features: [
//       "5 GB Storage",
//       "Upload file unlimited",
//       "File sharing",
//       "Support prioritas",
//     ],
//   },
//   {
//     id: "PROFESSIONAL",
//     name: "Professional",
//     icon: TrendingUp,
//     storage: 20,
//     storageLabel: "20 GB",
//     price: 99000,
//     priceLabel: "Rp 99.000",
//     color: "text-teal-600",
//     bgColor: "bg-teal-100",
//     borderColor: "border-teal-300",
//     features: [
//       "20 GB Storage",
//       "Semua fitur Starter",
//       "Versioning file",
//       "Backup otomatis",
//     ],
//     popular: true,
//   },
//   {
//     id: "BUSINESS",
//     name: "Business",
//     icon: Building2,
//     storage: 50,
//     storageLabel: "50 GB",
//     price: 199000,
//     priceLabel: "Rp 199.000",
//     color: "text-purple-600",
//     bgColor: "bg-purple-100",
//     borderColor: "border-purple-300",
//     features: [
//       "50 GB Storage",
//       "Semua fitur Professional",
//       "Multi-user access",
//       "Audit log",
//     ],
//   },
//   {
//     id: "ENTERPRISE",
//     name: "Enterprise",
//     icon: Crown,
//     storage: 100,
//     storageLabel: "100 GB",
//     price: 349000,
//     priceLabel: "Rp 349.000",
//     color: "text-orange-600",
//     bgColor: "bg-orange-100",
//     borderColor: "border-orange-300",
//     features: [
//       "100 GB Storage",
//       "Semua fitur Business",
//       "API access",
//       "Dedicated support",
//     ],
//   },
//   {
//     id: "PROMAX",
//     name: "Pro Max",
//     icon: Sparkles,
//     storage: 250,
//     storageLabel: "250 GB",
//     price: 699000,
//     priceLabel: "Rp 699.000",
//     color: "text-pink-600",
//     bgColor: "bg-pink-100",
//     borderColor: "border-pink-300",
//     features: [
//       "250 GB Storage",
//       "Semua fitur Enterprise",
//       "Custom branding",
//       "99.9% uptime SLA",
//     ],
//   },
// ];

// // Mock Data
// const mockFiles: FileItem[] = [
//   {
//     id: 1,
//     name: "Dokumen Administrasi",
//     type: "folder",
//     size: 45600000, // 45.6 MB
//     created_at: "2024-01-10",
//     modified_at: "2024-01-15",
//     parent_folder: "/",
//     uploaded_by: "Admin Desa",
//   },
//   {
//     id: 2,
//     name: "Foto Kegiatan",
//     type: "folder",
//     size: 125000000, // 125 MB
//     created_at: "2024-01-08",
//     modified_at: "2024-01-14",
//     parent_folder: "/",
//     uploaded_by: "Admin Desa",
//   },
//   {
//     id: 3,
//     name: "SK Kepala Desa 2024.pdf",
//     type: "file",
//     file_type: "PDF",
//     extension: "pdf",
//     size: 2400000, // 2.4 MB
//     created_at: "2024-01-15",
//     modified_at: "2024-01-15",
//     parent_folder: "/",
//     uploaded_by: "Sekretaris Desa",
//   },
//   {
//     id: 4,
//     name: "Laporan Keuangan Q1.xlsx",
//     type: "file",
//     file_type: "EXCEL",
//     extension: "xlsx",
//     size: 850000, // 850 KB
//     created_at: "2024-01-14",
//     modified_at: "2024-01-14",
//     parent_folder: "/",
//     uploaded_by: "Bendahara",
//   },
//   {
//     id: 5,
//     name: "Surat Edaran.docx",
//     type: "file",
//     file_type: "DOCUMENT",
//     extension: "docx",
//     size: 450000, // 450 KB
//     created_at: "2024-01-13",
//     modified_at: "2024-01-13",
//     parent_folder: "/",
//     uploaded_by: "Kaur Umum",
//   },
//   {
//     id: 6,
//     name: "Banner Event.png",
//     type: "file",
//     file_type: "IMAGE",
//     extension: "png",
//     size: 1200000, // 1.2 MB
//     created_at: "2024-01-12",
//     modified_at: "2024-01-12",
//     parent_folder: "/",
//     thumbnail_url:
//       "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=400&h=300&fit=crop",
//     uploaded_by: "Admin Desa",
//   },
//   {
//     id: 7,
//     name: "Backup Data.zip",
//     type: "file",
//     file_type: "ARCHIVE",
//     extension: "zip",
//     size: 15600000, // 15.6 MB
//     created_at: "2024-01-11",
//     modified_at: "2024-01-11",
//     parent_folder: "/",
//     uploaded_by: "Admin Desa",
//   },
// ];

// export function ArsipDigital() {
//   const [files, setFiles] = useState<FileItem[]>(mockFiles);
//   const [viewMode, setViewMode] = useState<ViewMode>("grid");
//   const [currentPath, setCurrentPath] = useState("/");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterType, setFilterType] = useState<FileType | "ALL">("ALL");
//   const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
//   const [selectedFiles, setSelectedFiles] = useState<number[]>([]);
//   const [showUploadModal, setShowUploadModal] = useState(false);
//   const [showPreviewModal, setShowPreviewModal] = useState(false);
//   const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
//   const [showNewFolderModal, setShowNewFolderModal] = useState(false);
//   const [newFolderName, setNewFolderName] = useState("");

//   // Storage Plan states
//   const [currentPlan, setCurrentPlan] = useState<StoragePlan>("FREE");
//   const [showUpgradeModal, setShowUpgradeModal] = useState(false);
//   const [selectedPlan, setSelectedPlan] = useState<StoragePlan | null>(null);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
//   const [selectedPaymentMethod, setSelectedPaymentMethod] =
//     useState<PaymentMethod>("QRIS");

//   // Get current plan details
//   const currentPlanDetail =
//     STORAGE_PLANS.find((p) => p.id === currentPlan) || STORAGE_PLANS[0];

//   // Storage quota based on current plan
//   const totalQuota = currentPlanDetail.storage * 1024 * 1024 * 1024; // Convert GB to bytes
//   const usedStorage = files.reduce((acc, file) => acc + file.size, 0);
//   const remainingStorage = totalQuota - usedStorage;
//   const usagePercentage = (usedStorage / totalQuota) * 100;

//   // Get quota color
//   const getQuotaColor = () => {
//     if (usagePercentage >= 90) return "bg-red-500";
//     if (usagePercentage >= 70) return "bg-yellow-500";
//     return "bg-teal-500";
//   };

//   const getQuotaTextColor = () => {
//     if (usagePercentage >= 90) return "text-red-600";
//     if (usagePercentage >= 70) return "text-yellow-600";
//     return "text-teal-600";
//   };

//   // Format bytes to readable size
//   const formatFileSize = (bytes: number): string => {
//     if (bytes === 0) return "0 B";
//     const k = 1024;
//     const sizes = ["B", "KB", "MB", "GB", "TB"];
//     const i = Math.floor(Math.log(bytes) / Math.log(k));
//     return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
//   };

//   // Get file icon
//   const getFileIcon = (file: FileItem) => {
//     if (file.type === "folder") {
//       return <FolderOpen className="w-8 h-8 text-yellow-500" />;
//     }

//     switch (file.file_type) {
//       case "IMAGE":
//         return <ImageIcon className="w-8 h-8 text-purple-500" />;
//       case "PDF":
//         return <FileText className="w-8 h-8 text-red-500" />;
//       case "EXCEL":
//         return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
//       case "DOCUMENT":
//         return <FileText className="w-8 h-8 text-blue-500" />;
//       case "ARCHIVE":
//         return <Archive className="w-8 h-8 text-orange-500" />;
//       default:
//         return <File className="w-8 h-8 text-gray-500" />;
//     }
//   };

//   // Filter and sort files
//   const filteredFiles = files
//     .filter((file) => {
//       const matchSearch = file.name
//         .toLowerCase()
//         .includes(searchQuery.toLowerCase());
//       const matchFilter = filterType === "ALL" || file.file_type === filterType;
//       const matchPath = file.parent_folder === currentPath;
//       return matchSearch && matchFilter && matchPath;
//     })
//     .sort((a, b) => {
//       switch (sortBy) {
//         case "name":
//           return a.name.localeCompare(b.name);
//         case "date":
//           return (
//             new Date(b.modified_at).getTime() -
//             new Date(a.modified_at).getTime()
//           );
//         case "size":
//           return b.size - a.size;
//         default:
//           return 0;
//       }
//     });

//   // Breadcrumb navigation
//   const pathSegments = currentPath.split("/").filter(Boolean);

//   const handleFileClick = (file: FileItem) => {
//     if (file.type === "folder") {
//       setCurrentPath(`${currentPath}${file.name}/`);
//     } else {
//       setPreviewFile(file);
//       setShowPreviewModal(true);
//     }
//   };

//   const handleBreadcrumbClick = (index: number) => {
//     if (index === -1) {
//       setCurrentPath("/");
//     } else {
//       const newPath = "/" + pathSegments.slice(0, index + 1).join("/") + "/";
//       setCurrentPath(newPath);
//     }
//   };

//   const toggleFileSelection = (id: number) => {
//     if (selectedFiles.includes(id)) {
//       setSelectedFiles(selectedFiles.filter((fId) => fId !== id));
//     } else {
//       setSelectedFiles([...selectedFiles, id]);
//     }
//   };

//   const handleDeleteSelected = () => {
//     if (confirm(`Hapus ${selectedFiles.length} file?`)) {
//       setFiles(files.filter((f) => !selectedFiles.includes(f.id)));
//       setSelectedFiles([]);
//     }
//   };

//   const handleCreateFolder = () => {
//     if (newFolderName.trim()) {
//       const newFolder: FileItem = {
//         id: files.length + 1,
//         name: newFolderName,
//         type: "folder",
//         size: 0,
//         created_at: new Date().toISOString().split("T")[0],
//         modified_at: new Date().toISOString().split("T")[0],
//         parent_folder: currentPath,
//         uploaded_by: "Admin Desa",
//       };
//       setFiles([...files, newFolder]);
//       setNewFolderName("");
//       setShowNewFolderModal(false);
//     }
//   };

//   const handleUpgradePlan = (planId: StoragePlan) => {
//     setSelectedPlan(planId);
//     setShowUpgradeModal(false);
//     setShowPaymentModal(true);
//   };

//   const handlePayment = () => {
//     // Simulate payment process
//     if (selectedPlan) {
//       setCurrentPlan(selectedPlan);
//       setShowPaymentModal(false);
//       setSelectedPlan(null);
//       alert("Pembayaran berhasil! Paket storage Anda telah diupgrade.");
//     }
//   };

//   // Calculate file type statistics
//   const fileStats = {
//     images: files
//       .filter((f) => f.file_type === "IMAGE")
//       .reduce((acc, f) => acc + f.size, 0),
//     documents: files
//       .filter((f) => f.file_type === "DOCUMENT")
//       .reduce((acc, f) => acc + f.size, 0),
//     pdfs: files
//       .filter((f) => f.file_type === "PDF")
//       .reduce((acc, f) => acc + f.size, 0),
//     excel: files
//       .filter((f) => f.file_type === "EXCEL")
//       .reduce((acc, f) => acc + f.size, 0),
//     archives: files
//       .filter((f) => f.file_type === "ARCHIVE")
//       .reduce((acc, f) => acc + f.size, 0),
//     others: files
//       .filter((f) => f.file_type === "OTHER")
//       .reduce((acc, f) => acc + f.size, 0),
//   };

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
//       {/* Left Sidebar - Storage Info & Plans */}
//       <div className="lg:col-span-3 space-y-6">
//         {/* Current Plan Card */}
//         <motion.div
//           initial={{ opacity: 0, x: -20 }}
//           animate={{ opacity: 1, x: 0 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
//         >
//           <div
//             className={`${currentPlanDetail.bgColor} px-6 py-4 border-b ${currentPlanDetail.borderColor}`}
//           >
//             <div className="flex items-center gap-3">
//               <div
//                 className={`w-12 h-12 ${currentPlanDetail.bgColor} rounded-lg flex items-center justify-center`}
//               >
//                 <currentPlanDetail.icon
//                   className={`w-6 h-6 ${currentPlanDetail.color}`}
//                 />
//               </div>
//               <div>
//                 <p className="text-xs text-gray-600 uppercase tracking-wide">
//                   Paket Aktif
//                 </p>
//                 <p className={`font-bold ${currentPlanDetail.color}`}>
//                   {currentPlanDetail.name}
//                 </p>
//               </div>
//             </div>
//           </div>

//           <div className="p-6 space-y-4">
//             {/* Storage Usage */}
//             <div>
//               <div className="flex items-center justify-between mb-2">
//                 <span className="text-sm text-gray-600">Storage Terpakai</span>
//                 <span
//                   className={`text-sm font-semibold ${getQuotaTextColor()}`}
//                 >
//                   {usagePercentage.toFixed(1)}%
//                 </span>
//               </div>
//               <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
//                 <div
//                   className={`h-full ${getQuotaColor()} transition-all duration-500`}
//                   style={{ width: `${Math.min(usagePercentage, 100)}%` }}
//                 />
//               </div>
//               <p className="text-xs text-gray-500 mt-2">
//                 {formatFileSize(usedStorage)} dari{" "}
//                 {currentPlanDetail.storageLabel}
//               </p>
//             </div>

//             {/* Quick Stats */}
//             <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
//               <div>
//                 <p className="text-xs text-gray-500">Total File</p>
//                 <p className="text-lg font-bold text-gray-900">
//                   {files.length}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-500">Sisa Kuota</p>
//                 <p className="text-lg font-bold text-green-600">
//                   {formatFileSize(remainingStorage)}
//                 </p>
//               </div>
//             </div>

//             {/* Upgrade Button */}
//             {currentPlan !== "PROMAX" && (
//               <button
//                 onClick={() => setShowUpgradeModal(true)}
//                 className="w-full mt-4 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all flex items-center justify-center gap-2 shadow-sm"
//               >
//                 <Sparkles className="w-4 h-4" />
//                 Upgrade Paket
//               </button>
//             )}
//           </div>
//         </motion.div>

//         {/* Storage Warning */}
//         {usagePercentage >= 80 && (
//           <motion.div
//             initial={{ opacity: 0, x: -20 }}
//             animate={{ opacity: 1, x: 0 }}
//             className={`${
//               usagePercentage >= 90
//                 ? "bg-red-50 border-red-200"
//                 : "bg-yellow-50 border-yellow-200"
//             } rounded-xl border p-4`}
//           >
//             <div className="flex gap-3">
//               <AlertCircle
//                 className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
//                   usagePercentage >= 90 ? "text-red-600" : "text-yellow-600"
//                 }`}
//               />
//               <div>
//                 <p
//                   className={`text-sm font-semibold ${
//                     usagePercentage >= 90 ? "text-red-900" : "text-yellow-900"
//                   }`}
//                 >
//                   {usagePercentage >= 90
//                     ? "Storage Hampir Penuh!"
//                     : "Storage Mulai Penuh"}
//                 </p>
//                 <p
//                   className={`text-xs mt-1 ${
//                     usagePercentage >= 90 ? "text-red-700" : "text-yellow-700"
//                   }`}
//                 >
//                   {usagePercentage >= 90
//                     ? "Upgrade paket Anda atau hapus file yang tidak diperlukan."
//                     : "Pertimbangkan untuk upgrade paket storage Anda."}
//                 </p>
//                 {currentPlan !== "PROMAX" && (
//                   <button
//                     onClick={() => setShowUpgradeModal(true)}
//                     className={`mt-3 text-xs font-semibold ${
//                       usagePercentage >= 90
//                         ? "text-red-700 hover:text-red-800"
//                         : "text-yellow-700 hover:text-yellow-800"
//                     } underline`}
//                   >
//                     Lihat Paket →
//                   </button>
//                 )}
//               </div>
//             </div>
//           </motion.div>
//         )}

//         {/* Storage by Category */}
//         <motion.div
//           initial={{ opacity: 0, x: -20 }}
//           animate={{ opacity: 1, x: 0 }}
//           transition={{ delay: 0.1 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
//             <HardDrive className="w-4 h-4 text-teal-600" />
//             Storage by Kategori
//           </h3>
//           <div className="space-y-3">
//             {[
//               {
//                 label: "Gambar",
//                 size: fileStats.images,
//                 color: "bg-purple-500",
//                 icon: ImageIcon,
//               },
//               {
//                 label: "PDF",
//                 size: fileStats.pdfs,
//                 color: "bg-red-500",
//                 icon: FileText,
//               },
//               {
//                 label: "Dokumen",
//                 size: fileStats.documents,
//                 color: "bg-blue-500",
//                 icon: FileText,
//               },
//               {
//                 label: "Excel",
//                 size: fileStats.excel,
//                 color: "bg-green-500",
//                 icon: FileSpreadsheet,
//               },
//               {
//                 label: "Arsip",
//                 size: fileStats.archives,
//                 color: "bg-orange-500",
//                 icon: Archive,
//               },
//             ].map((category) => {
//               const percentage =
//                 usedStorage > 0 ? (category.size / usedStorage) * 100 : 0;
//               const Icon = category.icon;
//               return (
//                 <div key={category.label}>
//                   <div className="flex items-center justify-between mb-1">
//                     <div className="flex items-center gap-2">
//                       <Icon className="w-3.5 h-3.5 text-gray-500" />
//                       <span className="text-xs text-gray-700">
//                         {category.label}
//                       </span>
//                     </div>
//                     <span className="text-xs font-medium text-gray-900">
//                       {formatFileSize(category.size)}
//                     </span>
//                   </div>
//                   <div className="w-full bg-gray-200 rounded-full h-1.5">
//                     <div
//                       className={`h-full ${category.color} rounded-full transition-all duration-500`}
//                       style={{ width: `${percentage}%` }}
//                     />
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </motion.div>
//       </div>

//       {/* Right Content - File Manager */}
//       <div className="lg:col-span-9 space-y-6">
//         {/* Stats Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//           >
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600 mb-1">Total File</p>
//                 <p className="text-3xl font-bold text-gray-900">
//                   {files.length}
//                 </p>
//               </div>
//               <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                 <FileText className="w-6 h-6 text-blue-600" />
//               </div>
//             </div>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.1 }}
//             className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//           >
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600 mb-1">Total Ukuran</p>
//                 <p className="text-3xl font-bold text-gray-900">
//                   {formatFileSize(usedStorage)}
//                 </p>
//               </div>
//               <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
//                 <HardDrive className="w-6 h-6 text-purple-600" />
//               </div>
//             </div>
//           </motion.div>

//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ delay: 0.2 }}
//             className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//           >
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm text-gray-600 mb-1">Kuota Terpakai</p>
//                 <p className={`text-3xl font-bold ${getQuotaTextColor()}`}>
//                   {usagePercentage.toFixed(1)}%
//                 </p>
//               </div>
//               <div
//                 className={`w-12 h-12 ${
//                   usagePercentage >= 90
//                     ? "bg-red-100"
//                     : usagePercentage >= 70
//                     ? "bg-yellow-100"
//                     : "bg-teal-100"
//                 } rounded-lg flex items-center justify-center`}
//               >
//                 <HardDrive
//                   className={`w-6 h-6 ${
//                     usagePercentage >= 90
//                       ? "text-red-600"
//                       : usagePercentage >= 70
//                       ? "text-yellow-600"
//                       : "text-teal-600"
//                   }`}
//                 />
//               </div>
//             </div>
//           </motion.div>
//         </div>

//         {/* Main File Manager Card */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.3 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200"
//         >
//           {/* Toolbar */}
//           <div className="p-4 border-b border-gray-200">
//             <div className="flex flex-col lg:flex-row gap-4">
//               {/* Left side - Breadcrumb */}
//               <div className="flex items-center gap-2 flex-1">
//                 <button
//                   onClick={() => handleBreadcrumbClick(-1)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <Home className="w-4 h-4 text-gray-600" />
//                 </button>
//                 {pathSegments.map((segment, index) => (
//                   <div key={index} className="flex items-center gap-2">
//                     <ChevronRight className="w-4 h-4 text-gray-400" />
//                     <button
//                       onClick={() => handleBreadcrumbClick(index)}
//                       className="text-sm text-gray-600 hover:text-teal-600 transition-colors"
//                     >
//                       {segment}
//                     </button>
//                   </div>
//                 ))}
//               </div>

//               {/* Right side - Actions */}
//               <div className="flex items-center gap-2">
//                 <button
//                   onClick={() => setShowNewFolderModal(true)}
//                   className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   <FolderPlus className="w-4 h-4" />
//                   <span className="hidden sm:inline">Folder Baru</span>
//                 </button>
//                 <button
//                   onClick={() => setShowUploadModal(true)}
//                   className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
//                 >
//                   <Upload className="w-4 h-4" />
//                   <span className="hidden sm:inline">Upload File</span>
//                 </button>
//                 <div className="h-6 w-px bg-gray-300" />
//                 <button
//                   onClick={() => setViewMode("grid")}
//                   className={`p-2 rounded-lg transition-colors ${
//                     viewMode === "grid"
//                       ? "bg-teal-50 text-teal-600"
//                       : "text-gray-600 hover:bg-gray-100"
//                   }`}
//                 >
//                   <Grid3x3 className="w-4 h-4" />
//                 </button>
//                 <button
//                   onClick={() => setViewMode("list")}
//                   className={`p-2 rounded-lg transition-colors ${
//                     viewMode === "list"
//                       ? "bg-teal-50 text-teal-600"
//                       : "text-gray-600 hover:bg-gray-100"
//                   }`}
//                 >
//                   <List className="w-4 h-4" />
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Filters */}
//           <div className="p-4 border-b border-gray-200 bg-gray-50">
//             <div className="flex flex-col sm:flex-row gap-3">
//               <div className="flex-1 relative">
//                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                 <input
//                   type="text"
//                   placeholder="Cari file atau folder..."
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                 />
//               </div>
//               <div className="flex gap-2">
//                 <div className="relative">
//                   <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
//                   <select
//                     value={filterType}
//                     onChange={(e) =>
//                       setFilterType(e.target.value as FileType | "ALL")
//                     }
//                     className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white text-sm"
//                   >
//                     <option value="ALL">Semua Tipe</option>
//                     <option value="IMAGE">Gambar</option>
//                     <option value="DOCUMENT">Dokumen</option>
//                     <option value="PDF">PDF</option>
//                     <option value="EXCEL">Excel</option>
//                     <option value="ARCHIVE">Arsip</option>
//                   </select>
//                   <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
//                 </div>
//                 <div className="relative">
//                   <select
//                     value={sortBy}
//                     onChange={(e) =>
//                       setSortBy(e.target.value as "name" | "date" | "size")
//                     }
//                     className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white text-sm"
//                   >
//                     <option value="name">Nama</option>
//                     <option value="date">Tanggal</option>
//                     <option value="size">Ukuran</option>
//                   </select>
//                   <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
//                 </div>
//               </div>
//             </div>

//             {selectedFiles.length > 0 && (
//               <div className="mt-3 flex items-center gap-3 p-3 bg-teal-50 border border-teal-200 rounded-lg">
//                 <span className="text-sm text-teal-900">
//                   {selectedFiles.length} file dipilih
//                 </span>
//                 <button
//                   onClick={handleDeleteSelected}
//                   className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
//                 >
//                   <Trash2 className="w-3 h-3" />
//                   Hapus
//                 </button>
//                 <button
//                   onClick={() => setSelectedFiles([])}
//                   className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   <X className="w-3 h-3" />
//                   Batal
//                 </button>
//               </div>
//             )}
//           </div>

//           {/* File List/Grid */}
//           <div className="p-4">
//             {viewMode === "grid" ? (
//               <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
//                 {filteredFiles.map((file) => (
//                   <motion.div
//                     key={file.id}
//                     initial={{ opacity: 0, scale: 0.9 }}
//                     animate={{ opacity: 1, scale: 1 }}
//                     className={`relative group border-2 rounded-lg p-4 cursor-pointer transition-all ${
//                       selectedFiles.includes(file.id)
//                         ? "border-teal-500 bg-teal-50"
//                         : "border-gray-200 hover:border-teal-300 hover:shadow-md"
//                     }`}
//                     onClick={() => handleFileClick(file)}
//                   >
//                     {/* Selection checkbox */}
//                     <div
//                       className="absolute top-2 left-2 z-10"
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         toggleFileSelection(file.id);
//                       }}
//                     >
//                       <div
//                         className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
//                           selectedFiles.includes(file.id)
//                             ? "bg-teal-600 border-teal-600"
//                             : "bg-white border-gray-300 group-hover:border-teal-400"
//                         }`}
//                       >
//                         {selectedFiles.includes(file.id) && (
//                           <Check className="w-3 h-3 text-white" />
//                         )}
//                       </div>
//                     </div>

//                     {/* File preview/icon */}
//                     <div className="flex flex-col items-center mb-3">
//                       {file.thumbnail_url && file.file_type === "IMAGE" ? (
//                         <img
//                           src={file.thumbnail_url}
//                           alt={file.name}
//                           className="w-full h-24 object-cover rounded-lg mb-2"
//                         />
//                       ) : (
//                         <div className="w-full h-24 flex items-center justify-center">
//                           {getFileIcon(file)}
//                         </div>
//                       )}
//                     </div>

//                     {/* File info */}
//                     <div className="text-center">
//                       <p
//                         className="text-sm font-medium text-gray-900 truncate mb-1"
//                         title={file.name}
//                       >
//                         {file.name}
//                       </p>
//                       <p className="text-xs text-gray-500">
//                         {file.type === "folder"
//                           ? `${formatFileSize(file.size)}`
//                           : formatFileSize(file.size)}
//                       </p>
//                     </div>

//                     {/* Quick actions */}
//                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                         }}
//                         className="p-1.5 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50"
//                       >
//                         <MoreVertical className="w-3 h-3 text-gray-600" />
//                       </button>
//                     </div>
//                   </motion.div>
//                 ))}
//               </div>
//             ) : (
//               <div className="overflow-x-auto">
//                 <table className="w-full">
//                   <thead>
//                     <tr className="border-b border-gray-200">
//                       <th className="px-4 py-3 text-left">
//                         <input
//                           type="checkbox"
//                           onChange={(e) => {
//                             if (e.target.checked) {
//                               setSelectedFiles(filteredFiles.map((f) => f.id));
//                             } else {
//                               setSelectedFiles([]);
//                             }
//                           }}
//                           checked={
//                             selectedFiles.length === filteredFiles.length &&
//                             filteredFiles.length > 0
//                           }
//                           className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
//                         />
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Nama
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Ukuran
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Diubah
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Oleh
//                       </th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                         Aksi
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody className="divide-y divide-gray-200">
//                     {filteredFiles.map((file) => (
//                       <motion.tr
//                         key={file.id}
//                         initial={{ opacity: 0 }}
//                         animate={{ opacity: 1 }}
//                         className={`hover:bg-gray-50 transition-colors ${
//                           selectedFiles.includes(file.id) ? "bg-teal-50" : ""
//                         }`}
//                       >
//                         <td className="px-4 py-3">
//                           <input
//                             type="checkbox"
//                             checked={selectedFiles.includes(file.id)}
//                             onChange={() => toggleFileSelection(file.id)}
//                             className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
//                           />
//                         </td>
//                         <td
//                           className="px-4 py-3 cursor-pointer"
//                           onClick={() => handleFileClick(file)}
//                         >
//                           <div className="flex items-center gap-3">
//                             <div className="flex-shrink-0">
//                               {file.thumbnail_url &&
//                               file.file_type === "IMAGE" ? (
//                                 <img
//                                   src={file.thumbnail_url}
//                                   alt={file.name}
//                                   className="w-10 h-10 object-cover rounded"
//                                 />
//                               ) : (
//                                 getFileIcon(file)
//                               )}
//                             </div>
//                             <div>
//                               <p className="text-sm font-medium text-gray-900">
//                                 {file.name}
//                               </p>
//                               {file.extension && (
//                                 <p className="text-xs text-gray-500 uppercase">
//                                   {file.extension}
//                                 </p>
//                               )}
//                             </div>
//                           </div>
//                         </td>
//                         <td className="px-4 py-3 text-sm text-gray-600">
//                           {formatFileSize(file.size)}
//                         </td>
//                         <td className="px-4 py-3 text-sm text-gray-600">
//                           {new Date(file.modified_at).toLocaleDateString(
//                             "id-ID",
//                             {
//                               day: "numeric",
//                               month: "short",
//                               year: "numeric",
//                             }
//                           )}
//                         </td>
//                         <td className="px-4 py-3 text-sm text-gray-600">
//                           {file.uploaded_by}
//                         </td>
//                         <td className="px-4 py-3">
//                           <div className="flex items-center gap-2">
//                             {file.type === "file" && (
//                               <>
//                                 <button
//                                   onClick={(e) => {
//                                     e.stopPropagation();
//                                     setPreviewFile(file);
//                                     setShowPreviewModal(true);
//                                   }}
//                                   className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors"
//                                   title="Preview"
//                                 >
//                                   <Eye className="w-4 h-4" />
//                                 </button>
//                                 <button
//                                   onClick={(e) => e.stopPropagation()}
//                                   className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
//                                   title="Download"
//                                 >
//                                   <Download className="w-4 h-4" />
//                                 </button>
//                               </>
//                             )}
//                             <button
//                               onClick={(e) => e.stopPropagation()}
//                               className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
//                               title="Hapus"
//                             >
//                               <Trash2 className="w-4 h-4" />
//                             </button>
//                           </div>
//                         </td>
//                       </motion.tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             )}

//             {filteredFiles.length === 0 && (
//               <div className="text-center py-12">
//                 <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                 <p className="text-gray-500">Tidak ada file atau folder</p>
//                 <p className="text-sm text-gray-400 mt-1">
//                   Upload file atau buat folder baru untuk memulai
//                 </p>
//               </div>
//             )}
//           </div>
//         </motion.div>
//       </div>

//       {/* Upgrade Modal */}
//       <AnimatePresence>
//         {showUpgradeModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowUpgradeModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
//             >
//               <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between z-10">
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">
//                     Upgrade Paket Storage
//                   </h3>
//                   <p className="text-sm text-gray-600 mt-1">
//                     Pilih paket storage yang sesuai dengan kebutuhan desa Anda
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowUpgradeModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5 text-gray-600" />
//                 </button>
//               </div>

//               <div className="p-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                   {STORAGE_PLANS.map((plan) => {
//                     const Icon = plan.icon;
//                     const isCurrentPlan = plan.id === currentPlan;
//                     const isPlanIndex = STORAGE_PLANS.findIndex(
//                       (p) => p.id === plan.id
//                     );
//                     const currentPlanIndex = STORAGE_PLANS.findIndex(
//                       (p) => p.id === currentPlan
//                     );
//                     const canUpgrade = isPlanIndex > currentPlanIndex;

//                     return (
//                       <motion.div
//                         key={plan.id}
//                         initial={{ opacity: 0, y: 20 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         className={`relative border-2 rounded-xl p-6 transition-all ${
//                           plan.popular
//                             ? "border-teal-500 shadow-lg scale-105"
//                             : isCurrentPlan
//                             ? `${plan.borderColor} bg-gray-50`
//                             : "border-gray-200 hover:border-teal-300 hover:shadow-md"
//                         }`}
//                       >
//                         {plan.popular && (
//                           <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
//                             <div className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
//                               <Star className="w-3 h-3" />
//                               PALING POPULER
//                             </div>
//                           </div>
//                         )}

//                         {isCurrentPlan && (
//                           <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
//                             <div className="bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
//                               <CheckCircle2 className="w-3 h-3" />
//                               PAKET AKTIF
//                             </div>
//                           </div>
//                         )}

//                         <div
//                           className={`w-14 h-14 ${plan.bgColor} rounded-xl flex items-center justify-center mb-4`}
//                         >
//                           <Icon className={`w-7 h-7 ${plan.color}`} />
//                         </div>

//                         <h4 className="text-xl font-bold text-gray-900 mb-2">
//                           {plan.name}
//                         </h4>

//                         <div className="mb-4">
//                           <div className="flex items-baseline gap-1">
//                             <span className="text-3xl font-bold text-gray-900">
//                               {plan.price === 0 ? (
//                                 "GRATIS"
//                               ) : (
//                                 <>Rp {plan.price.toLocaleString("id-ID")}</>
//                               )}
//                             </span>
//                             {plan.price > 0 && (
//                               <span className="text-sm text-gray-500">
//                                 /bulan
//                               </span>
//                             )}
//                           </div>
//                           <p
//                             className={`text-sm font-semibold ${plan.color} mt-1`}
//                           >
//                             {plan.storageLabel} Storage
//                           </p>
//                         </div>

//                         <ul className="space-y-3 mb-6">
//                           {plan.features.map((feature, idx) => (
//                             <li
//                               key={idx}
//                               className="flex items-start gap-2 text-sm text-gray-600"
//                             >
//                               <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
//                               {feature}
//                             </li>
//                           ))}
//                         </ul>

//                         <button
//                           onClick={() => {
//                             if (canUpgrade) {
//                               handleUpgradePlan(plan.id);
//                             }
//                           }}
//                           disabled={!canUpgrade}
//                           className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all ${
//                             isCurrentPlan
//                               ? "bg-gray-200 text-gray-500 cursor-not-allowed"
//                               : canUpgrade
//                               ? plan.popular
//                                 ? "bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 shadow-sm"
//                                 : "bg-teal-600 text-white hover:bg-teal-700"
//                               : "bg-gray-100 text-gray-400 cursor-not-allowed"
//                           }`}
//                         >
//                           {isCurrentPlan
//                             ? "Paket Aktif"
//                             : canUpgrade
//                             ? "Upgrade Sekarang"
//                             : "Tidak Dapat Downgrade"}
//                         </button>
//                       </motion.div>
//                     );
//                   })}
//                 </div>

//                 {/* FAQ Section */}
//                 <div className="mt-8 pt-8 border-t border-gray-200">
//                   <h4 className="font-bold text-gray-900 mb-4">
//                     💡 Informasi Penting
//                   </h4>
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
//                     <div className="flex gap-3">
//                       <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
//                       <div>
//                         <p className="font-semibold text-gray-900">
//                           Pembayaran Bulanan
//                         </p>
//                         <p className="text-xs mt-1">
//                           Biaya langganan ditagih setiap bulan secara otomatis
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex gap-3">
//                       <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
//                       <div>
//                         <p className="font-semibold text-gray-900">
//                           Upgrade Kapan Saja
//                         </p>
//                         <p className="text-xs mt-1">
//                           Anda dapat upgrade paket kapan saja tanpa kehilangan
//                           data
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex gap-3">
//                       <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
//                       <div>
//                         <p className="font-semibold text-gray-900">
//                           Tidak Ada Biaya Tersembunyi
//                         </p>
//                         <p className="text-xs mt-1">
//                           Harga yang ditampilkan sudah final, tanpa biaya
//                           tambahan
//                         </p>
//                       </div>
//                     </div>
//                     <div className="flex gap-3">
//                       <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
//                       <div>
//                         <p className="font-semibold text-gray-900">
//                           Data Aman & Terenkripsi
//                         </p>
//                         <p className="text-xs mt-1">
//                           File Anda disimpan dengan enkripsi standar enterprise
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Payment Modal */}
//       <AnimatePresence>
//         {showPaymentModal && selectedPlan && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowPaymentModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-2xl w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <div>
//                   <h3 className="text-lg font-bold text-gray-900">
//                     Pembayaran Upgrade Storage
//                   </h3>
//                   <p className="text-sm text-gray-600 mt-1">
//                     Selesaikan pembayaran untuk mengaktifkan paket baru Anda
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowPaymentModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5 text-gray-600" />
//                 </button>
//               </div>

//               <div className="p-6">
//                 {/* Order Summary */}
//                 <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 mb-6">
//                   <h4 className="font-semibold text-gray-900 mb-4">
//                     Ringkasan Pesanan
//                   </h4>
//                   <div className="space-y-3">
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm text-gray-700">
//                         Paket Dipilih
//                       </span>
//                       <span className="font-semibold text-gray-900">
//                         {STORAGE_PLANS.find((p) => p.id === selectedPlan)?.name}{" "}
//                         Plan
//                       </span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm text-gray-700">Storage</span>
//                       <span className="font-semibold text-gray-900">
//                         {
//                           STORAGE_PLANS.find((p) => p.id === selectedPlan)
//                             ?.storageLabel
//                         }
//                       </span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm text-gray-700">Periode</span>
//                       <span className="font-semibold text-gray-900">
//                         1 Bulan
//                       </span>
//                     </div>
//                     <div className="pt-3 border-t border-teal-200 flex justify-between items-center">
//                       <span className="font-semibold text-gray-900">
//                         Total Pembayaran
//                       </span>
//                       <span className="text-2xl font-bold text-teal-600">
//                         Rp{" "}
//                         {STORAGE_PLANS.find(
//                           (p) => p.id === selectedPlan
//                         )?.price.toLocaleString("id-ID")}
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Payment Method Selection */}
//                 <div className="mb-6">
//                   <h4 className="font-semibold text-gray-900 mb-4">
//                     Pilih Metode Pembayaran
//                   </h4>
//                   <div className="grid grid-cols-3 gap-3">
//                     <button
//                       onClick={() => setSelectedPaymentMethod("QRIS")}
//                       className={`p-4 border-2 rounded-xl transition-all ${
//                         selectedPaymentMethod === "QRIS"
//                           ? "border-teal-600 bg-teal-50"
//                           : "border-gray-200 hover:border-teal-300"
//                       }`}
//                     >
//                       <div className="text-center">
//                         <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
//                           <span className="text-2xl">📱</span>
//                         </div>
//                         <p className="text-sm font-semibold text-gray-900">
//                           QRIS
//                         </p>
//                         <p className="text-xs text-gray-500 mt-1">
//                           Scan & bayar
//                         </p>
//                       </div>
//                     </button>

//                     <button
//                       onClick={() => setSelectedPaymentMethod("VA")}
//                       className={`p-4 border-2 rounded-xl transition-all ${
//                         selectedPaymentMethod === "VA"
//                           ? "border-teal-600 bg-teal-50"
//                           : "border-gray-200 hover:border-teal-300"
//                       }`}
//                     >
//                       <div className="text-center">
//                         <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
//                           <span className="text-2xl">🏦</span>
//                         </div>
//                         <p className="text-sm font-semibold text-gray-900">
//                           Virtual Account
//                         </p>
//                         <p className="text-xs text-gray-500 mt-1">
//                           Transfer bank
//                         </p>
//                       </div>
//                     </button>

//                     <button
//                       onClick={() => setSelectedPaymentMethod("EWALLET")}
//                       className={`p-4 border-2 rounded-xl transition-all ${
//                         selectedPaymentMethod === "EWALLET"
//                           ? "border-teal-600 bg-teal-50"
//                           : "border-gray-200 hover:border-teal-300"
//                       }`}
//                     >
//                       <div className="text-center">
//                         <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
//                           <span className="text-2xl">💳</span>
//                         </div>
//                         <p className="text-sm font-semibold text-gray-900">
//                           E-Wallet
//                         </p>
//                         <p className="text-xs text-gray-500 mt-1">
//                           OVO, Dana, dll
//                         </p>
//                       </div>
//                     </button>
//                   </div>
//                 </div>

//                 {/* Payment Info */}
//                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
//                   <div className="flex gap-3">
//                     <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
//                     <div className="text-sm text-blue-900">
//                       <p className="font-semibold mb-1">
//                         Pembayaran via LinkQu Payment Gateway
//                       </p>
//                       <p className="text-xs text-blue-700">
//                         Transaksi Anda dilindungi dengan sistem keamanan tingkat
//                         enterprise. Pembayaran akan diproses secara real-time.
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex gap-3">
//                   <button
//                     onClick={() => {
//                       setShowPaymentModal(false);
//                       setSelectedPlan(null);
//                     }}
//                     className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     onClick={handlePayment}
//                     className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all font-semibold shadow-sm"
//                   >
//                     Bayar Sekarang
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

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
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-lg w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-lg font-semibold text-gray-900">
//                   Upload File
//                 </h3>
//               </div>

//               <div className="px-6 py-8">
//                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-teal-400 transition-colors cursor-pointer">
//                   <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                   <p className="text-gray-700 font-medium mb-1">
//                     Drag & drop file di sini
//                   </p>
//                   <p className="text-sm text-gray-500 mb-3">
//                     atau klik untuk memilih file
//                   </p>
//                   <button className="px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors">
//                     Pilih File
//                   </button>
//                   <p className="text-xs text-gray-400 mt-4">
//                     Maksimal ukuran file: 10 MB per file
//                     <br />
//                     Format yang didukung: JPG, PNG, PDF, DOC, XLS, ZIP
//                   </p>
//                 </div>
//               </div>

//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 <button
//                   onClick={() => setShowUploadModal(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
//                   Upload
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Preview Modal */}
//       <AnimatePresence>
//         {showPreviewModal && previewFile && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowPreviewModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900">
//                     {previewFile.name}
//                   </h3>
//                   <p className="text-sm text-gray-500 mt-1">
//                     {formatFileSize(previewFile.size)} •{" "}
//                     {previewFile.uploaded_by}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowPreviewModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5 text-gray-600" />
//                 </button>
//               </div>

//               <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
//                 {previewFile.file_type === "IMAGE" &&
//                 previewFile.thumbnail_url ? (
//                   <img
//                     src={previewFile.thumbnail_url}
//                     alt={previewFile.name}
//                     className="w-full rounded-lg"
//                   />
//                 ) : (
//                   <div className="text-center py-12">
//                     <div className="flex justify-center mb-4">
//                       {getFileIcon(previewFile)}
//                     </div>
//                     <p className="text-gray-500 mt-4">
//                       Preview tidak tersedia untuk tipe file ini
//                     </p>
//                     <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
//                       <Download className="w-4 h-4" />
//                       Download File
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* New Folder Modal */}
//       <AnimatePresence>
//         {showNewFolderModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowNewFolderModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-md w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-lg font-semibold text-gray-900">
//                   Buat Folder Baru
//                 </h3>
//               </div>

//               <div className="px-6 py-4">
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Nama Folder
//                 </label>
//                 <input
//                   type="text"
//                   value={newFolderName}
//                   onChange={(e) => setNewFolderName(e.target.value)}
//                   placeholder="Masukkan nama folder"
//                   className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                   autoFocus
//                   onKeyDown={(e) => {
//                     if (e.key === "Enter") {
//                       handleCreateFolder();
//                     }
//                   }}
//                 />
//               </div>

//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 <button
//                   onClick={() => {
//                     setShowNewFolderModal(false);
//                     setNewFolderName("");
//                   }}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button
//                   onClick={handleCreateFolder}
//                   disabled={!newFolderName.trim()}
//                   className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   Buat Folder
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default ArsipDigital;

const ArsipPage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Arsip Digital Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur Arsip Digital. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    >
      <div className="text-sm text-yellow-800 max-w-md mx-auto">
        <p>
          Fitur Arsip Digital akan memungkinkan Anda untuk menyimpan, mengelola,
          dan mengakses dokumen penting desa secara online dengan mudah dan aman
          serta terintegrasi dengan sistem informasi desa.
        </p>
      </div>
    </FullPageStatus>
  );
};

export default ArsipPage;

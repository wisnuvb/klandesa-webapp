"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   MessageSquare,
//   Clock,
//   Loader,
//   CheckCircle,
//   XCircle,
//   Search,
//   Eye,
//   Play,
//   Check,
//   X,
//   Image,
//   Send,
//   Users,
//   Calendar,
//   Tag,
//   Globe,
//   Lock,
//   ChevronDown,
// } from "lucide-react";

// // Types
// type ReportStatus = "DRAFT" | "PENDING" | "PROCESS" | "DONE" | "REJECT";
// type ReportType = "PEMDES" | "BPD" | "KADUS" | "RT" | "RW" | "WARGA";
// type IsPublic = "Y" | "N";

// interface CitizenReport {
//   id: number;
//   user_id: number;
//   village_id: number;
//   report_type: ReportType;
//   title: string;
//   images: string | null;
//   content: string;
//   status: ReportStatus;
//   is_public: IsPublic | null;
//   updated_by: number | null;
//   done_by: number | null;
//   created_at: string;
//   updated_at: string;
//   user_name?: string;
//   user_nik?: string;
// }

// interface CitizenReportResponse {
//   id: number;
//   user_id: number;
//   citizen_report_id: number;
//   response: string;
//   images: string | null;
//   created_at: string;
//   updated_at: string;
//   user_name?: string;
//   user_position?: string;
// }

// // Mock Data
// const mockReports: CitizenReport[] = [
//   {
//     id: 1,
//     user_id: 2,
//     village_id: 2,
//     report_type: "PEMDES",
//     title: "Tolong dibenerin jalan berlubang di RT 01 RW 01",
//     images: null,
//     content:
//       "Jalan berlubang di RT 01 RW 01 sudah sangat parah, tolong segera diperbaiki",
//     status: "DONE",
//     is_public: "Y",
//     updated_by: 2,
//     done_by: 2,
//     created_at: "2024-08-08 10:26:16",
//     updated_at: "2024-09-28 03:43:03",
//     user_name: "Budi Santoso",
//     user_nik: "3201012345670001",
//   },
//   {
//     id: 2,
//     user_id: 3,
//     village_id: 2,
//     report_type: "RT",
//     title: "Lampu jalan mati di RT 02",
//     images: null,
//     content:
//       "Lampu jalan di depan balai RT 02 sudah mati sejak seminggu yang lalu, tolong segera diperbaiki karena membahayakan warga yang lewat malam hari",
//     status: "PROCESS",
//     is_public: "Y",
//     updated_by: null,
//     done_by: null,
//     created_at: "2024-12-15 14:20:00",
//     updated_at: "2024-12-16 08:30:00",
//     user_name: "Siti Aminah",
//     user_nik: "3201012345670002",
//   },
//   {
//     id: 3,
//     user_id: 4,
//     village_id: 2,
//     report_type: "PEMDES",
//     title: "Sampah menumpuk di TPS",
//     images: null,
//     content: "TPS di RT 03 sudah penuh dan berbau, mohon segera diangkut",
//     status: "PENDING",
//     is_public: "Y",
//     updated_by: null,
//     done_by: null,
//     created_at: "2024-12-18 09:15:00",
//     updated_at: "2024-12-18 09:15:00",
//     user_name: "Ahmad Yani",
//     user_nik: "3201012345670003",
//   },
//   {
//     id: 4,
//     user_id: 5,
//     village_id: 2,
//     report_type: "KADUS",
//     title: "Drainase tersumbat",
//     images: null,
//     content: "Drainase di Dusun 1 tersumbat sampah, kalau hujan sering banjir",
//     status: "PENDING",
//     is_public: "N",
//     updated_by: null,
//     done_by: null,
//     created_at: "2024-12-17 16:45:00",
//     updated_at: "2024-12-17 16:45:00",
//     user_name: "Dewi Kartika",
//     user_nik: "3201012345670004",
//   },
//   {
//     id: 5,
//     user_id: 6,
//     village_id: 2,
//     report_type: "BPD",
//     title: "Usulan program bantuan sembako",
//     images: null,
//     content:
//       "Mohon dipertimbangkan program bantuan sembako untuk warga kurang mampu di RT 04",
//     status: "REJECT",
//     is_public: "Y",
//     updated_by: 2,
//     done_by: null,
//     created_at: "2024-12-10 11:00:00",
//     updated_at: "2024-12-12 14:20:00",
//     user_name: "Hendra Kusuma",
//     user_nik: "3201012345670005",
//   },
// ];

// const mockResponses: Record<number, CitizenReportResponse[]> = {
//   1: [
//     {
//       id: 1,
//       user_id: 2,
//       citizen_report_id: 1,
//       response:
//         "Laporan Anda sudah kami terima dan akan segera kami tindaklanjuti",
//       images: null,
//       created_at: "2024-08-09 08:00:00",
//       updated_at: "2024-08-09 08:00:00",
//       user_name: "Kepala Desa",
//       user_position: "Kepala Desa",
//     },
//     {
//       id: 2,
//       user_id: 2,
//       citizen_report_id: 1,
//       response:
//         "Perbaikan jalan sedang dalam proses, ditargetkan selesai akhir bulan ini",
//       images: null,
//       created_at: "2024-08-15 10:30:00",
//       updated_at: "2024-08-15 10:30:00",
//       user_name: "Kepala Desa",
//       user_position: "Kepala Desa",
//     },
//     {
//       id: 6,
//       user_id: 2,
//       citizen_report_id: 1,
//       response:
//         "Laporan saudara sudah kami tindaklanjuti hingga tuntas, terimakasih telah ikut berpartisipasi",
//       images: null,
//       created_at: "2024-09-28 03:36:43",
//       updated_at: "2024-09-28 03:36:43",
//       user_name: "Kepala Desa",
//       user_position: "Kepala Desa",
//     },
//   ],
//   2: [
//     {
//       id: 3,
//       user_id: 2,
//       citizen_report_id: 2,
//       response: "Terima kasih laporannya, tim teknis sedang meninjau lokasi",
//       images: null,
//       created_at: "2024-12-16 08:30:00",
//       updated_at: "2024-12-16 08:30:00",
//       user_name: "Sekretaris Desa",
//       user_position: "Sekretaris Desa",
//     },
//   ],
//   5: [
//     {
//       id: 4,
//       user_id: 2,
//       citizen_report_id: 5,
//       response:
//         "Mohon maaf, untuk saat ini program bantuan sembako sudah terdistribusi sesuai kuota yang ada. Usulan akan kami pertimbangkan untuk periode berikutnya.",
//       images: null,
//       created_at: "2024-12-12 14:20:00",
//       updated_at: "2024-12-12 14:20:00",
//       user_name: "Kepala Desa",
//       user_position: "Kepala Desa",
//     },
//   ],
// };

// export function PengaduanMasyarakat() {
//   const [reports, setReports] = useState<CitizenReport[]>(mockReports);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterStatus, setFilterStatus] = useState<ReportStatus | "ALL">("ALL");
//   const [filterType, setFilterType] = useState<ReportType | "ALL">("ALL");
//   const [filterPublic, setFilterPublic] = useState<IsPublic | "ALL">("ALL");

//   // Modal states
//   const [showDetailModal, setShowDetailModal] = useState(false);
//   const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(
//     null
//   );
//   const [showResponseModal, setShowResponseModal] = useState(false);
//   const [showConfirmDialog, setShowConfirmDialog] = useState(false);
//   const [confirmAction, setConfirmAction] = useState<
//     "PROCESS" | "DONE" | "REJECT" | null
//   >(null);

//   // Form states
//   const [responseText, setResponseText] = useState("");
//   const [rejectReason, setRejectReason] = useState("");

//   // Calculate statistics
//   const stats = {
//     total: reports.length,
//     pending: reports.filter((r) => r.status === "PENDING").length,
//     process: reports.filter((r) => r.status === "PROCESS").length,
//     done: reports.filter((r) => r.status === "DONE").length,
//   };

//   // Filter reports
//   const filteredReports = reports.filter((report) => {
//     const matchSearch =
//       report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       report.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       report.user_name?.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchStatus =
//       filterStatus === "ALL" || report.status === filterStatus;
//     const matchType = filterType === "ALL" || report.report_type === filterType;
//     const matchPublic =
//       filterPublic === "ALL" || report.is_public === filterPublic;

//     return matchSearch && matchStatus && matchType && matchPublic;
//   });

//   // Get status badge
//   const getStatusBadge = (status: ReportStatus) => {
//     const badges = {
//       DRAFT: {
//         bg: "bg-gray-100",
//         text: "text-gray-700",
//         label: "Draft",
//         icon: Clock,
//       },
//       PENDING: {
//         bg: "bg-yellow-100",
//         text: "text-yellow-700",
//         label: "Menunggu",
//         icon: Clock,
//       },
//       PROCESS: {
//         bg: "bg-blue-100",
//         text: "text-blue-700",
//         label: "Diproses",
//         icon: Loader,
//       },
//       DONE: {
//         bg: "bg-green-100",
//         text: "text-green-700",
//         label: "Selesai",
//         icon: CheckCircle,
//       },
//       REJECT: {
//         bg: "bg-red-100",
//         text: "text-red-700",
//         label: "Ditolak",
//         icon: XCircle,
//       },
//     };
//     const badge = badges[status];
//     const Icon = badge.icon;

//     return (
//       <span
//         className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${badge.bg} ${badge.text}`}
//       >
//         <Icon className="w-3 h-3" />
//         {badge.label}
//       </span>
//     );
//   };

//   // Get report type badge
//   const getTypeBadge = (type: ReportType) => {
//     const badges = {
//       PEMDES: { bg: "bg-teal-100", text: "text-teal-700", label: "Pemdes" },
//       BPD: { bg: "bg-purple-100", text: "text-purple-700", label: "BPD" },
//       KADUS: { bg: "bg-orange-100", text: "text-orange-700", label: "Kadus" },
//       RT: { bg: "bg-cyan-100", text: "text-cyan-700", label: "RT" },
//       RW: { bg: "bg-indigo-100", text: "text-indigo-700", label: "RW" },
//       WARGA: { bg: "bg-pink-100", text: "text-pink-700", label: "Warga" },
//     };
//     const badge = badges[type];

//     return (
//       <span
//         className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${badge.bg} ${badge.text}`}
//       >
//         <Tag className="w-3 h-3" />
//         {badge.label}
//       </span>
//     );
//   };

//   // Handle view detail
//   const handleViewDetail = (report: CitizenReport) => {
//     setSelectedReport(report);
//     setShowDetailModal(true);
//   };

//   // Handle action
//   const handleAction = (
//     action: "PROCESS" | "DONE" | "REJECT",
//     report: CitizenReport
//   ) => {
//     setSelectedReport(report);
//     setConfirmAction(action);
//     setRejectReason("");
//     setShowConfirmDialog(true);
//   };

//   // Handle confirm action
//   const handleConfirmAction = () => {
//     if (!selectedReport || !confirmAction) return;

//     setReports((prev) =>
//       prev.map((r) =>
//         r.id === selectedReport.id
//           ? {
//               ...r,
//               status: confirmAction,
//               updated_at: new Date().toISOString(),
//             }
//           : r
//       )
//     );

//     // Add response if reject with reason
//     if (confirmAction === "REJECT" && rejectReason) {
//       // Mock add response
//       console.log("Add reject response:", rejectReason);
//     }

//     setShowConfirmDialog(false);
//     setShowDetailModal(false);
//     setConfirmAction(null);
//     setRejectReason("");
//   };

//   // Handle add response
//   const handleAddResponse = () => {
//     if (!selectedReport || !responseText.trim()) return;

//     // Mock add response
//     console.log("Add response:", responseText);

//     setResponseText("");
//     setShowResponseModal(false);
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

//   return (
//     <div className="space-y-6">
//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3 }}
//           className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Total Laporan</p>
//               <p className="text-3xl font-semibold text-gray-900 mt-2">
//                 {stats.total}
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
//           transition={{ duration: 0.3, delay: 0.1 }}
//           className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Menunggu</p>
//               <p className="text-3xl font-semibold text-yellow-600 mt-2">
//                 {stats.pending}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
//               <Clock className="w-6 h-6 text-yellow-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3, delay: 0.2 }}
//           className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Diproses</p>
//               <p className="text-3xl font-semibold text-blue-600 mt-2">
//                 {stats.process}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//               <Loader className="w-6 h-6 text-blue-600" />
//             </div>
//           </div>
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.3, delay: 0.3 }}
//           className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600">Selesai</p>
//               <p className="text-3xl font-semibold text-green-600 mt-2">
//                 {stats.done}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//               <CheckCircle className="w-6 h-6 text-green-600" />
//             </div>
//           </div>
//         </motion.div>
//       </div>

//       {/* Filters & Search */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.3, delay: 0.4 }}
//         className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
//       >
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//           {/* Search */}
//           <div className="relative">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Cari laporan..."
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//             />
//           </div>

//           {/* Filter Status */}
//           <div className="relative">
//             <select
//               value={filterStatus}
//               onChange={(e) =>
//                 setFilterStatus(e.target.value as ReportStatus | "ALL")
//               }
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
//             >
//               <option value="ALL">Semua Status</option>
//               <option value="PENDING">Menunggu</option>
//               <option value="PROCESS">Diproses</option>
//               <option value="DONE">Selesai</option>
//               <option value="REJECT">Ditolak</option>
//               <option value="DRAFT">Draft</option>
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>

//           {/* Filter Type */}
//           <div className="relative">
//             <select
//               value={filterType}
//               onChange={(e) =>
//                 setFilterType(e.target.value as ReportType | "ALL")
//               }
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
//             >
//               <option value="ALL">Semua Tipe</option>
//               <option value="PEMDES">Pemdes</option>
//               <option value="BPD">BPD</option>
//               <option value="KADUS">Kadus</option>
//               <option value="RT">RT</option>
//               <option value="RW">RW</option>
//               <option value="WARGA">Warga</option>
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>

//           {/* Filter Public */}
//           <div className="relative">
//             <select
//               value={filterPublic}
//               onChange={(e) =>
//                 setFilterPublic(e.target.value as IsPublic | "ALL")
//               }
//               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
//             >
//               <option value="ALL">Semua Visibilitas</option>
//               <option value="Y">Publik</option>
//               <option value="N">Privat</option>
//             </select>
//             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
//           </div>
//         </div>
//       </motion.div>

//       {/* Reports Table */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.3, delay: 0.5 }}
//         className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
//       >
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50 border-b border-gray-200">
//               <tr>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   No
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Tanggal
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Pelapor
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Judul Laporan
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Tipe
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Status
//                 </th>
//                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Visibilitas
//                 </th>
//                 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Aksi
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200">
//               <AnimatePresence mode="popLayout">
//                 {filteredReports.map((report, index) => (
//                   <motion.tr
//                     key={report.id}
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     exit={{ opacity: 0 }}
//                     transition={{ duration: 0.2 }}
//                     className="hover:bg-gray-50"
//                   >
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                       {index + 1}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
//                       {new Date(report.created_at).toLocaleDateString("id-ID", {
//                         day: "numeric",
//                         month: "short",
//                         year: "numeric",
//                       })}
//                     </td>
//                     <td className="px-6 py-4 text-sm">
//                       <div>
//                         <div className="font-medium text-gray-900">
//                           {report.user_name}
//                         </div>
//                         <div className="text-gray-500 text-xs">
//                           {report.user_nik}
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 text-sm">
//                       <div className="max-w-xs">
//                         <div className="font-medium text-gray-900 truncate">
//                           {report.title}
//                         </div>
//                         <div className="text-gray-500 text-xs truncate">
//                           {report.content}
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm">
//                       {getTypeBadge(report.report_type)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm">
//                       {getStatusBadge(report.status)}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-sm">
//                       {report.is_public === "Y" ? (
//                         <span className="inline-flex items-center gap-1 text-teal-600">
//                           <Globe className="w-4 h-4" />
//                           <span className="text-xs">Publik</span>
//                         </span>
//                       ) : (
//                         <span className="inline-flex items-center gap-1 text-gray-600">
//                           <Lock className="w-4 h-4" />
//                           <span className="text-xs">Privat</span>
//                         </span>
//                       )}
//                     </td>
//                     <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
//                       <div className="flex items-center justify-end gap-2">
//                         <button
//                           onClick={() => handleViewDetail(report)}
//                           className="inline-flex items-center gap-1 px-3 py-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
//                         >
//                           <Eye className="w-4 h-4" />
//                           <span className="text-xs">Detail</span>
//                         </button>
//                         {report.status === "PENDING" && (
//                           <button
//                             onClick={() => handleAction("PROCESS", report)}
//                             className="inline-flex items-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
//                           >
//                             <Play className="w-4 h-4" />
//                             <span className="text-xs">Proses</span>
//                           </button>
//                         )}
//                         {report.status === "PROCESS" && (
//                           <button
//                             onClick={() => handleAction("DONE", report)}
//                             className="inline-flex items-center gap-1 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
//                           >
//                             <Check className="w-4 h-4" />
//                             <span className="text-xs">Selesai</span>
//                           </button>
//                         )}
//                         {(report.status === "PENDING" ||
//                           report.status === "PROCESS") && (
//                           <button
//                             onClick={() => handleAction("REJECT", report)}
//                             className="inline-flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
//                           >
//                             <X className="w-4 h-4" />
//                             <span className="text-xs">Tolak</span>
//                           </button>
//                         )}
//                       </div>
//                     </td>
//                   </motion.tr>
//                 ))}
//               </AnimatePresence>
//             </tbody>
//           </table>

//           {filteredReports.length === 0 && (
//             <div className="text-center py-12">
//               <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//               <p className="text-gray-500">Tidak ada laporan yang ditemukan</p>
//             </div>
//           )}
//         </div>
//       </motion.div>

//       {/* Detail Modal */}
//       <AnimatePresence>
//         {showDetailModal && selectedReport && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowDetailModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
//             >
//               {/* Modal Header */}
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <div>
//                   <h2 className="text-xl font-semibold text-gray-900">
//                     Detail Laporan
//                   </h2>
//                   <p className="text-sm text-gray-500 mt-1">
//                     #{selectedReport.id}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowDetailModal(false)}
//                   className="text-gray-400 hover:text-gray-600 transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               {/* Modal Body */}
//               <div className="flex-1 overflow-y-auto p-6 space-y-6">
//                 {/* Report Info */}
//                 <div className="space-y-4">
//                   <div className="flex items-start justify-between gap-4">
//                     <div className="flex-1">
//                       <h3 className="font-semibold text-gray-900 mb-2">
//                         {selectedReport.title}
//                       </h3>
//                       <p className="text-gray-600 text-sm leading-relaxed">
//                         {selectedReport.content}
//                       </p>
//                     </div>
//                     <div className="flex flex-col gap-2">
//                       {getStatusBadge(selectedReport.status)}
//                       {getTypeBadge(selectedReport.report_type)}
//                     </div>
//                   </div>

//                   <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
//                         <Users className="w-5 h-5 text-teal-600" />
//                       </div>
//                       <div>
//                         <p className="text-xs text-gray-500">Pelapor</p>
//                         <p className="font-medium text-gray-900">
//                           {selectedReport.user_name}
//                         </p>
//                         <p className="text-xs text-gray-500">
//                           {selectedReport.user_nik}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
//                         <Calendar className="w-5 h-5 text-blue-600" />
//                       </div>
//                       <div>
//                         <p className="text-xs text-gray-500">Tanggal Laporan</p>
//                         <p className="font-medium text-gray-900 text-sm">
//                           {formatDate(selectedReport.created_at)}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
//                         {selectedReport.is_public === "Y" ? (
//                           <Globe className="w-5 h-5 text-purple-600" />
//                         ) : (
//                           <Lock className="w-5 h-5 text-purple-600" />
//                         )}
//                       </div>
//                       <div>
//                         <p className="text-xs text-gray-500">Visibilitas</p>
//                         <p className="font-medium text-gray-900">
//                           {selectedReport.is_public === "Y"
//                             ? "Publik"
//                             : "Privat"}
//                         </p>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3">
//                       <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
//                         <Calendar className="w-5 h-5 text-orange-600" />
//                       </div>
//                       <div>
//                         <p className="text-xs text-gray-500">
//                           Terakhir Diupdate
//                         </p>
//                         <p className="font-medium text-gray-900 text-sm">
//                           {formatDate(selectedReport.updated_at)}
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Response Timeline */}
//                 <div className="border-t border-gray-200 pt-6">
//                   <div className="flex items-center justify-between mb-4">
//                     <h4 className="font-semibold text-gray-900">
//                       Timeline Tanggapan
//                     </h4>
//                     <button
//                       onClick={() => setShowResponseModal(true)}
//                       className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
//                     >
//                       <Send className="w-4 h-4" />
//                       Tambah Tanggapan
//                     </button>
//                   </div>

//                   {mockResponses[selectedReport.id]?.length > 0 ? (
//                     <div className="space-y-4">
//                       {mockResponses[selectedReport.id].map(
//                         (response, index) => (
//                           <motion.div
//                             key={response.id}
//                             initial={{ opacity: 0, x: -20 }}
//                             animate={{ opacity: 1, x: 0 }}
//                             transition={{ delay: index * 0.1 }}
//                             className="flex gap-4"
//                           >
//                             <div className="flex flex-col items-center">
//                               <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
//                                 <Users className="w-5 h-5 text-teal-600" />
//                               </div>
//                               {index <
//                                 mockResponses[selectedReport.id].length - 1 && (
//                                 <div className="w-0.5 h-full bg-gray-200 my-2" />
//                               )}
//                             </div>
//                             <div className="flex-1 pb-4">
//                               <div className="bg-gray-50 rounded-lg p-4">
//                                 <div className="flex items-start justify-between mb-2">
//                                   <div>
//                                     <p className="font-medium text-gray-900">
//                                       {response.user_name}
//                                     </p>
//                                     <p className="text-xs text-gray-500">
//                                       {response.user_position}
//                                     </p>
//                                   </div>
//                                   <p className="text-xs text-gray-500">
//                                     {formatDate(response.created_at)}
//                                   </p>
//                                 </div>
//                                 <p className="text-gray-700 text-sm leading-relaxed">
//                                   {response.response}
//                                 </p>
//                               </div>
//                             </div>
//                           </motion.div>
//                         )
//                       )}
//                     </div>
//                   ) : (
//                     <div className="text-center py-8 bg-gray-50 rounded-lg">
//                       <MessageSquare className="w-10 h-10 text-gray-400 mx-auto mb-2" />
//                       <p className="text-gray-500 text-sm">
//                         Belum ada tanggapan
//                       </p>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Modal Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 {selectedReport.status === "PENDING" && (
//                   <>
//                     <button
//                       onClick={() => handleAction("PROCESS", selectedReport)}
//                       className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
//                     >
//                       <Play className="w-4 h-4" />
//                       Proses Laporan
//                     </button>
//                     <button
//                       onClick={() => handleAction("REJECT", selectedReport)}
//                       className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//                     >
//                       <X className="w-4 h-4" />
//                       Tolak Laporan
//                     </button>
//                   </>
//                 )}
//                 {selectedReport.status === "PROCESS" && (
//                   <>
//                     <button
//                       onClick={() => handleAction("DONE", selectedReport)}
//                       className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
//                     >
//                       <Check className="w-4 h-4" />
//                       Tandai Selesai
//                     </button>
//                     <button
//                       onClick={() => handleAction("REJECT", selectedReport)}
//                       className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
//                     >
//                       <X className="w-4 h-4" />
//                       Tolak Laporan
//                     </button>
//                   </>
//                 )}
//                 <button
//                   onClick={() => setShowDetailModal(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Tutup
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Add Response Modal */}
//       <AnimatePresence>
//         {showResponseModal && selectedReport && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowResponseModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-lg shadow-xl w-full max-w-lg"
//             >
//               {/* Modal Header */}
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <h2 className="text-xl font-semibold text-gray-900">
//                   Tambah Tanggapan
//                 </h2>
//                 <button
//                   onClick={() => setShowResponseModal(false)}
//                   className="text-gray-400 hover:text-gray-600 transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               {/* Modal Body */}
//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Tanggapan
//                   </label>
//                   <textarea
//                     value={responseText}
//                     onChange={(e) => setResponseText(e.target.value)}
//                     rows={5}
//                     placeholder="Tulis tanggapan Anda..."
//                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
//                   />
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Lampiran Gambar (Opsional)
//                   </label>
//                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors cursor-pointer">
//                     <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
//                     <p className="text-sm text-gray-600">
//                       Klik untuk upload gambar
//                     </p>
//                     <p className="text-xs text-gray-500 mt-1">
//                       PNG, JPG hingga 2MB
//                     </p>
//                   </div>
//                 </div>
//               </div>

//               {/* Modal Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 <button
//                   onClick={() => setShowResponseModal(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button
//                   onClick={handleAddResponse}
//                   disabled={!responseText.trim()}
//                   className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <Send className="w-4 h-4" />
//                   Kirim Tanggapan
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Confirm Action Dialog */}
//       <AnimatePresence>
//         {showConfirmDialog && selectedReport && confirmAction && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowConfirmDialog(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-lg shadow-xl w-full max-w-md"
//             >
//               {/* Modal Header */}
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h2 className="text-xl font-semibold text-gray-900">
//                   {confirmAction === "PROCESS" && "Proses Laporan"}
//                   {confirmAction === "DONE" && "Tandai Selesai"}
//                   {confirmAction === "REJECT" && "Tolak Laporan"}
//                 </h2>
//               </div>

//               {/* Modal Body */}
//               <div className="p-6">
//                 <p className="text-gray-600 mb-4">
//                   {confirmAction === "PROCESS" &&
//                     "Apakah Anda yakin ingin memproses laporan ini?"}
//                   {confirmAction === "DONE" &&
//                     "Apakah Anda yakin laporan ini sudah selesai ditangani?"}
//                   {confirmAction === "REJECT" &&
//                     "Apakah Anda yakin ingin menolak laporan ini?"}
//                 </p>

//                 {confirmAction === "REJECT" && (
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-2">
//                       Alasan Penolakan
//                     </label>
//                     <textarea
//                       value={rejectReason}
//                       onChange={(e) => setRejectReason(e.target.value)}
//                       rows={4}
//                       placeholder="Jelaskan alasan penolakan..."
//                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
//                     />
//                   </div>
//                 )}
//               </div>

//               {/* Modal Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
//                 <button
//                   onClick={() => setShowConfirmDialog(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button
//                   onClick={handleConfirmAction}
//                   disabled={confirmAction === "REJECT" && !rejectReason.trim()}
//                   className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
//                     confirmAction === "PROCESS"
//                       ? "bg-blue-600 hover:bg-blue-700"
//                       : confirmAction === "DONE"
//                       ? "bg-green-600 hover:bg-green-700"
//                       : "bg-red-600 hover:bg-red-700"
//                   }`}
//                 >
//                   {confirmAction === "PROCESS" && "Ya, Proses"}
//                   {confirmAction === "DONE" && "Ya, Selesai"}
//                   {confirmAction === "REJECT" && "Ya, Tolak"}
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default PengaduanMasyarakat;
const MaintenancePage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Pengaduan Masyarakat Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur Pengaduan Masyarakat. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    />
  );
};

export default MaintenancePage;

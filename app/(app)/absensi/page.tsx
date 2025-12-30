"use client";

// import { useState, useEffect } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import {
//   Users,
//   CheckCircle,
//   Clock,
//   Calendar,
//   Search,
//   Filter,
//   Download,
//   QrCode,
//   MapPin,
//   ChevronDown,
//   Crown,
//   Zap,
//   TrendingUp,
//   AlertCircle,
//   Check,
//   X,
//   CreditCard,
//   Smartphone,
//   Building2,
// } from "lucide-react";

// // Types
// type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
// type CheckInMethod = "QR" | "GPS";
// type SubscriptionTier =
//   | "FREE"
//   | "TIER_6_10"
//   | "TIER_11_20"
//   | "TIER_21_30"
//   | "TIER_31_50"
//   | "CUSTOM";
// type PaymentMethod = "QRIS" | "VA" | "EWALLET";

// interface Attendance {
//   id: number;
//   user_id: number;
//   user_name: string;
//   user_photo: string | null;
//   position: string;
//   attendance_date: string;
//   check_in_time: string | null;
//   check_out_time: string | null;
//   status: AttendanceStatus;
//   check_in_method: CheckInMethod | null;
//   location_lat: number | null;
//   location_lng: number | null;
//   notes: string | null;
// }

// interface WorkShift {
//   id: number;
//   shift_name: string;
//   start_time: string;
//   end_time: string;
//   late_tolerance_minutes: number;
//   is_active: boolean;
// }

// interface PricingTier {
//   id: SubscriptionTier;
//   name: string;
//   staffRange: string;
//   price: number;
//   priceLabel: string;
//   features: string[];
//   recommended?: boolean;
// }

// // Mock Data
// const mockAttendances: Attendance[] = [
//   {
//     id: 1,
//     user_id: 1,
//     user_name: "Budi Santoso",
//     user_photo: null,
//     position: "Kepala Desa",
//     attendance_date: "2024-12-20",
//     check_in_time: "07:15:00",
//     check_out_time: "15:30:00",
//     status: "PRESENT",
//     check_in_method: "QR",
//     location_lat: -6.2088,
//     location_lng: 106.8456,
//     notes: null,
//   },
//   {
//     id: 2,
//     user_id: 2,
//     user_name: "Siti Aminah",
//     user_photo: null,
//     position: "Sekretaris Desa",
//     attendance_date: "2024-12-20",
//     check_in_time: "07:45:00",
//     check_out_time: null,
//     status: "LATE",
//     check_in_method: "GPS",
//     location_lat: -6.2088,
//     location_lng: 106.8456,
//     notes: "Terlambat karena macet",
//   },
//   {
//     id: 3,
//     user_id: 3,
//     user_name: "Ahmad Wijaya",
//     user_photo: null,
//     position: "Bendahara",
//     attendance_date: "2024-12-20",
//     check_in_time: null,
//     check_out_time: null,
//     status: "LEAVE",
//     check_in_method: null,
//     location_lat: null,
//     location_lng: null,
//     notes: "Izin sakit",
//   },
//   {
//     id: 4,
//     user_id: 4,
//     user_name: "Dewi Kartika",
//     user_photo: null,
//     position: "Kaur Umum",
//     attendance_date: "2024-12-20",
//     check_in_time: "07:00:00",
//     check_out_time: null,
//     status: "PRESENT",
//     check_in_method: "QR",
//     location_lat: -6.2088,
//     location_lng: 106.8456,
//     notes: null,
//   },
//   {
//     id: 5,
//     user_id: 5,
//     user_name: "Rudi Hermawan",
//     user_photo: null,
//     position: "Kaur Keuangan",
//     attendance_date: "2024-12-20",
//     check_in_time: null,
//     check_out_time: null,
//     status: "ABSENT",
//     check_in_method: null,
//     location_lat: null,
//     location_lng: null,
//     notes: null,
//   },
//   // Adding more staff to demonstrate over limit
//   ...Array.from({ length: 10 }, (_, i) => ({
//     id: 6 + i,
//     user_id: 6 + i,
//     user_name: `Pegawai ${i + 6}`,
//     user_photo: null,
//     position: `Staff ${i + 1}`,
//     attendance_date: "2024-12-20",
//     check_in_time: "07:30:00",
//     check_out_time: null,
//     status: "PRESENT" as AttendanceStatus,
//     check_in_method: "QR" as CheckInMethod,
//     location_lat: -6.2088,
//     location_lng: 106.8456,
//     notes: null,
//   })),
// ];

// const pricingTiers: PricingTier[] = [
//   {
//     id: "FREE",
//     name: "Gratis",
//     staffRange: "1-5 Pegawai",
//     price: 0,
//     priceLabel: "GRATIS",
//     features: ["✅ QR Code Absensi", "✅ Laporan Basic", "✅ Max 5 Pegawai"],
//   },
//   {
//     id: "TIER_6_10",
//     name: "Starter",
//     staffRange: "6-10 Pegawai",
//     price: 49000,
//     priceLabel: "Rp 49.000",
//     features: [
//       "✅ QR Code Absensi",
//       "✅ Laporan Lengkap",
//       "✅ 6-10 Pegawai",
//       "✅ Export Data",
//     ],
//   },
//   {
//     id: "TIER_11_20",
//     name: "Professional",
//     staffRange: "11-20 Pegawai",
//     price: 99000,
//     priceLabel: "Rp 99.000",
//     features: [
//       "✅ Semua Fitur Starter",
//       "✅ 11-20 Pegawai",
//       "✅ Dashboard Analytics",
//       "✅ Support Priority",
//     ],
//     recommended: true,
//   },
//   {
//     id: "TIER_21_30",
//     name: "Business",
//     staffRange: "21-30 Pegawai",
//     price: 149000,
//     priceLabel: "Rp 149.000",
//     features: [
//       "✅ Semua Fitur Professional",
//       "✅ 21-30 Pegawai",
//       "✅ Multi Shift",
//       "✅ API Access",
//     ],
//   },
//   {
//     id: "TIER_31_50",
//     name: "Enterprise",
//     staffRange: "31-50 Pegawai",
//     price: 249000,
//     priceLabel: "Rp 249.000",
//     features: [
//       "✅ Semua Fitur Business",
//       "✅ 31-50 Pegawai",
//       "✅ Dedicated Support",
//       "✅ Custom Features",
//     ],
//   },
// ];

// export function Absensi() {
//   const [activeTab, setActiveTab] = useState<
//     "today" | "history" | "shifts" | "qrcode"
//   >("today");
//   const [attendances] = useState<Attendance[]>(mockAttendances);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">(
//     "ALL"
//   );
//   const [totalStaff, setTotalStaff] = useState(0);

//   // Subscription state
//   const [currentTier, setCurrentTier] = useState<SubscriptionTier>("FREE");
//   const [gpsAddonEnabled, setGpsAddonEnabled] = useState(false);
//   const [showUpgradeModal, setShowUpgradeModal] = useState(false);
//   const [showGpsModal, setShowGpsModal] = useState(false);
//   const [showPricingTable, setShowPricingTable] = useState(false);
//   const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(
//     null
//   );
//   const [showCheckoutModal, setShowCheckoutModal] = useState(false);
//   const [selectedPaymentMethod, setSelectedPaymentMethod] =
//     useState<PaymentMethod>("QRIS");

//   // Fetch total staff from API
//   useEffect(() => {
//     const fetchTotalStaff = async () => {
//       try {
//         const response = await fetch("/api/officials?status=ACTIVE");
//         if (response.ok) {
//           const data = await response.json();
//           setTotalStaff(data.activeCount || 0);
//         }
//       } catch (error) {
//         console.error("Failed to fetch staff count:", error);
//       }
//     };
//     fetchTotalStaff();
//   }, []);

//   // Statistics
//   const staffLimit =
//     currentTier === "FREE"
//       ? 5
//       : currentTier === "TIER_6_10"
//       ? 10
//       : currentTier === "TIER_11_20"
//       ? 20
//       : currentTier === "TIER_21_30"
//       ? 30
//       : 50;

//   const stats = {
//     totalStaff,
//     present: attendances.filter((a) => a.status === "PRESENT").length,
//     late: attendances.filter((a) => a.status === "LATE").length,
//     absent: attendances.filter(
//       (a) => a.status === "ABSENT" || a.status === "LEAVE"
//     ).length,
//     staffLimit,
//     isOverLimit: totalStaff > staffLimit,
//   };

//   // Filter attendances
//   const filteredAttendances = attendances.filter((att) => {
//     const matchSearch =
//       att.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       att.position.toLowerCase().includes(searchQuery.toLowerCase());
//     const matchStatus = filterStatus === "ALL" || att.status === filterStatus;
//     return matchSearch && matchStatus;
//   });

//   // Get recommended tier
//   const getRecommendedTier = () => {
//     if (totalStaff <= 5) return pricingTiers[0];
//     if (totalStaff <= 10) return pricingTiers[1];
//     if (totalStaff <= 20) return pricingTiers[2];
//     if (totalStaff <= 30) return pricingTiers[3];
//     return pricingTiers[4];
//   };

//   const recommendedTier = getRecommendedTier();

//   // Status badge
//   const getStatusBadge = (status: AttendanceStatus) => {
//     const badges = {
//       PRESENT: "bg-green-100 text-green-700 border-green-200",
//       LATE: "bg-yellow-100 text-yellow-700 border-yellow-200",
//       ABSENT: "bg-red-100 text-red-700 border-red-200",
//       LEAVE: "bg-blue-100 text-blue-700 border-blue-200",
//     };
//     const labels = {
//       PRESENT: "Hadir",
//       LATE: "Terlambat",
//       ABSENT: "Tidak Hadir",
//       LEAVE: "Izin",
//     };
//     return (
//       <span
//         className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badges[status]}`}
//       >
//         {labels[status]}
//       </span>
//     );
//   };

//   const handleUpgradeClick = () => {
//     setShowUpgradeModal(true);
//   };

//   const handleGpsAddonClick = () => {
//     setShowGpsModal(true);
//   };

//   const handleSelectTier = (tier: PricingTier) => {
//     setSelectedTier(tier.id);
//     setShowUpgradeModal(false);
//     setShowCheckoutModal(true);
//   };

//   const handleGpsCheckout = () => {
//     setShowGpsModal(false);
//     setSelectedTier("FREE"); // GPS is a separate addon
//     setShowCheckoutModal(true);
//   };

//   const handlePayment = () => {
//     // Integration with LinkQu Payment Gateway
//     alert(
//       `Membuat pembayaran via ${selectedPaymentMethod}...\n\nIntegrasi LinkQu:\n- QRIS\n- Virtual Account\n- E-Wallet\n\nDemo: Pembayaran berhasil!`
//     );
//     setShowCheckoutModal(false);

//     // Update tier after payment (in real app, this would come from webhook)
//     if (selectedTier && selectedTier !== "FREE") {
//       setCurrentTier(selectedTier);
//     } else {
//       setGpsAddonEnabled(true);
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
//               <p className="text-sm text-gray-600 mb-1">Total Pegawai</p>
//               <p className="text-3xl font-bold text-gray-900">
//                 {stats.totalStaff}
//               </p>
//               <p className="text-xs text-gray-500 mt-1">
//                 Limit: {stats.staffLimit}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//               <Users className="w-6 h-6 text-blue-600" />
//             </div>
//           </div>
//           {stats.isOverLimit && (
//             <div className="mt-3 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
//               ⚠️ Over Limit
//             </div>
//           )}
//         </motion.div>

//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ delay: 0.1 }}
//           className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
//         >
//           <div className="flex items-center justify-between">
//             <div>
//               <p className="text-sm text-gray-600 mb-1">Hadir Hari Ini</p>
//               <p className="text-3xl font-bold text-green-600">
//                 {stats.present}
//               </p>
//             </div>
//             <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
//               <CheckCircle className="w-6 h-6 text-green-600" />
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
//               <p className="text-sm text-gray-600 mb-1">Terlambat</p>
//               <p className="text-3xl font-bold text-yellow-600">{stats.late}</p>
//             </div>
//             <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
//               <Clock className="w-6 h-6 text-yellow-600" />
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
//               <p className="text-sm text-gray-600 mb-1">GPS Add-on</p>
//               <p className="text-lg font-bold text-gray-900">
//                 {gpsAddonEnabled ? "Aktif" : "Tidak Aktif"}
//               </p>
//             </div>
//             <div
//               className={`w-12 h-12 rounded-lg flex items-center justify-center ${
//                 gpsAddonEnabled ? "bg-teal-100" : "bg-gray-100"
//               }`}
//             >
//               <MapPin
//                 className={`w-6 h-6 ${
//                   gpsAddonEnabled ? "text-teal-600" : "text-gray-400"
//                 }`}
//               />
//             </div>
//           </div>
//         </motion.div>
//       </div>

//       {/* Main Layout: Sidebar + Content */}
//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
//         {/* Upgrade Panel Sidebar */}
//         <motion.div
//           initial={{ opacity: 0, x: -20 }}
//           animate={{ opacity: 1, x: 0 }}
//           className="lg:col-span-1 space-y-4"
//         >
//           {/* Current Plan Card */}
//           <div className="bg-linear-to-br from-teal-600 to-teal-700 rounded-xl shadow-lg p-6 text-white">
//             <div className="flex items-center gap-2 mb-4">
//               <Crown className="w-5 h-5" />
//               <h3 className="font-semibold">Paket Anda</h3>
//             </div>

//             <div className="mb-4">
//               <div className="text-2xl font-bold mb-1">
//                 {currentTier === "FREE"
//                   ? "Gratis"
//                   : currentTier === "TIER_6_10"
//                   ? "Starter"
//                   : currentTier === "TIER_11_20"
//                   ? "Professional"
//                   : currentTier === "TIER_21_30"
//                   ? "Business"
//                   : "Enterprise"}
//               </div>
//               <div className="text-teal-100 text-sm">
//                 {stats.totalStaff}/{stats.staffLimit} Pegawai
//               </div>
//             </div>

//             {/* Progress Bar */}
//             <div className="mb-4">
//               <div className="w-full bg-teal-800 rounded-full h-2.5 overflow-hidden">
//                 <div
//                   className={`h-2.5 rounded-full transition-all ${
//                     stats.isOverLimit ? "bg-red-400" : "bg-white"
//                   }`}
//                   style={{
//                     width: `${Math.min(
//                       (stats.totalStaff / stats.staffLimit) * 100,
//                       100
//                     )}%`,
//                   }}
//                 />
//               </div>
//               <p className="text-xs text-teal-100 mt-1.5">
//                 {stats.isOverLimit
//                   ? `⚠️ ${
//                       stats.totalStaff - stats.staffLimit
//                     } pegawai melebihi limit`
//                   : `${stats.staffLimit - stats.totalStaff} slot tersisa`}
//               </p>
//             </div>

//             {stats.isOverLimit && (
//               <div className="bg-red-500 rounded-lg p-3 mb-4">
//                 <p className="text-white text-sm font-medium flex items-center gap-2">
//                   <AlertCircle className="w-4 h-4" />
//                   Upgrade diperlukan!
//                 </p>
//               </div>
//             )}

//             {stats.isOverLimit && (
//               <div className="bg-teal-800 rounded-lg p-3 mb-4">
//                 <p className="text-xs text-teal-100 mb-1">💡 Rekomendasi:</p>
//                 <p className="text-white text-sm font-semibold">
//                   {recommendedTier.name} - {recommendedTier.staffRange}
//                 </p>
//                 <p className="text-teal-100 text-xs mt-0.5">
//                   {recommendedTier.priceLabel}/bulan
//                 </p>
//               </div>
//             )}

//             <button
//               onClick={handleUpgradeClick}
//               className="w-full bg-white text-teal-700 font-semibold py-2.5 px-4 rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
//             >
//               <TrendingUp className="w-4 h-4" />
//               Upgrade Paket
//             </button>
//           </div>

//           {/* GPS Add-on Card */}
//           <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6 hidden">
//             <div className="flex items-center gap-2 mb-3">
//               <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
//                 <MapPin className="w-4 h-4 text-blue-600" />
//               </div>
//               <div>
//                 <h4 className="font-semibold text-gray-900">GPS Radius</h4>
//                 <span
//                   className={`text-xs font-medium ${
//                     gpsAddonEnabled ? "text-green-600" : "text-gray-500"
//                   }`}
//                 >
//                   {gpsAddonEnabled ? "✓ Aktif" : "Tidak Aktif"}
//                 </span>
//               </div>
//             </div>

//             <div className="space-y-2 mb-4">
//               <div className="flex items-start gap-2 text-xs text-gray-600">
//                 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
//                 <span>Validasi radius lokasi</span>
//               </div>
//               <div className="flex items-start gap-2 text-xs text-gray-600">
//                 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
//                 <span>Anti fake GPS</span>
//               </div>
//               <div className="flex items-start gap-2 text-xs text-gray-600">
//                 <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
//                 <span>Laporan lokasi detail</span>
//               </div>
//             </div>

//             <div className="mb-4">
//               <div className="text-2xl font-bold text-gray-900">Rp 49.000</div>
//               <div className="text-sm text-gray-500">per bulan</div>
//             </div>

//             <button
//               onClick={handleGpsAddonClick}
//               disabled={gpsAddonEnabled}
//               className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
//                 gpsAddonEnabled
//                   ? "bg-gray-100 text-gray-400 cursor-not-allowed"
//                   : "bg-teal-600 text-white hover:bg-teal-700"
//               }`}
//             >
//               <Zap className="w-4 h-4" />
//               {gpsAddonEnabled ? "Sudah Aktif" : "Aktifkan GPS"}
//             </button>
//           </div>

//           {/* Pricing Table Toggle */}
//           <button
//             onClick={() => setShowPricingTable(!showPricingTable)}
//             className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-teal-300 transition-colors hidden"
//           >
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium text-gray-700">
//                 📊 Lihat Semua Harga
//               </span>
//               <ChevronDown
//                 className={`w-4 h-4 text-gray-400 transition-transform ${
//                   showPricingTable ? "rotate-180" : ""
//                 }`}
//               />
//             </div>
//           </button>

//           {showPricingTable && (
//             <motion.div
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: "auto" }}
//               className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
//             >
//               <h4 className="font-semibold text-gray-900 mb-3 text-sm">
//                 Daftar Harga Paket
//               </h4>
//               <div className="space-y-2">
//                 {pricingTiers.map((tier) => (
//                   <div
//                     key={tier.id}
//                     className={`p-3 rounded-lg border-2 ${
//                       currentTier === tier.id
//                         ? "border-teal-600 bg-teal-50"
//                         : "border-gray-200 bg-gray-50"
//                     }`}
//                   >
//                     <div className="flex justify-between items-start mb-1">
//                       <div>
//                         <div className="font-medium text-sm text-gray-900">
//                           {tier.name}
//                         </div>
//                         <div className="text-xs text-gray-600">
//                           {tier.staffRange}
//                         </div>
//                       </div>
//                       {currentTier === tier.id && (
//                         <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full">
//                           Aktif
//                         </span>
//                       )}
//                     </div>
//                     <div className="text-sm font-bold text-teal-700">
//                       {tier.priceLabel}/bln
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </motion.div>
//           )}
//         </motion.div>

//         {/* Main Content Area */}
//         <motion.div
//           initial={{ opacity: 0, y: 20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200"
//         >
//           {/* Tabs */}
//           <div className="border-b border-gray-200">
//             <div className="flex gap-1 p-1">
//               <button
//                 onClick={() => setActiveTab("today")}
//                 className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
//                   activeTab === "today"
//                     ? "bg-teal-50 text-teal-700"
//                     : "text-gray-600 hover:bg-gray-50"
//                 }`}
//               >
//                 Absensi Hari Ini
//               </button>
//               <button
//                 onClick={() => setActiveTab("history")}
//                 className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
//                   activeTab === "history"
//                     ? "bg-teal-50 text-teal-700"
//                     : "text-gray-600 hover:bg-gray-50"
//                 }`}
//               >
//                 Riwayat
//               </button>
//               <button
//                 onClick={() => setActiveTab("qrcode")}
//                 className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
//                   activeTab === "qrcode"
//                     ? "bg-teal-50 text-teal-700"
//                     : "text-gray-600 hover:bg-gray-50"
//                 }`}
//               >
//                 QR Code
//               </button>
//             </div>
//           </div>

//           {/* Tab Content */}
//           <div className="p-6">
//             {activeTab === "today" && (
//               <div className="space-y-4">
//                 {/* Filters */}
//                 <div className="flex flex-col sm:flex-row gap-4">
//                   <div className="flex-1 relative">
//                     <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <input
//                       type="text"
//                       placeholder="Cari nama atau jabatan..."
//                       value={searchQuery}
//                       onChange={(e) => setSearchQuery(e.target.value)}
//                       className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                     />
//                   </div>
//                   <div className="relative">
//                     <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//                     <select
//                       value={filterStatus}
//                       onChange={(e) =>
//                         setFilterStatus(
//                           e.target.value as AttendanceStatus | "ALL"
//                         )
//                       }
//                       className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
//                     >
//                       <option value="ALL">Semua Status</option>
//                       <option value="PRESENT">Hadir</option>
//                       <option value="LATE">Terlambat</option>
//                       <option value="LEAVE">Izin</option>
//                       <option value="ABSENT">Tidak Hadir</option>
//                     </select>
//                     <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
//                   </div>
//                 </div>

//                 {/* Table */}
//                 <div className="overflow-x-auto">
//                   <table className="w-full">
//                     <thead>
//                       <tr className="border-b border-gray-200">
//                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Pegawai
//                         </th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Jabatan
//                         </th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Status
//                         </th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Check In
//                         </th>
//                         <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
//                           Metode
//                         </th>
//                       </tr>
//                     </thead>
//                     <tbody className="divide-y divide-gray-200">
//                       {filteredAttendances.map((att) => (
//                         <tr
//                           key={att.id}
//                           className="hover:bg-gray-50 transition-colors"
//                         >
//                           <td className="px-4 py-4">
//                             <div className="flex items-center gap-3">
//                               <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
//                                 <span className="text-sm font-medium text-teal-700">
//                                   {att.user_name
//                                     .split(" ")
//                                     .map((n) => n[0])
//                                     .join("")
//                                     .substring(0, 2)}
//                                 </span>
//                               </div>
//                               <span className="font-medium text-gray-900">
//                                 {att.user_name}
//                               </span>
//                             </div>
//                           </td>
//                           <td className="px-4 py-4 text-sm text-gray-600">
//                             {att.position}
//                           </td>
//                           <td className="px-4 py-4">
//                             {getStatusBadge(att.status)}
//                           </td>
//                           <td className="px-4 py-4 text-sm text-gray-900">
//                             {att.check_in_time || "-"}
//                           </td>
//                           <td className="px-4 py-4">
//                             {att.check_in_method && (
//                               <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
//                                 {att.check_in_method === "QR" ? (
//                                   <QrCode className="w-3 h-3" />
//                                 ) : (
//                                   <MapPin className="w-3 h-3" />
//                                 )}
//                                 {att.check_in_method}
//                               </span>
//                             )}
//                             {!att.check_in_method && "-"}
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>

//                 {filteredAttendances.length === 0 && (
//                   <div className="text-center py-12">
//                     <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                     <p className="text-gray-500">Tidak ada data absensi</p>
//                   </div>
//                 )}
//               </div>
//             )}

//             {activeTab === "history" && (
//               <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
//                 <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//                 <p className="text-gray-500">Riwayat Absensi</p>
//                 <p className="text-sm text-gray-400 mt-1">
//                   Pilih rentang tanggal untuk melihat data
//                 </p>
//               </div>
//             )}

//             {activeTab === "qrcode" && (
//               <div className="max-w-2xl mx-auto text-center space-y-6">
//                 <div className="inline-block p-8 bg-white border-4 border-gray-200 rounded-2xl shadow-lg">
//                   <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
//                     <QrCode className="w-32 h-32 text-gray-400" />
//                   </div>
//                 </div>

//                 <div>
//                   <h3 className="text-xl font-semibold text-gray-900">
//                     QR Code Absensi
//                   </h3>
//                   <p className="text-gray-600 mt-2">
//                     Scan untuk melakukan absensi
//                   </p>
//                 </div>

//                 <button className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors">
//                   <Download className="w-5 h-5" />
//                   Download QR Code
//                 </button>
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
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
//             >
//               <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
//                 <h3 className="text-2xl font-bold text-gray-900">
//                   Pilih Paket Absensi
//                 </h3>
//                 <button
//                   onClick={() => setShowUpgradeModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>

//               <div className="p-6">
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                   {pricingTiers.map((tier) => (
//                     <motion.div
//                       key={tier.id}
//                       initial={{ opacity: 0, y: 20 }}
//                       animate={{ opacity: 1, y: 0 }}
//                       className={`relative border-2 rounded-xl p-6 hover:shadow-lg transition-all ${
//                         tier.recommended
//                           ? "border-teal-600 shadow-lg"
//                           : currentTier === tier.id
//                           ? "border-teal-400"
//                           : "border-gray-200"
//                       }`}
//                     >
//                       {tier.recommended && (
//                         <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
//                           <span className="bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-full">
//                             REKOMENDASI
//                           </span>
//                         </div>
//                       )}

//                       {currentTier === tier.id && (
//                         <div className="absolute -top-3 right-4">
//                           <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
//                             PAKET SAAT INI
//                           </span>
//                         </div>
//                       )}

//                       <div className="text-center mb-6">
//                         <h4 className="text-xl font-bold text-gray-900 mb-2">
//                           {tier.name}
//                         </h4>
//                         <div className="text-3xl font-bold text-teal-600 mb-1">
//                           {tier.priceLabel}
//                         </div>
//                         <div className="text-sm text-gray-600">
//                           {tier.price > 0 ? "per bulan" : "selamanya"}
//                         </div>
//                         <div className="mt-2 text-sm font-medium text-gray-700">
//                           {tier.staffRange}
//                         </div>
//                       </div>

//                       <div className="space-y-3 mb-6">
//                         {tier.features.map((feature, idx) => (
//                           <div
//                             key={idx}
//                             className="flex items-start gap-2 text-sm text-gray-700"
//                           >
//                             <span>{feature}</span>
//                           </div>
//                         ))}
//                       </div>

//                       <button
//                         onClick={() => handleSelectTier(tier)}
//                         disabled={currentTier === tier.id}
//                         className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
//                           currentTier === tier.id
//                             ? "bg-gray-100 text-gray-400 cursor-not-allowed"
//                             : tier.recommended
//                             ? "bg-teal-600 text-white hover:bg-teal-700"
//                             : "bg-gray-900 text-white hover:bg-gray-800"
//                         }`}
//                       >
//                         {currentTier === tier.id
//                           ? "Paket Aktif"
//                           : tier.price === 0
//                           ? "Pilih Gratis"
//                           : "Pilih Paket"}
//                       </button>
//                     </motion.div>
//                   ))}
//                 </div>

//                 <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
//                   <h4 className="font-semibold text-blue-900 mb-2">
//                     💳 Metode Pembayaran
//                   </h4>
//                   <p className="text-sm text-blue-800">
//                     Kami menerima pembayaran via QRIS, Virtual Account (BCA,
//                     BNI, Mandiri, BRI), dan E-Wallet (OVO, GoPay, Dana,
//                     ShopeePay) melalui LinkQu Payment Gateway.
//                   </p>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* GPS Add-on Modal */}
//       <AnimatePresence>
//         {showGpsModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowGpsModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-xl font-bold text-gray-900">
//                   GPS Radius Add-on
//                 </h3>
//               </div>

//               <div className="p-6 space-y-6">
//                 <div className="text-center">
//                   <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                     <MapPin className="w-10 h-10 text-blue-600" />
//                   </div>
//                   <h4 className="text-2xl font-bold text-gray-900 mb-2">
//                     Rp 49.000
//                   </h4>
//                   <p className="text-gray-600">per bulan</p>
//                 </div>

//                 <div className="space-y-3">
//                   <div className="flex items-start gap-3">
//                     <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
//                       <Check className="w-3 h-3 text-green-600" />
//                     </div>
//                     <div>
//                       <p className="font-medium text-gray-900">
//                         Validasi Radius Lokasi
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         Pastikan pegawai absen dari lokasi kantor
//                       </p>
//                     </div>
//                   </div>

//                   <div className="flex items-start gap-3">
//                     <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
//                       <Check className="w-3 h-3 text-green-600" />
//                     </div>
//                     <div>
//                       <p className="font-medium text-gray-900">Anti Fake GPS</p>
//                       <p className="text-sm text-gray-600">
//                         Deteksi otomatis GPS palsu
//                       </p>
//                     </div>
//                   </div>

//                   <div className="flex items-start gap-3">
//                     <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
//                       <Check className="w-3 h-3 text-green-600" />
//                     </div>
//                     <div>
//                       <p className="font-medium text-gray-900">
//                         Laporan Lokasi Detail
//                       </p>
//                       <p className="text-sm text-gray-600">
//                         Koordinat dan peta lokasi absensi
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex gap-3">
//                   <button
//                     onClick={() => setShowGpsModal(false)}
//                     className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     onClick={handleGpsCheckout}
//                     className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold"
//                   >
//                     Lanjut Pembayaran
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Checkout Modal (LinkQu Integration) */}
//       <AnimatePresence>
//         {showCheckoutModal && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowCheckoutModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
//             >
//               <div className="px-6 py-4 border-b border-gray-200">
//                 <h3 className="text-xl font-bold text-gray-900">Pembayaran</h3>
//               </div>

//               <div className="p-6 space-y-6">
//                 {/* Order Summary */}
//                 <div className="bg-gray-50 rounded-lg p-4">
//                   <h4 className="font-semibold text-gray-900 mb-3">
//                     Ringkasan Pesanan
//                   </h4>
//                   <div className="space-y-2">
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Item:</span>
//                       <span className="font-medium text-gray-900">
//                         {selectedTier === "FREE" || !selectedTier
//                           ? "GPS Add-on"
//                           : pricingTiers.find((t) => t.id === selectedTier)
//                               ?.name}
//                       </span>
//                     </div>
//                     <div className="flex justify-between text-sm">
//                       <span className="text-gray-600">Harga:</span>
//                       <span className="font-medium text-gray-900">
//                         {selectedTier === "FREE" || !selectedTier
//                           ? "Rp 49.000"
//                           : pricingTiers.find((t) => t.id === selectedTier)
//                               ?.priceLabel}
//                       </span>
//                     </div>
//                     <div className="border-t border-gray-200 pt-2 mt-2">
//                       <div className="flex justify-between">
//                         <span className="font-semibold text-gray-900">
//                           Total:
//                         </span>
//                         <span className="font-bold text-teal-600 text-lg">
//                           {selectedTier === "FREE" || !selectedTier
//                             ? "Rp 49.000"
//                             : pricingTiers.find((t) => t.id === selectedTier)
//                                 ?.priceLabel}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Payment Method Selection */}
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-3">
//                     Metode Pembayaran
//                   </h4>
//                   <div className="space-y-2">
//                     <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-teal-300 transition-colors">
//                       <input
//                         type="radio"
//                         name="payment"
//                         value="QRIS"
//                         checked={selectedPaymentMethod === "QRIS"}
//                         onChange={(e) =>
//                           setSelectedPaymentMethod(
//                             e.target.value as PaymentMethod
//                           )
//                         }
//                         className="w-4 h-4 text-teal-600"
//                       />
//                       <QrCode className="w-5 h-5 text-gray-600" />
//                       <span className="font-medium text-gray-900">QRIS</span>
//                     </label>

//                     <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-teal-300 transition-colors">
//                       <input
//                         type="radio"
//                         name="payment"
//                         value="VA"
//                         checked={selectedPaymentMethod === "VA"}
//                         onChange={(e) =>
//                           setSelectedPaymentMethod(
//                             e.target.value as PaymentMethod
//                           )
//                         }
//                         className="w-4 h-4 text-teal-600"
//                       />
//                       <Building2 className="w-5 h-5 text-gray-600" />
//                       <span className="font-medium text-gray-900">
//                         Virtual Account
//                       </span>
//                       <span className="text-xs text-gray-500 ml-auto">
//                         (BCA, BNI, Mandiri, BRI)
//                       </span>
//                     </label>

//                     <label className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-teal-300 transition-colors">
//                       <input
//                         type="radio"
//                         name="payment"
//                         value="EWALLET"
//                         checked={selectedPaymentMethod === "EWALLET"}
//                         onChange={(e) =>
//                           setSelectedPaymentMethod(
//                             e.target.value as PaymentMethod
//                           )
//                         }
//                         className="w-4 h-4 text-teal-600"
//                       />
//                       <Smartphone className="w-5 h-5 text-gray-600" />
//                       <span className="font-medium text-gray-900">
//                         E-Wallet
//                       </span>
//                       <span className="text-xs text-gray-500 ml-auto">
//                         (OVO, GoPay, Dana)
//                       </span>
//                     </label>
//                   </div>
//                 </div>

//                 {/* LinkQu Badge */}
//                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
//                   <div className="flex items-center gap-2">
//                     <CreditCard className="w-4 h-4 text-blue-600" />
//                     <span className="text-xs text-blue-900">
//                       Pembayaran aman dengan{" "}
//                       <strong>LinkQu Payment Gateway</strong>
//                     </span>
//                   </div>
//                 </div>

//                 {/* Action Buttons */}
//                 <div className="flex gap-3">
//                   <button
//                     onClick={() => setShowCheckoutModal(false)}
//                     className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     onClick={handlePayment}
//                     className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold flex items-center justify-center gap-2"
//                   >
//                     <CreditCard className="w-5 h-5" />
//                     Bayar Sekarang
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default Absensi;

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

const AbsensiPage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Absensi Sedang Dikembangkan"
      message="Kami sedang membangun sistem absensi dengan fitur QR Code, GPS tracking, dan laporan lengkap."
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    >
      <div className="text-sm text-yellow-800 max-w-md mx-auto">
        <p className="font-semibold mb-2">Fitur yang akan tersedia:</p>
        <ul className="space-y-1 text-left">
          <li>✅ Absensi dengan QR Code</li>
          <li>✅ GPS Location Tracking</li>
          <li>✅ Laporan Kehadiran</li>
          <li>✅ Multi Shift Support</li>
          <li>✅ Export Data</li>
        </ul>
      </div>
    </FullPageStatus>
  );
};

export default AbsensiPage;

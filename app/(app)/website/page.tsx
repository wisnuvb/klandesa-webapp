"use client";

import { FullPageStatus } from "@/components/PageStatus";
import { useRouter } from "next/navigation";

// import { useState } from "react";
// import { motion, AnimatePresence } from "motion/react";
// import { SimpleRichTextEditor } from "@/components/SimpleRichTextEditor";
// import {
//   Globe,
//   Check,
//   X,
//   Eye,
//   ExternalLink,
//   CreditCard,
//   Upload,
//   AlertCircle,
//   Star,
//   TrendingUp,
//   Users,
//   ChevronLeft,
//   ChevronRight,
//   Smartphone,
//   Zap,
//   Search as SearchIcon,
//   Layout,
//   Palette,
//   Settings,
//   Crown,
//   Award,
//   Sparkles,
//   Calendar,
//   RefreshCw,
//   BarChart3,
//   FileText,
//   Download,
//   Share2,
//   Power,
//   Clock,
//   Copy,
//   CheckCircle2,
//   Smartphone as QrCodeIcon,
//   Server,
//   Shield,
//   Link2,
//   Info,
//   TrendingDown,
//   MousePointer,
//   Timer,
//   ArrowUpRight,
//   ArrowDownRight,
//   Newspaper,
//   Image as ImageIcon,
//   CalendarDays,
//   File,
//   Store,
//   BookOpen,
//   MessageSquare,
//   Target,
//   Landmark,
//   CircleUser,
//   Building2,
//   MapPin,
//   Ticket,
//   Leaf,
//   Lightbulb,
//   Plus,
//   Edit,
//   Trash2,
//   Save,
// } from "lucide-react";
// import {
//   AreaChart,
//   Area,
//   PieChart,
//   Pie,
//   Cell,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";
// import Image from "next/image";

// // Types
// interface WebsiteTemplate {
//   id: number;
//   name: string;
//   slug: string;
//   description: string;
//   price: number;
//   features: string[];
//   preview_images: string[];
//   badge?: "Popular" | "Recommended" | "Best Seller";
//   demo_url?: string;
//   is_premium?: boolean;
// }

// interface ActiveWebsite {
//   id: number;
//   template_id: number;
//   template_name: string;
//   domain: string;
//   custom_domain?: string; // Custom domain if configured
//   is_active: boolean;
//   activated_at: string;
//   expires_at: string;
//   total_visitors: number;
//   visitors_today: number;
//   visitors_month: number;
//   total_posts: number;
//   preview_image: string;
//   subscription_status: "active" | "expiring_soon" | "expired";
// }

// // Content Management Types (DB-Ready Structure)
// interface ContentTypeConfig {
//   id: string;
//   name: string;
//   slug: string;
//   icon: string;
//   description: string;
//   isCore: boolean;
//   color: string;
// }

// interface ContentItem {
//   id: number;
//   title: string;
//   content?: string;
//   image_url?: string;
//   date?: string;
//   status: "published" | "draft";
//   created_at: string;
//   updated_at: string;
// }

// // Mock Data
// const mockTemplates: WebsiteTemplate[] = [
//   {
//     id: 1,
//     name: "Modern Village",
//     slug: "modern-village",
//     description:
//       "Template modern dengan desain minimalis dan clean. Cocok untuk desa yang ingin tampil profesional.",
//     price: 1200000,
//     features: [
//       "Responsive Design",
//       "SEO Optimized",
//       "Berita & Artikel",
//       "Galeri Foto",
//       "Profil Desa",
//       "Layanan Online",
//       "Kontak & Maps",
//     ],
//     preview_images: [
//       "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop",
//       "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&h=600&fit=crop",
//     ],
//     badge: "Popular",
//     demo_url: "https://demo.modern-village.com",
//   },
//   {
//     id: 2,
//     name: "Classic Heritage",
//     slug: "classic-heritage",
//     description:
//       "Desain klasik dengan nuansa tradisional yang elegan. Mempertahankan nilai budaya lokal.",
//     price: 800000,
//     features: [
//       "Responsive Design",
//       "SEO Optimized",
//       "Portal Berita",
//       "Struktur Organisasi",
//       "Data Kependudukan",
//       "Potensi Desa",
//       "Kontak Form",
//     ],
//     preview_images: [
//       "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
//       "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
//     ],
//     badge: "Recommended",
//   },
//   {
//     id: 3,
//     name: "Professional Gov",
//     slug: "professional-gov",
//     description:
//       "Template profesional dengan tampilan formal untuk pemerintahan. Dilengkapi dashboard admin.",
//     price: 2000000,
//     features: [
//       "Responsive Design",
//       "SEO Optimized",
//       "Advanced Dashboard",
//       "Multi User Role",
//       "E-Document",
//       "Live Chat Support",
//       "Analytics Dashboard",
//       "Custom Domain",
//     ],
//     preview_images: [
//       "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop",
//       "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop",
//     ],
//     badge: "Best Seller",
//     is_premium: true,
//   },
//   {
//     id: 4,
//     name: "Tourism Village",
//     slug: "tourism-village",
//     description:
//       "Khusus untuk desa wisata dengan galeri interaktif dan sistem booking. Tampilan menarik dan colorful.",
//     price: 1500000,
//     features: [
//       "Responsive Design",
//       "SEO Optimized",
//       "Booking System",
//       "Virtual Tour 360°",
//       "Galeri Premium",
//       "Trip Advisor Integration",
//       "Payment Gateway",
//     ],
//     preview_images: [
//       "https://images.unsplash.com/photo-1508780709619-79562169bc64?w=800&h=600&fit=crop",
//       "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&h=600&fit=crop",
//     ],
//   },
//   {
//     id: 5,
//     name: "Green Agriculture",
//     slug: "green-agriculture",
//     description:
//       "Template hijau natural untuk desa pertanian. Showcase produk dan hasil panen dengan elegan.",
//     price: 1200000,
//     features: [
//       "Responsive Design",
//       "SEO Optimized",
//       "Product Catalog",
//       "E-Commerce Ready",
//       "Blog & Tips",
//       "Weather Widget",
//       "Harvest Calendar",
//     ],
//     preview_images: [
//       "https://images.unsplash.com/photo-1560264280-88b68371db39?w=800&h=600&fit=crop",
//       "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
//     ],
//   },
//   {
//     id: 6,
//     name: "Smart Village",
//     slug: "smart-village",
//     description:
//       "Template futuristik dengan integrasi IoT dan smart features. Untuk desa yang menuju digitalisasi penuh.",
//     price: 2500000,
//     features: [
//       "Responsive Design",
//       "SEO Optimized",
//       "IoT Integration",
//       "Real-time Monitoring",
//       "AI Chatbot",
//       "Smart Dashboard",
//       "API Integration",
//       "Mobile App Sync",
//     ],
//     preview_images: [
//       "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=600&fit=crop",
//       "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop",
//     ],
//     is_premium: true,
//   },
// ];

// // Content Type Configuration (Hybrid Approach: Hardcoded now, DB-ready structure)
// const CORE_CONTENT_TYPES: ContentTypeConfig[] = [
//   {
//     id: "berita",
//     name: "Berita Desa",
//     slug: "berita",
//     icon: "Newspaper",
//     description: "Berita dan artikel desa",
//     isCore: true,
//     color: "blue",
//   },
//   {
//     id: "galeri",
//     name: "Galeri Foto",
//     slug: "galeri",
//     icon: "Image",
//     description: "Koleksi foto kegiatan",
//     isCore: true,
//     color: "purple",
//   },
//   {
//     id: "agenda",
//     name: "Agenda Kegiatan",
//     slug: "agenda",
//     icon: "CalendarDays",
//     description: "Jadwal kegiatan desa",
//     isCore: true,
//     color: "green",
//   },
//   {
//     id: "halaman",
//     name: "Halaman Statis",
//     slug: "halaman",
//     icon: "BookOpen",
//     description: "Halaman profil, visi misi, dll",
//     isCore: true,
//     color: "orange",
//   },
//   {
//     id: "produk",
//     name: "Produk UKM",
//     slug: "produk",
//     icon: "Store",
//     description: "Katalog produk UMKM",
//     isCore: true,
//     color: "pink",
//   },
//   {
//     id: "dokumen",
//     name: "Dokumen Publik",
//     slug: "dokumen",
//     icon: "File",
//     description: "Dokumen dan file publik",
//     isCore: true,
//     color: "gray",
//   },
// ];

// const TEMPLATE_SPECIFIC_CONTENT_TYPES: Record<string, ContentTypeConfig[]> = {
//   "modern-village": [
//     {
//       id: "testimonial",
//       name: "Testimonial Warga",
//       slug: "testimonial",
//       icon: "MessageSquare",
//       description: "Testimoni dari warga",
//       isCore: false,
//       color: "teal",
//     },
//     {
//       id: "layanan",
//       name: "Layanan Unggulan",
//       slug: "layanan",
//       icon: "Target",
//       description: "Layanan unggulan desa",
//       isCore: false,
//       color: "indigo",
//     },
//   ],
//   "cultural-heritage": [
//     {
//       id: "sejarah",
//       name: "Sejarah & Budaya",
//       slug: "sejarah",
//       icon: "Landmark",
//       description: "Sejarah dan budaya desa",
//       isCore: false,
//       color: "amber",
//     },
//     {
//       id: "tokoh",
//       name: "Tokoh Desa",
//       slug: "tokoh",
//       icon: "CircleUser",
//       description: "Profil tokoh penting",
//       isCore: false,
//       color: "rose",
//     },
//   ],
//   "business-hub": [
//     {
//       id: "bisnis",
//       name: "Direktori Bisnis",
//       slug: "bisnis",
//       icon: "Building2",
//       description: "Daftar bisnis lokal",
//       isCore: false,
//       color: "cyan",
//     },
//     {
//       id: "investor",
//       name: "Info Investor",
//       slug: "investor",
//       icon: "TrendingUp",
//       description: "Informasi untuk investor",
//       isCore: false,
//       color: "emerald",
//     },
//   ],
//   "tourism-paradise": [
//     {
//       id: "destinasi",
//       name: "Destinasi Wisata",
//       slug: "destinasi",
//       icon: "MapPin",
//       description: "Tempat wisata unggulan",
//       isCore: false,
//       color: "sky",
//     },
//     {
//       id: "paket",
//       name: "Paket Wisata",
//       slug: "paket",
//       icon: "Ticket",
//       description: "Paket tur wisata",
//       isCore: false,
//       color: "violet",
//     },
//   ],
//   "green-agriculture": [
//     {
//       id: "program",
//       name: "Program Lingkungan",
//       slug: "program",
//       icon: "Leaf",
//       description: "Program ramah lingkungan",
//       isCore: false,
//       color: "lime",
//     },
//     {
//       id: "tips",
//       name: "Tips Ramah Lingkungan",
//       slug: "tips",
//       icon: "Lightbulb",
//       description: "Tips eco-friendly",
//       isCore: false,
//       color: "green",
//     },
//   ],
// };

// // Helper function to get content types for a template (easily convertible to API call)
// const getContentTypes = (templateSlug: string): ContentTypeConfig[] => {
//   const specificTypes = TEMPLATE_SPECIFIC_CONTENT_TYPES[templateSlug] || [];
//   return [...CORE_CONTENT_TYPES, ...specificTypes];
// };

// // Mock content data for demo
// const getMockContentData = (typeSlug: string): ContentItem[] => {
//   const mockData: Record<string, ContentItem[]> = {
//     berita: [
//       {
//         id: 1,
//         title: "Musyawarah Desa 2024",
//         content: "Musyawarah desa membahas program prioritas tahun 2024...",
//         date: "2024-12-15",
//         status: "published",
//         created_at: "2024-12-15",
//         updated_at: "2024-12-15",
//       },
//       {
//         id: 2,
//         title: "Gotong Royong Membersihkan Desa",
//         content: "Kegiatan gotong royong diikuti oleh seluruh warga...",
//         date: "2024-12-10",
//         status: "published",
//         created_at: "2024-12-10",
//         updated_at: "2024-12-10",
//       },
//       {
//         id: 3,
//         title: "Penyaluran BLT Dana Desa",
//         content: "Penyaluran bantuan langsung tunai kepada warga...",
//         date: "2024-12-05",
//         status: "draft",
//         created_at: "2024-12-05",
//         updated_at: "2024-12-05",
//       },
//     ],
//     galeri: [
//       {
//         id: 1,
//         title: "Peringatan HUT RI ke-79",
//         image_url:
//           "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=400",
//         date: "2024-08-17",
//         status: "published",
//         created_at: "2024-08-17",
//         updated_at: "2024-08-17",
//       },
//       {
//         id: 2,
//         title: "Festival Budaya Desa",
//         image_url:
//           "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400",
//         date: "2024-07-20",
//         status: "published",
//         created_at: "2024-07-20",
//         updated_at: "2024-07-20",
//       },
//       {
//         id: 3,
//         title: "Posyandu Balita",
//         image_url:
//           "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400",
//         date: "2024-12-01",
//         status: "published",
//         created_at: "2024-12-01",
//         updated_at: "2024-12-01",
//       },
//     ],
//     agenda: [
//       {
//         id: 1,
//         title: "Rapat Koordinasi RT/RW",
//         content: "Koordinasi program kerja RT/RW",
//         date: "2024-12-25",
//         status: "published",
//         created_at: "2024-12-15",
//         updated_at: "2024-12-15",
//       },
//       {
//         id: 2,
//         title: "Pemilihan Ketua RT",
//         content: "Pemilihan ketua RT periode 2024-2027",
//         date: "2024-12-30",
//         status: "published",
//         created_at: "2024-12-10",
//         updated_at: "2024-12-10",
//       },
//     ],
//     halaman: [
//       {
//         id: 1,
//         title: "Profil Desa",
//         content: "Desa Sejahtera terletak di...",
//         status: "published",
//         created_at: "2024-06-15",
//         updated_at: "2024-11-20",
//       },
//       {
//         id: 2,
//         title: "Visi & Misi",
//         content: "Visi: Mewujudkan desa yang sejahtera...",
//         status: "published",
//         created_at: "2024-06-15",
//         updated_at: "2024-06-15",
//       },
//       {
//         id: 3,
//         title: "Struktur Organisasi",
//         content: "Struktur pemerintahan desa...",
//         status: "published",
//         created_at: "2024-06-15",
//         updated_at: "2024-08-10",
//       },
//     ],
//     produk: [
//       {
//         id: 1,
//         title: "Keripik Singkong",
//         content: "Keripik singkong renyah khas desa",
//         image_url:
//           "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400",
//         status: "published",
//         created_at: "2024-10-01",
//         updated_at: "2024-10-01",
//       },
//       {
//         id: 2,
//         title: "Madu Hutan",
//         content: "Madu asli hutan alami",
//         image_url:
//           "https://images.unsplash.com/photo-1587049352846-4a222e784463?w=400",
//         status: "published",
//         created_at: "2024-09-15",
//         updated_at: "2024-09-15",
//       },
//     ],
//     dokumen: [
//       {
//         id: 1,
//         title: "APBDes 2024",
//         content: "Anggaran Pendapatan dan Belanja Desa tahun 2024",
//         status: "published",
//         created_at: "2024-01-15",
//         updated_at: "2024-01-15",
//       },
//       {
//         id: 2,
//         title: "Peraturan Desa No. 1/2024",
//         content: "Peraturan tentang tata tertib desa",
//         status: "published",
//         created_at: "2024-02-01",
//         updated_at: "2024-02-01",
//       },
//     ],
//   };
//   return mockData[typeSlug] || [];
// };

// export function WebsiteDesa() {
//   const [isDemoMode, setIsDemoMode] = useState(false);
//   const [selectedTemplate, setSelectedTemplate] =
//     useState<WebsiteTemplate | null>(null);
//   const [showPreviewModal, setShowPreviewModal] = useState(false);
//   const [showCheckoutModal, setShowCheckoutModal] = useState(false);
//   const [showRenewalModal, setShowRenewalModal] = useState(false);
//   const [showDnsModal, setShowDnsModal] = useState(false);
//   const [showStatsModal, setShowStatsModal] = useState(false);
//   const [showContentModal, setShowContentModal] = useState(false);
//   const [selectedContentType, setSelectedContentType] =
//     useState<ContentTypeConfig | null>(null);
//   const [showContentEditor, setShowContentEditor] = useState(false);
//   const [editingContent, setEditingContent] = useState<ContentItem | null>(
//     null
//   );
//   const [contentFormData, setContentFormData] = useState({
//     title: "",
//     content: "",
//     date: "",
//     image_url: "",
//   });
//   const [checkoutStep, setCheckoutStep] = useState(1);
//   const [previewImageIndex, setPreviewImageIndex] = useState(0);
//   const [paymentMethod, setPaymentMethod] = useState<"bank" | "ewallet">(
//     "bank"
//   );
//   const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<
//     "qris" | "va" | "ewallet"
//   >("qris");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [copiedText, setCopiedText] = useState<string | null>(null);
//   const [showChangeTemplateModal, setShowChangeTemplateModal] = useState(false);
//   const [selectedNewTemplate, setSelectedNewTemplate] =
//     useState<WebsiteTemplate | null>(null);
//   const [customDomain, setCustomDomain] = useState("");
//   const [changeTemplateStep, setChangeTemplateStep] = useState(1); // 1: Select Template, 2: Custom Domain, 3: Payment
//   const [checkoutCustomDomain, setCheckoutCustomDomain] = useState("");
//   const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<
//     "qris" | "va" | "ewallet"
//   >("qris");
//   const [statsDateRange, setStatsDateRange] = useState<
//     "24h" | "7d" | "30d" | "90d"
//   >("7d");

//   // Mock active website (for demo mode)
//   const mockActiveWebsite: ActiveWebsite = {
//     id: 1,
//     template_id: 1,
//     template_name: "Modern Village",
//     domain: "desa-sejahtera.klandesa.com",
//     custom_domain: "desasejahtera.id", // Custom domain example
//     is_active: true,
//     activated_at: "2024-06-15T00:00:00Z",
//     expires_at: "2025-06-15T00:00:00Z",
//     total_visitors: 12458,
//     visitors_today: 142,
//     visitors_month: 3245,
//     total_posts: 24,
//     preview_image:
//       "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800&h=600&fit=crop",
//     subscription_status: "expiring_soon",
//   };

//   const activeWebsite = isDemoMode ? mockActiveWebsite : null;

//   // Mock stats data
//   const mockVisitorData = {
//     "24h": [
//       { time: "00:00", visitors: 12 },
//       { time: "02:00", visitors: 8 },
//       { time: "04:00", visitors: 5 },
//       { time: "06:00", visitors: 15 },
//       { time: "08:00", visitors: 45 },
//       { time: "10:00", visitors: 68 },
//       { time: "12:00", visitors: 82 },
//       { time: "14:00", visitors: 75 },
//       { time: "16:00", visitors: 92 },
//       { time: "18:00", visitors: 65 },
//       { time: "20:00", visitors: 48 },
//       { time: "22:00", visitors: 25 },
//     ],
//     "7d": [
//       { day: "Sen", visitors: 245, pageviews: 680 },
//       { day: "Sel", visitors: 312, pageviews: 890 },
//       { day: "Rab", visitors: 289, pageviews: 750 },
//       { day: "Kam", visitors: 356, pageviews: 920 },
//       { day: "Jum", visitors: 398, pageviews: 1050 },
//       { day: "Sab", visitors: 425, pageviews: 1180 },
//       { day: "Min", visitors: 380, pageviews: 980 },
//     ],
//     "30d": [
//       { date: "1 Des", visitors: 320 },
//       { date: "5 Des", visitors: 380 },
//       { date: "10 Des", visitors: 450 },
//       { date: "15 Des", visitors: 520 },
//       { date: "20 Des", visitors: 480 },
//       { date: "25 Des", visitors: 560 },
//       { date: "30 Des", visitors: 590 },
//     ],
//     "90d": [
//       { month: "Okt", visitors: 8500 },
//       { month: "Nov", visitors: 10200 },
//       { month: "Des", visitors: 12458 },
//     ],
//   };

//   const mockDeviceData = [
//     { name: "Desktop", value: 6850, percentage: 55 },
//     { name: "Mobile", value: 4350, percentage: 35 },
//     { name: "Tablet", value: 1258, percentage: 10 },
//   ];

//   const mockTopPages = [
//     { page: "Beranda", visitors: 4256, percentage: 34.2, trend: "up" },
//     { page: "Berita Desa", visitors: 2845, percentage: 22.8, trend: "up" },
//     { page: "Profil Desa", visitors: 1890, percentage: 15.2, trend: "down" },
//     { page: "Layanan Surat", visitors: 1456, percentage: 11.7, trend: "up" },
//     { page: "Produk UKM", visitors: 1011, percentage: 8.1, trend: "up" },
//   ];

//   const mockTrafficSources = [
//     { source: "Direct", visitors: 5230, percentage: 42 },
//     { source: "Google Search", visitors: 3740, percentage: 30 },
//     { source: "Social Media", visitors: 2115, percentage: 17 },
//     { source: "Referral", visitors: 1373, percentage: 11 },
//   ];

//   const CHART_COLORS = ["#0f766e", "#14b8a6", "#2dd4bf", "#5eead4"];

//   // Calculate days until expiration
//   const getDaysUntilExpiration = (expiresAt: string): number => {
//     const now = new Date();
//     const expiry = new Date(expiresAt);
//     const diffTime = expiry.getTime() - now.getTime();
//     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
//     return diffDays;
//   };

//   // Format currency
//   const formatCurrency = (amount: number): string => {
//     return new Intl.NumberFormat("id-ID", {
//       style: "currency",
//       currency: "IDR",
//       minimumFractionDigits: 0,
//     }).format(amount);
//   };

//   // Copy to clipboard with fallback
//   const copyToClipboard = async (text: string, id: string) => {
//     try {
//       // Try modern Clipboard API first
//       if (navigator.clipboard && navigator.clipboard.writeText) {
//         await navigator.clipboard.writeText(text);
//         setCopiedText(id);
//         setTimeout(() => setCopiedText(null), 2000);
//       } else {
//         // Fallback to older method
//         const textarea = document.createElement("textarea");
//         textarea.value = text;
//         textarea.style.position = "fixed";
//         textarea.style.opacity = "0";
//         document.body.appendChild(textarea);
//         textarea.select();
//         document.execCommand("copy");
//         document.body.removeChild(textarea);
//         setCopiedText(id);
//         setTimeout(() => setCopiedText(null), 2000);
//       }
//     } catch (err) {
//       console.error("Failed to copy:", err);
//       // Still show success feedback even if copy fails
//       setCopiedText(id);
//       setTimeout(() => setCopiedText(null), 2000);
//     }
//   };

//   // Calculate prorate and deposit for template change
//   const calculateTemplateChange = () => {
//     if (!activeWebsite || !selectedNewTemplate) return null;

//     const currentTemplate = mockTemplates.find(
//       (t) => t.id === activeWebsite.template_id
//     );
//     if (!currentTemplate) return null;

//     // Calculate remaining days
//     const daysRemaining = getDaysUntilExpiration(activeWebsite.expires_at);
//     const totalDaysInYear = 365;

//     // Calculate prorate value of current template
//     const currentProrateValue =
//       (currentTemplate.price / totalDaysInYear) * daysRemaining;

//     // Calculate new template cost for remaining period
//     const newTemplateProrateValue =
//       (selectedNewTemplate.price / totalDaysInYear) * daysRemaining;

//     // Calculate difference
//     const difference = newTemplateProrateValue - currentProrateValue;

//     return {
//       currentTemplate,
//       newTemplate: selectedNewTemplate,
//       daysRemaining,
//       currentProrateValue,
//       newTemplateProrateValue,
//       difference,
//       isUpgrade: difference > 0,
//       depositAmount: difference < 0 ? Math.abs(difference) : 0,
//       additionalPayment: difference > 0 ? difference : 0,
//     };
//   };

//   // Filter templates
//   const filteredTemplates = mockTemplates.filter(
//     (template) =>
//       template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       template.description.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   // Handle template preview
//   const handlePreview = (template: WebsiteTemplate) => {
//     setSelectedTemplate(template);
//     setPreviewImageIndex(0);
//     setShowPreviewModal(true);
//   };

//   // Handle choose template
//   const handleChooseTemplate = (template: WebsiteTemplate) => {
//     setSelectedTemplate(template);
//     setCheckoutStep(1);
//     setShowCheckoutModal(true);
//   };

//   // Handle checkout proceed
//   const handleCheckoutProceed = () => {
//     if (checkoutStep < 4) {
//       setCheckoutStep(checkoutStep + 1);
//     } else {
//       // Process payment with Linkqu PGW
//       alert(
//         "Mengarahkan ke halaman pembayaran Linkqu...\n\nPembayaran akan diproses otomatis dan website akan aktif setelah pembayaran berhasil."
//       );
//       setShowCheckoutModal(false);
//       setCheckoutStep(1);
//       setCheckoutCustomDomain("");
//     }
//   };

//   // Get badge color
//   const getBadgeColor = (badge?: string) => {
//     switch (badge) {
//       case "Popular":
//         return "bg-blue-100 text-blue-700 border-blue-200";
//       case "Recommended":
//         return "bg-green-100 text-green-700 border-green-200";
//       case "Best Seller":
//         return "bg-purple-100 text-purple-700 border-purple-200";
//       default:
//         return "bg-gray-100 text-gray-700 border-gray-200";
//     }
//   };

//   return (
//     <div className="space-y-6">
//       {/* Toggle Demo Button (for testing) */}
//       <div className="flex justify-end">
//         <button
//           onClick={() => setIsDemoMode(!isDemoMode)}
//           className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
//         >
//           <Power className="w-4 h-4" />
//           {isDemoMode ? "Mode: Berlangganan" : "Mode: Belum Berlangganan"}
//         </button>
//       </div>

//       {/* Status Banner */}
//       {!activeWebsite ? (
//         <motion.div
//           initial={{ opacity: 0, y: -20 }}
//           animate={{ opacity: 1, y: 0 }}
//           className="bg-linear-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-6"
//         >
//           <div className="flex items-start gap-4">
//             <div className="shrink-0">
//               <AlertCircle className="w-6 h-6 text-orange-600" />
//             </div>
//             <div className="flex-1">
//               <h3 className="font-semibold text-orange-900 mb-1">
//                 Website Anda Belum Aktif
//               </h3>
//               <p className="text-sm text-orange-800 mb-3">
//                 Pilih template website yang sesuai dengan kebutuhan desa Anda.
//                 Website akan aktif setelah pembayaran diverifikasi.
//               </p>
//               <div className="flex items-center gap-3">
//                 <div className="flex items-center gap-2 text-sm text-orange-700">
//                   <Check className="w-4 h-4" />
//                   <span>Pembayaran Tahunan</span>
//                 </div>
//                 <div className="flex items-center gap-2 text-sm text-orange-700">
//                   <Check className="w-4 h-4" />
//                   <span>Free Hosting</span>
//                 </div>
//                 <div className="flex items-center gap-2 text-sm text-orange-700">
//                   <Check className="w-4 h-4" />
//                   <span>Free SSL</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </motion.div>
//       ) : (
//         <>
//           {/* Subscription Status Banner */}
//           {activeWebsite.subscription_status === "expiring_soon" &&
//             getDaysUntilExpiration(activeWebsite.expires_at) <= 30 && (
//               <motion.div
//                 initial={{ opacity: 0, y: -20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 className="bg-linear-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg p-6"
//               >
//                 <div className="flex items-start justify-between gap-4">
//                   <div className="flex items-start gap-4">
//                     <div className="shrink-0">
//                       <Clock className="w-6 h-6 text-yellow-600" />
//                     </div>
//                     <div className="flex-1">
//                       <h3 className="font-semibold text-yellow-900 mb-1">
//                         Berlangganan Anda Akan Berakhir
//                       </h3>
//                       <p className="text-sm text-yellow-800">
//                         Website Anda akan berakhir dalam{" "}
//                         <span className="font-bold">
//                           {getDaysUntilExpiration(activeWebsite.expires_at)}{" "}
//                           hari
//                         </span>
//                         . Perpanjang sekarang untuk menjaga website tetap
//                         online.
//                       </p>
//                     </div>
//                   </div>
//                   <button
//                     onClick={() => setShowRenewalModal(true)}
//                     className="shrink-0 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium inline-flex items-center gap-2"
//                   >
//                     <RefreshCw className="w-4 h-4" />
//                     Perpanjang
//                   </button>
//                 </div>
//               </motion.div>
//             )}

//           {/* Active Website Section */}
//           <motion.div
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
//           >
//             <div className="p-6 border-b border-gray-200">
//               <div className="flex items-center justify-between">
//                 <h2 className="text-xl font-semibold text-gray-900">
//                   Website Aktif Anda
//                 </h2>
//                 <div className="flex items-center gap-2">
//                   <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
//                     <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
//                     Online
//                   </span>
//                 </div>
//               </div>
//             </div>

//             {/* Main Content Grid */}
//             <div className="p-6">
//               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                 {/* Left: Preview & Actions */}
//                 <div className="lg:col-span-2 space-y-6">
//                   {/* Website Preview */}
//                   <div>
//                     <Image
//                       src={activeWebsite.preview_image}
//                       alt={activeWebsite.template_name}
//                       className="w-full rounded-lg border border-gray-200 shadow-sm"
//                       width={700}
//                       height={400}
//                     />
//                     <div className="mt-4 flex items-center justify-between">
//                       <div>
//                         <h3 className="font-semibold text-gray-900">
//                           Template: {activeWebsite.template_name}
//                         </h3>
//                         <a
//                           href={`https://${activeWebsite.domain}`}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mt-1"
//                         >
//                           {activeWebsite.domain}
//                           <ExternalLink className="w-3 h-3" />
//                         </a>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Quick Analytics */}
//                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//                     <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
//                       <div className="flex items-center gap-2 text-blue-600 mb-1">
//                         <Users className="w-4 h-4" />
//                         <span className="text-xs font-medium">Hari Ini</span>
//                       </div>
//                       <p className="text-2xl font-bold text-blue-900">
//                         {activeWebsite.visitors_today}
//                       </p>
//                     </div>
//                     <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
//                       <div className="flex items-center gap-2 text-purple-600 mb-1">
//                         <BarChart3 className="w-4 h-4" />
//                         <span className="text-xs font-medium">Bulan Ini</span>
//                       </div>
//                       <p className="text-2xl font-bold text-purple-900">
//                         {activeWebsite.visitors_month.toLocaleString()}
//                       </p>
//                     </div>
//                     <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
//                       <div className="flex items-center gap-2 text-green-600 mb-1">
//                         <TrendingUp className="w-4 h-4" />
//                         <span className="text-xs font-medium">Total</span>
//                       </div>
//                       <p className="text-2xl font-bold text-green-900">
//                         {activeWebsite.total_visitors.toLocaleString()}
//                       </p>
//                     </div>
//                     <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
//                       <div className="flex items-center gap-2 text-orange-600 mb-1">
//                         <FileText className="w-4 h-4" />
//                         <span className="text-xs font-medium">Artikel</span>
//                       </div>
//                       <p className="text-2xl font-bold text-orange-900">
//                         {activeWebsite.total_posts}
//                       </p>
//                     </div>
//                   </div>

//                   {/* Action Buttons */}
//                   <div className="grid grid-cols-2 gap-3">
//                     <button
//                       onClick={() => setShowContentModal(true)}
//                       className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
//                     >
//                       <Settings className="w-5 h-5" />
//                       Kelola Konten
//                     </button>
//                     <button
//                       onClick={() => setShowStatsModal(true)}
//                       className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
//                     >
//                       <BarChart3 className="w-5 h-5" />
//                       Lihat Statistik
//                     </button>
//                     <button className="inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
//                       <Share2 className="w-5 h-5" />
//                       Bagikan
//                     </button>
//                   </div>
//                 </div>

//                 {/* Right: Subscription Info */}
//                 <div className="space-y-4">
//                   {/* Subscription Card */}
//                   <div className="p-5 bg-linear-to-br from-teal-50 to-blue-50 border border-teal-200 rounded-xl">
//                     <div className="flex items-center gap-2 mb-4">
//                       <CreditCard className="w-5 h-5 text-teal-600" />
//                       <h4 className="font-semibold text-gray-900">
//                         Informasi Berlangganan
//                       </h4>
//                     </div>
//                     <div className="space-y-3">
//                       <div>
//                         <p className="text-xs text-gray-600 mb-1">Status</p>
//                         <span
//                           className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
//                             activeWebsite.subscription_status === "active"
//                               ? "bg-green-100 text-green-700"
//                               : activeWebsite.subscription_status ===
//                                 "expiring_soon"
//                               ? "bg-yellow-100 text-yellow-700"
//                               : "bg-red-100 text-red-700"
//                           }`}
//                         >
//                           {activeWebsite.subscription_status === "active" &&
//                             "Aktif"}
//                           {activeWebsite.subscription_status ===
//                             "expiring_soon" && "Segera Berakhir"}
//                           {activeWebsite.subscription_status === "expired" &&
//                             "Kadaluarsa"}
//                         </span>
//                       </div>
//                       <div>
//                         <p className="text-xs text-gray-600 mb-1">
//                           Tanggal Mulai
//                         </p>
//                         <p className="font-medium text-gray-900">
//                           {new Date(
//                             activeWebsite.activated_at
//                           ).toLocaleDateString("id-ID", {
//                             day: "numeric",
//                             month: "long",
//                             year: "numeric",
//                           })}
//                         </p>
//                       </div>
//                       <div>
//                         <p className="text-xs text-gray-600 mb-1">
//                           Berakhir Pada
//                         </p>
//                         <p className="font-medium text-gray-900">
//                           {new Date(
//                             activeWebsite.expires_at
//                           ).toLocaleDateString("id-ID", {
//                             day: "numeric",
//                             month: "long",
//                             year: "numeric",
//                           })}
//                         </p>
//                         <p className="text-xs text-gray-600 mt-1">
//                           ({getDaysUntilExpiration(activeWebsite.expires_at)}{" "}
//                           hari lagi)
//                         </p>
//                       </div>
//                       <div className="pt-3 border-t border-teal-200">
//                         <p className="text-xs text-gray-600 mb-1">
//                           Biaya Berlangganan
//                         </p>
//                         <p className="text-xl font-bold text-teal-600">
//                           {formatCurrency(
//                             mockTemplates.find(
//                               (t) => t.id === activeWebsite.template_id
//                             )?.price || 0
//                           )}
//                         </p>
//                         <p className="text-xs text-gray-500">Per tahun</p>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Renewal Button */}
//                   <button
//                     onClick={() => setShowRenewalModal(true)}
//                     className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
//                   >
//                     <RefreshCw className="w-5 h-5" />
//                     Perpanjang Berlangganan
//                   </button>

//                   {/* Change Template */}
//                   <button
//                     onClick={() => {
//                       setShowChangeTemplateModal(true);
//                       setChangeTemplateStep(1);
//                       setSelectedNewTemplate(null);
//                       setCustomDomain("");
//                     }}
//                     className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium"
//                   >
//                     <Palette className="w-5 h-5" />
//                     Ganti Template
//                   </button>

//                   {/* Quick Links */}
//                   <div className="pt-4 border-t border-gray-200">
//                     <h4 className="text-sm font-medium text-gray-900 mb-3">
//                       Quick Links
//                     </h4>
//                     <div className="space-y-2">
//                       <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2">
//                         <Download className="w-4 h-4 text-gray-500" />
//                         Download Laporan
//                       </button>
//                       <button
//                         onClick={() =>
//                           activeWebsite?.custom_domain && setShowDnsModal(true)
//                         }
//                         disabled={!activeWebsite?.custom_domain}
//                         className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
//                           activeWebsite?.custom_domain
//                             ? "text-gray-700 hover:bg-gray-50 cursor-pointer"
//                             : "text-gray-400 cursor-not-allowed opacity-60"
//                         }`}
//                       >
//                         <Settings className="w-4 h-4 text-gray-500" />
//                         Pengaturan Domain
//                       </button>
//                       <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2">
//                         <CreditCard className="w-4 h-4 text-gray-500" />
//                         Riwayat Pembayaran
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </motion.div>
//         </>
//       )}

//       {/* Template Gallery */}
//       <motion.div
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ delay: 0.1 }}
//         className="bg-white rounded-xl shadow-sm border border-gray-200"
//       >
//         <div className="p-6 border-b border-gray-200">
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//             <div>
//               <h2 className="text-xl font-semibold text-gray-900">
//                 {activeWebsite
//                   ? "Ganti Template Website"
//                   : "Pilih Template Website"}
//               </h2>
//               <p className="text-sm text-gray-600 mt-1">
//                 {filteredTemplates.length} template tersedia
//               </p>
//             </div>
//             <div className="relative w-full sm:w-auto">
//               <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
//               <input
//                 type="text"
//                 placeholder="Cari template..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//                 className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//               />
//             </div>
//           </div>
//         </div>

//         <div className="p-6">
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {filteredTemplates.map((template) => (
//               <motion.div
//                 key={template.id}
//                 initial={{ opacity: 0, scale: 0.95 }}
//                 animate={{ opacity: 1, scale: 1 }}
//                 className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-teal-300 transition-all group"
//               >
//                 <div className="relative aspect-video bg-gray-100 overflow-hidden">
//                   <img
//                     src={template.preview_images[0]}
//                     alt={template.name}
//                     className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
//                   />
//                   {template.badge && (
//                     <div className="absolute top-3 left-3">
//                       <span
//                         className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${getBadgeColor(
//                           template.badge
//                         )}`}
//                       >
//                         {template.badge === "Popular" && (
//                           <TrendingUp className="w-3 h-3" />
//                         )}
//                         {template.badge === "Recommended" && (
//                           <Star className="w-3 h-3" />
//                         )}
//                         {template.badge === "Best Seller" && (
//                           <Crown className="w-3 h-3" />
//                         )}
//                         {template.badge}
//                       </span>
//                     </div>
//                   )}
//                   {template.is_premium && (
//                     <div className="absolute top-3 right-3">
//                       <span className="inline-flex items-center gap-1 px-3 py-1 bg-linear-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold">
//                         <Sparkles className="w-3 h-3" />
//                         Premium
//                       </span>
//                     </div>
//                   )}
//                   <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
//                     <button
//                       onClick={() => handlePreview(template)}
//                       className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
//                     >
//                       <Eye className="w-4 h-4" />
//                       Preview
//                     </button>
//                     {template.demo_url && (
//                       <a
//                         href={template.demo_url}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors inline-flex items-center gap-2"
//                       >
//                         <ExternalLink className="w-4 h-4" />
//                         Demo
//                       </a>
//                     )}
//                   </div>
//                 </div>

//                 <div className="p-5">
//                   <h3 className="font-bold text-lg text-gray-900 mb-2">
//                     {template.name}
//                   </h3>
//                   <p className="text-sm text-gray-600 mb-4 line-clamp-2">
//                     {template.description}
//                   </p>

//                   <div className="mb-4">
//                     <div className="flex items-center gap-2 mb-2">
//                       <Layout className="w-4 h-4 text-teal-600" />
//                       <span className="text-xs font-medium text-gray-700">
//                         Fitur Utama:
//                       </span>
//                     </div>
//                     <div className="space-y-1">
//                       {template.features.slice(0, 4).map((feature, index) => (
//                         <div
//                           key={index}
//                           className="flex items-center gap-2 text-xs text-gray-600"
//                         >
//                           <Check className="w-3 h-3 text-green-600 shrink-0" />
//                           <span>{feature}</span>
//                         </div>
//                       ))}
//                       {template.features.length > 4 && (
//                         <p className="text-xs text-teal-600 font-medium">
//                           +{template.features.length - 4} fitur lainnya
//                         </p>
//                       )}
//                     </div>
//                   </div>

//                   <div className="flex items-center justify-between pt-4 border-t border-gray-200">
//                     <div>
//                       <p className="text-xs text-gray-500 mb-1">Harga</p>
//                       <p className="text-xl font-bold text-teal-600">
//                         {formatCurrency(template.price)}
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => handleChooseTemplate(template)}
//                       className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
//                     >
//                       Pilih
//                     </button>
//                   </div>
//                 </div>
//               </motion.div>
//             ))}
//           </div>

//           {filteredTemplates.length === 0 && (
//             <div className="text-center py-12">
//               <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
//               <p className="text-gray-500">Tidak ada template ditemukan</p>
//             </div>
//           )}
//         </div>
//       </motion.div>

//       {/* Preview Modal */}
//       <AnimatePresence>
//         {showPreviewModal && selectedTemplate && (
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
//               className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
//             >
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">
//                     {selectedTemplate.name}
//                   </h3>
//                   <p className="text-sm text-gray-600 mt-1">
//                     {selectedTemplate.description}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowPreviewModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5 text-gray-600" />
//                 </button>
//               </div>

//               <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                   <div className="lg:col-span-2 space-y-4">
//                     <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-200">
//                       <img
//                         src={selectedTemplate.preview_images[previewImageIndex]}
//                         alt={`Preview ${previewImageIndex + 1}`}
//                         className="w-full h-full object-cover"
//                       />
//                     </div>
//                     {selectedTemplate.preview_images.length > 1 && (
//                       <div className="flex items-center justify-center gap-2">
//                         <button
//                           onClick={() =>
//                             setPreviewImageIndex(
//                               Math.max(0, previewImageIndex - 1)
//                             )
//                           }
//                           disabled={previewImageIndex === 0}
//                           className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                           <ChevronLeft className="w-5 h-5" />
//                         </button>
//                         <div className="flex gap-2">
//                           {selectedTemplate.preview_images.map((_, index) => (
//                             <button
//                               key={index}
//                               onClick={() => setPreviewImageIndex(index)}
//                               className={`w-2 h-2 rounded-full transition-colors ${
//                                 index === previewImageIndex
//                                   ? "bg-teal-600 w-6"
//                                   : "bg-gray-300"
//                               }`}
//                             />
//                           ))}
//                         </div>
//                         <button
//                           onClick={() =>
//                             setPreviewImageIndex(
//                               Math.min(
//                                 selectedTemplate.preview_images.length - 1,
//                                 previewImageIndex + 1
//                               )
//                             )
//                           }
//                           disabled={
//                             previewImageIndex ===
//                             selectedTemplate.preview_images.length - 1
//                           }
//                           className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                         >
//                           <ChevronRight className="w-5 h-5" />
//                         </button>
//                       </div>
//                     )}
//                   </div>

//                   <div className="space-y-4">
//                     <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
//                       <p className="text-sm text-gray-600 mb-1">
//                         Harga Berlangganan
//                       </p>
//                       <p className="text-2xl font-bold text-teal-600">
//                         {formatCurrency(selectedTemplate.price)}
//                       </p>
//                       <p className="text-xs text-gray-500 mt-1">
//                         Per tahun (perpanjangan otomatis)
//                       </p>
//                     </div>

//                     <div>
//                       <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
//                         <Award className="w-5 h-5 text-teal-600" />
//                         Fitur Lengkap
//                       </h4>
//                       <div className="space-y-2">
//                         {selectedTemplate.features.map((feature, index) => (
//                           <div
//                             key={index}
//                             className="flex items-start gap-2 text-sm text-gray-700"
//                           >
//                             <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
//                             <span>{feature}</span>
//                           </div>
//                         ))}
//                       </div>
//                     </div>

//                     <div className="pt-4 border-t border-gray-200">
//                       <div className="flex items-center gap-2 mb-2">
//                         <Smartphone className="w-4 h-4 text-teal-600" />
//                         <span className="text-sm font-medium text-gray-700">
//                           Responsive
//                         </span>
//                       </div>
//                       <div className="flex items-center gap-2 mb-2">
//                         <Zap className="w-4 h-4 text-teal-600" />
//                         <span className="text-sm font-medium text-gray-700">
//                           Fast Loading
//                         </span>
//                       </div>
//                       <div className="flex items-center gap-2">
//                         <SearchIcon className="w-4 h-4 text-teal-600" />
//                         <span className="text-sm font-medium text-gray-700">
//                           SEO Optimized
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
//                 {selectedTemplate.demo_url && (
//                   <a
//                     href={selectedTemplate.demo_url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                   >
//                     <ExternalLink className="w-4 h-4" />
//                     Lihat Demo Live
//                   </a>
//                 )}
//                 <div className="flex items-center gap-3 ml-auto">
//                   <button
//                     onClick={() => setShowPreviewModal(false)}
//                     className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                   >
//                     Tutup
//                   </button>
//                   <button
//                     onClick={() => {
//                       setShowPreviewModal(false);
//                       handleChooseTemplate(selectedTemplate);
//                     }}
//                     className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
//                   >
//                     Pilih Template Ini
//                   </button>
//                 </div>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Checkout Modal */}
//       <AnimatePresence>
//         {showCheckoutModal && selectedTemplate && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowCheckoutModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col my-8"
//             >
//               {/* Header - Fixed */}
//               <div className="px-6 py-4 border-b border-gray-200 shrink-0">
//                 <h3 className="text-xl font-bold text-gray-900">
//                   Checkout Website
//                 </h3>
//                 <p className="text-sm text-gray-600 mt-1">
//                   {checkoutStep === 1 && "Konfirmasi template yang dipilih"}
//                   {checkoutStep === 2 && "Pilih domain untuk website"}
//                   {checkoutStep === 3 && "Pilih metode pembayaran"}
//                   {checkoutStep === 4 && "Konfirmasi pesanan Anda"}
//                 </p>
//                 <div className="flex items-center gap-2 mt-4">
//                   {[
//                     { num: 1, label: "Template" },
//                     { num: 2, label: "Domain" },
//                     { num: 3, label: "Pembayaran" },
//                     { num: 4, label: "Konfirmasi" },
//                   ].map((step, idx) => (
//                     <div key={step.num} className="flex items-center flex-1">
//                       <div className="flex flex-col items-center gap-1">
//                         <div
//                           className={`flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm ${
//                             checkoutStep >= step.num
//                               ? "bg-teal-600 text-white"
//                               : "bg-gray-200 text-gray-600"
//                           }`}
//                         >
//                           {step.num}
//                         </div>
//                         <span
//                           className={`text-xs font-medium ${
//                             checkoutStep >= step.num
//                               ? "text-teal-600"
//                               : "text-gray-500"
//                           }`}
//                         >
//                           {step.label}
//                         </span>
//                       </div>
//                       {idx < 3 && (
//                         <div
//                           className={`flex-1 h-1 mx-2 mb-5 ${
//                             checkoutStep > step.num
//                               ? "bg-teal-600"
//                               : "bg-gray-200"
//                           }`}
//                         />
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               {/* Content - Scrollable */}
//               <div className="px-6 py-6 overflow-y-auto flex-1">
//                 {/* Step 1: Konfirmasi Template */}
//                 {checkoutStep === 1 && (
//                   <div className="space-y-4">
//                     <h4 className="font-semibold text-gray-900">
//                       Konfirmasi Template
//                     </h4>
//                     <div className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
//                       <img
//                         src={selectedTemplate.preview_images[0]}
//                         alt={selectedTemplate.name}
//                         className="w-32 h-24 object-cover rounded-lg"
//                       />
//                       <div className="flex-1">
//                         <h5 className="font-semibold text-gray-900">
//                           {selectedTemplate.name}
//                         </h5>
//                         <p className="text-sm text-gray-600 mt-1 line-clamp-2">
//                           {selectedTemplate.description}
//                         </p>
//                         <p className="text-lg font-bold text-teal-600 mt-2">
//                           {formatCurrency(selectedTemplate.price)}/tahun
//                         </p>
//                       </div>
//                     </div>
//                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                       <p className="text-sm text-blue-900 font-medium mb-2">
//                         ✨ Termasuk dalam paket:
//                       </p>
//                       <ul className="text-sm text-blue-800 space-y-1">
//                         <li>• Free hosting & SSL certificate</li>
//                         <li>• Subdomain .klandesa.com gratis</li>
//                         <li>• Support & maintenance 24/7</li>
//                         <li>• Update template gratis</li>
//                         <li>• Bandwidth unlimited</li>
//                         <li>• Backup otomatis harian</li>
//                       </ul>
//                     </div>
//                   </div>
//                 )}

//                 {/* Step 2: Input Domain */}
//                 {checkoutStep === 2 && (
//                   <div className="space-y-5">
//                     <h4 className="font-semibold text-gray-900">
//                       Pilih Domain Website
//                     </h4>

//                     {/* Domain Options */}
//                     <div className="space-y-3">
//                       {/* Subdomain Klandesa */}
//                       <div
//                         className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
//                           !checkoutCustomDomain
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                         onClick={() => setCheckoutCustomDomain("")}
//                       >
//                         <div className="flex items-start gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
//                               !checkoutCustomDomain
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {!checkoutCustomDomain && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <div className="flex-1">
//                             <div className="flex items-center gap-2 mb-1">
//                               <p className="font-semibold text-gray-900">
//                                 Subdomain Klandesa
//                               </p>
//                               <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
//                                 GRATIS
//                               </span>
//                             </div>
//                             <p className="text-sm text-gray-600 mb-2">
//                               Gunakan subdomain default dari Klandesa
//                             </p>
//                             <div className="p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700">
//                               desa-anda.klandesa.com
//                             </div>
//                             <div className="mt-2 flex items-center gap-2 text-xs text-green-700">
//                               <CheckCircle2 className="w-4 h-4" />
//                               <span>
//                                 Otomatis aktif, tidak perlu konfigurasi DNS
//                               </span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Custom Domain */}
//                       <div
//                         className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
//                           checkoutCustomDomain
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                         onClick={() =>
//                           document
//                             .getElementById("checkoutCustomDomainInput")
//                             ?.focus()
//                         }
//                       >
//                         <div className="flex items-start gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
//                               checkoutCustomDomain
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {checkoutCustomDomain && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <div className="flex-1">
//                             <div className="flex items-center gap-2 mb-1">
//                               <p className="font-semibold text-gray-900">
//                                 Custom Domain
//                               </p>
//                               <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-bold rounded">
//                                 PREMIUM
//                               </span>
//                             </div>
//                             <p className="text-sm text-gray-600 mb-2">
//                               Gunakan domain sendiri (lebih profesional)
//                             </p>
//                             <input
//                               id="checkoutCustomDomainInput"
//                               type="text"
//                               placeholder="contoh: desasejahtera.id"
//                               value={checkoutCustomDomain}
//                               onChange={(e) =>
//                                 setCheckoutCustomDomain(e.target.value)
//                               }
//                               className="w-full p-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
//                             />
//                             <div className="mt-2 flex items-center gap-2 text-xs text-blue-700">
//                               <Zap className="w-4 h-4" />
//                               <span>Setup otomatis via DNS management</span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Domain Benefits */}
//                     {checkoutCustomDomain && (
//                       <motion.div
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         className="p-4 bg-blue-50 border border-blue-200 rounded-lg"
//                       >
//                         <p className="text-sm text-blue-900 font-medium mb-2">
//                           ℹ️ Setup Custom Domain (Otomatis):
//                         </p>
//                         <ul className="text-sm text-blue-800 space-y-1">
//                           <li>
//                             • Verifikasi kepemilikan domain otomatis via email
//                           </li>
//                           <li>
//                             • Konfigurasi DNS otomatis (jika registrar support
//                             API)
//                           </li>
//                           <li>
//                             • SSL certificate otomatis dari Let's Encrypt
//                             (gratis)
//                           </li>
//                           <li>
//                             • Website aktif dalam 5-10 menit setelah DNS
//                             propagation
//                           </li>
//                         </ul>
//                       </motion.div>
//                     )}
//                   </div>
//                 )}

//                 {/* Step 3: Pilih Pembayaran */}
//                 {checkoutStep === 3 && (
//                   <div className="space-y-5">
//                     <h4 className="font-semibold text-gray-900">
//                       Pilih Metode Pembayaran
//                     </h4>
//                     <p className="text-sm text-gray-600">
//                       Pembayaran menggunakan payment gateway Linkqu yang aman
//                       dan terpercaya
//                     </p>

//                     <div className="space-y-3">
//                       {/* QRIS */}
//                       <button
//                         onClick={() => setCheckoutPaymentMethod("qris")}
//                         className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                           checkoutPaymentMethod === "qris"
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                       >
//                         <div className="flex items-center gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
//                               checkoutPaymentMethod === "qris"
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {checkoutPaymentMethod === "qris" && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <QrCodeIcon className="w-8 h-8 text-gray-700" />
//                           <div>
//                             <p className="font-medium text-gray-900">
//                               QRIS (Quick Response Code)
//                             </p>
//                             <p className="text-sm text-gray-600">
//                               Scan QR code dari e-wallet atau m-banking apapun
//                             </p>
//                           </div>
//                         </div>
//                       </button>

//                       {/* Virtual Account */}
//                       <button
//                         onClick={() => setCheckoutPaymentMethod("va")}
//                         className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                           checkoutPaymentMethod === "va"
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                       >
//                         <div className="flex items-center gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
//                               checkoutPaymentMethod === "va"
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {checkoutPaymentMethod === "va" && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <CreditCard className="w-8 h-8 text-gray-700" />
//                           <div>
//                             <p className="font-medium text-gray-900">
//                               Virtual Account
//                             </p>
//                             <p className="text-sm text-gray-600">
//                               BCA, Mandiri, BNI, BRI, Permata, CIMB Niaga
//                             </p>
//                           </div>
//                         </div>
//                       </button>

//                       {/* E-Wallet */}
//                       <button
//                         onClick={() => setCheckoutPaymentMethod("ewallet")}
//                         className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                           checkoutPaymentMethod === "ewallet"
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                       >
//                         <div className="flex items-center gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
//                               checkoutPaymentMethod === "ewallet"
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {checkoutPaymentMethod === "ewallet" && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <Smartphone className="w-8 h-8 text-gray-700" />
//                           <div>
//                             <p className="font-medium text-gray-900">
//                               E-Wallet
//                             </p>
//                             <p className="text-sm text-gray-600">
//                               GoPay, OVO, Dana, ShopeePay, LinkAja
//                             </p>
//                           </div>
//                         </div>
//                       </button>
//                     </div>

//                     {/* Payment Info */}
//                     <div className="p-4 bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
//                       <div className="flex items-start gap-3">
//                         <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
//                         <div>
//                           <p className="text-sm text-green-900 font-semibold mb-1">
//                             Pembayaran Otomatis dengan Linkqu
//                           </p>
//                           <ul className="text-sm text-green-800 space-y-1">
//                             <li>• Tidak perlu upload bukti pembayaran</li>
//                             <li>• Verifikasi otomatis real-time</li>
//                             <li>
//                               • Website aktif otomatis setelah pembayaran
//                               berhasil
//                             </li>
//                             <li>• Aman dan terenkripsi</li>
//                           </ul>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Step 4: Konfirmasi Pesanan */}
//                 {checkoutStep === 4 && (
//                   <div className="space-y-5">
//                     <h4 className="font-semibold text-gray-900">
//                       Konfirmasi Pesanan
//                     </h4>

//                     {/* Order Summary */}
//                     <div className="p-5 bg-linear-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
//                       <h5 className="font-semibold text-gray-900 mb-4">
//                         Ringkasan Pesanan
//                       </h5>

//                       {/* Template */}
//                       <div className="flex gap-3 mb-4 pb-4 border-b border-gray-300">
//                         <img
//                           src={selectedTemplate.preview_images[0]}
//                           alt={selectedTemplate.name}
//                           className="w-20 h-16 object-cover rounded-lg"
//                         />
//                         <div className="flex-1">
//                           <p className="text-sm text-gray-600">
//                             Template Website
//                           </p>
//                           <p className="font-semibold text-gray-900">
//                             {selectedTemplate.name}
//                           </p>
//                           <p className="text-sm text-teal-600 font-medium">
//                             {formatCurrency(selectedTemplate.price)}/tahun
//                           </p>
//                         </div>
//                       </div>

//                       {/* Domain */}
//                       <div className="mb-4 pb-4 border-b border-gray-300">
//                         <p className="text-sm text-gray-600 mb-1">Domain</p>
//                         <div className="flex items-center gap-2">
//                           <Globe className="w-4 h-4 text-gray-500" />
//                           <p className="font-medium text-gray-900 font-mono text-sm">
//                             {checkoutCustomDomain || "desa-anda.klandesa.com"}
//                           </p>
//                           {!checkoutCustomDomain && (
//                             <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">
//                               GRATIS
//                             </span>
//                           )}
//                         </div>
//                       </div>

//                       {/* Payment Method */}
//                       <div className="mb-4 pb-4 border-b border-gray-300">
//                         <p className="text-sm text-gray-600 mb-1">
//                           Metode Pembayaran
//                         </p>
//                         <div className="flex items-center gap-2">
//                           {checkoutPaymentMethod === "qris" && (
//                             <QrCodeIcon className="w-4 h-4 text-gray-700" />
//                           )}
//                           {checkoutPaymentMethod === "va" && (
//                             <CreditCard className="w-4 h-4 text-gray-700" />
//                           )}
//                           {checkoutPaymentMethod === "ewallet" && (
//                             <Smartphone className="w-4 h-4 text-gray-700" />
//                           )}
//                           <p className="font-medium text-gray-900">
//                             {checkoutPaymentMethod === "qris" && "QRIS"}
//                             {checkoutPaymentMethod === "va" &&
//                               "Virtual Account"}
//                             {checkoutPaymentMethod === "ewallet" && "E-Wallet"}
//                           </p>
//                         </div>
//                       </div>

//                       {/* Total */}
//                       <div className="flex items-center justify-between">
//                         <span className="font-semibold text-gray-900">
//                           Total Pembayaran
//                         </span>
//                         <span className="text-2xl font-bold text-teal-600">
//                           {formatCurrency(selectedTemplate.price)}
//                         </span>
//                       </div>
//                     </div>

//                     {/* Terms & Conditions */}
//                     <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//                       <p className="text-sm text-yellow-900 font-medium mb-2">
//                         📋 Ketentuan Pemesanan:
//                       </p>
//                       <ul className="text-sm text-yellow-800 space-y-1">
//                         <li>
//                           • Masa aktif website 1 tahun dari tanggal pembayaran
//                         </li>
//                         <li>
//                           • Website akan aktif otomatis dalam 5-15 menit setelah
//                           pembayaran berhasil
//                         </li>
//                         <li>
//                           • Custom domain akan di-setup otomatis (jika dipilih)
//                         </li>
//                         <li>
//                           • Anda akan menerima email konfirmasi setelah
//                           pembayaran berhasil
//                         </li>
//                         <li>• Hubungi support jika ada kendala</li>
//                       </ul>
//                     </div>

//                     {/* Powered by Linkqu */}
//                     <div className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg">
//                       <Zap className="w-5 h-5 text-teal-600" />
//                       <span className="text-sm text-gray-600">
//                         Pembayaran aman dengan
//                       </span>
//                       <span className="font-bold text-teal-600">
//                         Linkqu Payment Gateway
//                       </span>
//                     </div>
//                   </div>
//                 )}
//               </div>

//               {/* Footer - Fixed */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
//                 <button
//                   onClick={() => {
//                     if (checkoutStep === 1) {
//                       setShowCheckoutModal(false);
//                       setCheckoutStep(1);
//                       setCheckoutCustomDomain("");
//                     } else {
//                       setCheckoutStep(checkoutStep - 1);
//                     }
//                   }}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   {checkoutStep === 1 ? "Batal" : "Kembali"}
//                 </button>
//                 <button
//                   onClick={handleCheckoutProceed}
//                   className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium inline-flex items-center gap-2"
//                 >
//                   {checkoutStep === 4 ? (
//                     <>
//                       <Zap className="w-4 h-4" />
//                       Bayar dengan Linkqu
//                     </>
//                   ) : (
//                     "Lanjutkan"
//                   )}
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Renewal Payment Modal */}
//       <AnimatePresence>
//         {showRenewalModal && activeWebsite && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowRenewalModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
//             >
//               {/* Header */}
//               <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <h3 className="text-xl font-bold text-gray-900">
//                       Perpanjang Berlangganan
//                     </h3>
//                     <p className="text-sm text-gray-600 mt-1">
//                       Pilih metode pembayaran untuk perpanjangan 1 tahun
//                     </p>
//                   </div>
//                   <button
//                     onClick={() => setShowRenewalModal(false)}
//                     className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                   >
//                     <X className="w-5 h-5 text-gray-600" />
//                   </button>
//                 </div>
//               </div>

//               {/* Content */}
//               <div className="px-6 py-6 space-y-6">
//                 {/* Subscription Summary */}
//                 <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
//                   <div className="flex items-center justify-between mb-2">
//                     <span className="text-sm text-gray-700">Template:</span>
//                     <span className="font-medium text-gray-900">
//                       {activeWebsite.template_name}
//                     </span>
//                   </div>
//                   <div className="flex items-center justify-between mb-2">
//                     <span className="text-sm text-gray-700">Periode:</span>
//                     <span className="font-medium text-gray-900">1 Tahun</span>
//                   </div>
//                   <div className="flex items-center justify-between pt-2 border-t border-teal-200">
//                     <span className="text-sm text-gray-700">
//                       Total Pembayaran:
//                     </span>
//                     <span className="text-2xl font-bold text-teal-600">
//                       {formatCurrency(
//                         mockTemplates.find(
//                           (t) => t.id === activeWebsite.template_id
//                         )?.price || 0
//                       )}
//                     </span>
//                   </div>
//                 </div>

//                 {/* Payment Method Selection */}
//                 <div>
//                   <h4 className="font-semibold text-gray-900 mb-3">
//                     Pilih Metode Pembayaran
//                   </h4>
//                   <div className="space-y-3">
//                     {/* QRIS */}
//                     <button
//                       onClick={() => setRenewalPaymentMethod("qris")}
//                       className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                         renewalPaymentMethod === "qris"
//                           ? "border-teal-600 bg-teal-50"
//                           : "border-gray-200 hover:border-gray-300"
//                       }`}
//                     >
//                       <div className="flex items-center gap-3">
//                         <div
//                           className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
//                             renewalPaymentMethod === "qris"
//                               ? "border-teal-600"
//                               : "border-gray-300"
//                           }`}
//                         >
//                           {renewalPaymentMethod === "qris" && (
//                             <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                           )}
//                         </div>
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2">
//                             <QrCodeIcon className="w-5 h-5 text-gray-700" />
//                             <p className="font-medium text-gray-900">QRIS</p>
//                           </div>
//                           <p className="text-sm text-gray-600 mt-1">
//                             Scan QR untuk bayar via aplikasi apapun
//                           </p>
//                         </div>
//                       </div>
//                     </button>

//                     {/* Virtual Account */}
//                     <button
//                       onClick={() => setRenewalPaymentMethod("va")}
//                       className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                         renewalPaymentMethod === "va"
//                           ? "border-teal-600 bg-teal-50"
//                           : "border-gray-200 hover:border-gray-300"
//                       }`}
//                     >
//                       <div className="flex items-center gap-3">
//                         <div
//                           className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
//                             renewalPaymentMethod === "va"
//                               ? "border-teal-600"
//                               : "border-gray-300"
//                           }`}
//                         >
//                           {renewalPaymentMethod === "va" && (
//                             <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                           )}
//                         </div>
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2">
//                             <CreditCard className="w-5 h-5 text-gray-700" />
//                             <p className="font-medium text-gray-900">
//                               Virtual Account
//                             </p>
//                           </div>
//                           <p className="text-sm text-gray-600 mt-1">
//                             BCA, Mandiri, BNI, BRI, Permata
//                           </p>
//                         </div>
//                       </div>
//                     </button>

//                     {/* E-Wallet */}
//                     <button
//                       onClick={() => setRenewalPaymentMethod("ewallet")}
//                       className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                         renewalPaymentMethod === "ewallet"
//                           ? "border-teal-600 bg-teal-50"
//                           : "border-gray-200 hover:border-gray-300"
//                       }`}
//                     >
//                       <div className="flex items-center gap-3">
//                         <div
//                           className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
//                             renewalPaymentMethod === "ewallet"
//                               ? "border-teal-600"
//                               : "border-gray-300"
//                           }`}
//                         >
//                           {renewalPaymentMethod === "ewallet" && (
//                             <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                           )}
//                         </div>
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2">
//                             <Smartphone className="w-5 h-5 text-gray-700" />
//                             <p className="font-medium text-gray-900">
//                               E-Wallet
//                             </p>
//                           </div>
//                           <p className="text-sm text-gray-600 mt-1">
//                             GoPay, OVO, Dana, ShopeePay, LinkAja
//                           </p>
//                         </div>
//                       </div>
//                     </button>
//                   </div>
//                 </div>

//                 {/* Payment Details */}
//                 {renewalPaymentMethod && (
//                   <motion.div
//                     initial={{ opacity: 0, y: 10 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     className="p-5 bg-gray-50 border border-gray-200 rounded-lg"
//                   >
//                     {renewalPaymentMethod === "qris" && (
//                       <div className="space-y-4">
//                         <div className="text-center">
//                           <div className="w-64 h-64 mx-auto bg-white border-2 border-gray-300 rounded-lg flex items-center justify-center">
//                             <div className="text-center">
//                               <QrCodeIcon className="w-16 h-16 text-gray-400 mx-auto mb-2" />
//                               <p className="text-sm text-gray-500">
//                                 QR Code akan muncul di sini
//                               </p>
//                               <p className="text-xs text-gray-400 mt-2">
//                                 Setelah generate payment
//                               </p>
//                             </div>
//                           </div>
//                           <p className="text-sm text-gray-600 mt-4">
//                             Scan QR code dengan aplikasi pembayaran Anda
//                           </p>
//                         </div>
//                         <div className="pt-4 border-t border-gray-300">
//                           <p className="text-xs text-gray-500 text-center">
//                             QR Code berlaku selama 24 jam
//                           </p>
//                         </div>
//                       </div>
//                     )}

//                     {renewalPaymentMethod === "va" && (
//                       <div className="space-y-4">
//                         <div>
//                           <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Pilih Bank:
//                           </label>
//                           <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
//                             <option>BCA Virtual Account</option>
//                             <option>Mandiri Virtual Account</option>
//                             <option>BNI Virtual Account</option>
//                             <option>BRI Virtual Account</option>
//                             <option>Permata Virtual Account</option>
//                           </select>
//                         </div>
//                         <div className="p-4 bg-white border border-gray-300 rounded-lg">
//                           <div className="flex items-center justify-between mb-2">
//                             <span className="text-sm text-gray-600">
//                               Nomor Virtual Account:
//                             </span>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard("8808123456789012", "va")
//                               }
//                               className="p-1 hover:bg-gray-100 rounded transition-colors"
//                             >
//                               {copiedText === "va" ? (
//                                 <CheckCircle2 className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-600" />
//                               )}
//                             </button>
//                           </div>
//                           <code className="text-lg font-mono font-bold text-gray-900">
//                             8808 1234 5678 9012
//                           </code>
//                         </div>
//                         <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                           <p className="text-xs text-blue-900">
//                             <strong>Cara bayar:</strong> Transfer ke nomor VA di
//                             atas sejumlah{" "}
//                             <strong>
//                               {formatCurrency(
//                                 mockTemplates.find(
//                                   (t) => t.id === activeWebsite.template_id
//                                 )?.price || 0
//                               )}
//                             </strong>
//                           </p>
//                         </div>
//                       </div>
//                     )}

//                     {renewalPaymentMethod === "ewallet" && (
//                       <div className="space-y-4">
//                         <div>
//                           <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Pilih E-Wallet:
//                           </label>
//                           <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500">
//                             <option>GoPay</option>
//                             <option>OVO</option>
//                             <option>Dana</option>
//                             <option>ShopeePay</option>
//                             <option>LinkAja</option>
//                           </select>
//                         </div>
//                         <div className="p-4 bg-white border border-gray-300 rounded-lg">
//                           <div className="flex items-center justify-between mb-2">
//                             <span className="text-sm text-gray-600">
//                               Nomor Tujuan:
//                             </span>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard("081234567890", "ewallet")
//                               }
//                               className="p-1 hover:bg-gray-100 rounded transition-colors"
//                             >
//                               {copiedText === "ewallet" ? (
//                                 <CheckCircle2 className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-600" />
//                               )}
//                             </button>
//                           </div>
//                           <code className="text-lg font-mono font-bold text-gray-900">
//                             0812-3456-7890
//                           </code>
//                           <p className="text-xs text-gray-600 mt-2">
//                             a.n. PT Klandesa Indonesia
//                           </p>
//                         </div>
//                         <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                           <p className="text-xs text-blue-900">
//                             <strong>Cara bayar:</strong> Transfer ke nomor di
//                             atas sejumlah{" "}
//                             <strong>
//                               {formatCurrency(
//                                 mockTemplates.find(
//                                   (t) => t.id === activeWebsite.template_id
//                                 )?.price || 0
//                               )}
//                             </strong>
//                           </p>
//                         </div>
//                       </div>
//                     )}
//                   </motion.div>
//                 )}

//                 {/* Info */}
//                 <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//                   <p className="text-sm text-yellow-900 font-medium mb-2">
//                     ℹ️ Informasi Penting:
//                   </p>
//                   <ul className="text-sm text-yellow-800 space-y-1">
//                     <li>• Pembayaran akan diverifikasi otomatis oleh sistem</li>
//                     <li>
//                       • Website akan diperpanjang otomatis setelah pembayaran
//                       berhasil
//                     </li>
//                     <li>
//                       • Masa aktif baru: 1 tahun dari tanggal perpanjangan
//                     </li>
//                     <li>• Hubungi support jika ada kendala pembayaran</li>
//                   </ul>
//                 </div>
//               </div>

//               {/* Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between sticky bottom-0">
//                 <button
//                   onClick={() => setShowRenewalModal(false)}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   Batal
//                 </button>
//                 <button
//                   onClick={() => {
//                     alert(
//                       "Menunggu pembayaran... Website akan diperpanjang otomatis setelah pembayaran dikonfirmasi."
//                     );
//                     setShowRenewalModal(false);
//                   }}
//                   className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
//                 >
//                   Saya Sudah Bayar
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Change Template Modal */}
//       <AnimatePresence>
//         {showChangeTemplateModal && activeWebsite && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowChangeTemplateModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
//             >
//               {/* Header */}
//               <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
//                 <div className="flex items-center justify-between">
//                   <div>
//                     <h3 className="text-xl font-bold text-gray-900">
//                       Ganti Template Website
//                     </h3>
//                     <p className="text-sm text-gray-600 mt-1">
//                       {changeTemplateStep === 1 &&
//                         "Pilih template baru untuk website Anda"}
//                       {changeTemplateStep === 2 &&
//                         "Atur custom domain (opsional)"}
//                       {changeTemplateStep === 3 && "Konfirmasi dan pembayaran"}
//                     </p>
//                   </div>
//                   <button
//                     onClick={() => setShowChangeTemplateModal(false)}
//                     className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                   >
//                     <X className="w-5 h-5 text-gray-600" />
//                   </button>
//                 </div>

//                 {/* Steps Indicator */}
//                 <div className="flex items-center gap-4 mt-4">
//                   <div className="flex items-center gap-2">
//                     <div
//                       className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
//                         changeTemplateStep >= 1
//                           ? "bg-teal-600 text-white"
//                           : "bg-gray-200 text-gray-600"
//                       }`}
//                     >
//                       1
//                     </div>
//                     <span
//                       className={`text-sm font-medium ${
//                         changeTemplateStep >= 1
//                           ? "text-gray-900"
//                           : "text-gray-500"
//                       }`}
//                     >
//                       Pilih Template
//                     </span>
//                   </div>
//                   <div className="flex-1 h-0.5 bg-gray-200">
//                     <div
//                       className={`h-full transition-all ${
//                         changeTemplateStep >= 2
//                           ? "bg-teal-600 w-full"
//                           : "bg-gray-200 w-0"
//                       }`}
//                     />
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div
//                       className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
//                         changeTemplateStep >= 2
//                           ? "bg-teal-600 text-white"
//                           : "bg-gray-200 text-gray-600"
//                       }`}
//                     >
//                       2
//                     </div>
//                     <span
//                       className={`text-sm font-medium ${
//                         changeTemplateStep >= 2
//                           ? "text-gray-900"
//                           : "text-gray-500"
//                       }`}
//                     >
//                       Custom Domain
//                     </span>
//                   </div>
//                   <div className="flex-1 h-0.5 bg-gray-200">
//                     <div
//                       className={`h-full transition-all ${
//                         changeTemplateStep >= 3
//                           ? "bg-teal-600 w-full"
//                           : "bg-gray-200 w-0"
//                       }`}
//                     />
//                   </div>
//                   <div className="flex items-center gap-2">
//                     <div
//                       className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
//                         changeTemplateStep >= 3
//                           ? "bg-teal-600 text-white"
//                           : "bg-gray-200 text-gray-600"
//                       }`}
//                     >
//                       3
//                     </div>
//                     <span
//                       className={`text-sm font-medium ${
//                         changeTemplateStep >= 3
//                           ? "text-gray-900"
//                           : "text-gray-500"
//                       }`}
//                     >
//                       Pembayaran
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {/* Content */}
//               <div className="px-6 py-6">
//                 {/* Step 1: Select Template */}
//                 {changeTemplateStep === 1 && (
//                   <div className="space-y-6">
//                     {/* Current Template Info */}
//                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
//                       <div className="flex items-center gap-3">
//                         <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
//                           <Layout className="w-6 h-6 text-blue-600" />
//                         </div>
//                         <div>
//                           <p className="text-sm text-blue-900 font-medium">
//                             Template Saat Ini
//                           </p>
//                           <p className="text-lg font-bold text-blue-900">
//                             {activeWebsite.template_name}
//                           </p>
//                         </div>
//                         <div className="ml-auto text-right">
//                           <p className="text-xs text-blue-700">Sisa Aktif</p>
//                           <p className="text-sm font-bold text-blue-900">
//                             {getDaysUntilExpiration(activeWebsite.expires_at)}{" "}
//                             hari
//                           </p>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Templates Grid */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                       {mockTemplates.map((template) => {
//                         const isCurrent =
//                           template.id === activeWebsite.template_id;
//                         const isSelected =
//                           selectedNewTemplate?.id === template.id;

//                         return (
//                           <motion.div
//                             key={template.id}
//                             whileHover={{ scale: isCurrent ? 1 : 1.02 }}
//                             className={`border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
//                               isCurrent
//                                 ? "border-gray-300 opacity-50 cursor-not-allowed"
//                                 : isSelected
//                                 ? "border-teal-600 bg-teal-50"
//                                 : "border-gray-200 hover:border-teal-300"
//                             }`}
//                             onClick={() =>
//                               !isCurrent && setSelectedNewTemplate(template)
//                             }
//                           >
//                             {/* Preview Image */}
//                             <div className="relative h-40 bg-gray-100">
//                               <img
//                                 src={template.preview_images[0]}
//                                 alt={template.name}
//                                 className="w-full h-full object-cover"
//                               />
//                               {template.badge && !isCurrent && (
//                                 <div className="absolute top-2 right-2 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded">
//                                   {template.badge}
//                                 </div>
//                               )}
//                               {isCurrent && (
//                                 <div className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full">
//                                   Aktif Saat Ini
//                                 </div>
//                               )}
//                               {isSelected && (
//                                 <div className="absolute top-2 left-2 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
//                                   <Check className="w-5 h-5 text-white" />
//                                 </div>
//                               )}
//                             </div>

//                             {/* Template Info */}
//                             <div className="p-4">
//                               <h4 className="font-bold text-gray-900 mb-1">
//                                 {template.name}
//                               </h4>
//                               <p className="text-xs text-gray-600 mb-3 line-clamp-2">
//                                 {template.description}
//                               </p>
//                               <div className="flex items-center justify-between">
//                                 <span className="text-lg font-bold text-teal-600">
//                                   {formatCurrency(template.price)}
//                                   <span className="text-xs text-gray-500 font-normal">
//                                     /tahun
//                                   </span>
//                                 </span>
//                               </div>
//                             </div>
//                           </motion.div>
//                         );
//                       })}
//                     </div>

//                     {/* Calculation Summary */}
//                     {selectedNewTemplate && calculateTemplateChange() && (
//                       <motion.div
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         className="p-5 bg-linear-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl"
//                       >
//                         <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
//                           <BarChart3 className="w-5 h-5 text-teal-600" />
//                           Kalkulasi Perubahan Template
//                         </h4>

//                         {(() => {
//                           const calc = calculateTemplateChange()!;
//                           return (
//                             <div className="space-y-3">
//                               {/* Current Template */}
//                               <div className="flex items-center justify-between p-3 bg-white rounded-lg">
//                                 <div>
//                                   <p className="text-sm text-gray-600">
//                                     Template Saat Ini
//                                   </p>
//                                   <p className="font-medium text-gray-900">
//                                     {calc.currentTemplate.name}
//                                   </p>
//                                   <p className="text-xs text-gray-500 mt-1">
//                                     Nilai sisa {calc.daysRemaining} hari
//                                   </p>
//                                 </div>
//                                 <p className="text-lg font-bold text-gray-900">
//                                   {formatCurrency(calc.currentProrateValue)}
//                                 </p>
//                               </div>

//                               {/* New Template */}
//                               <div className="flex items-center justify-between p-3 bg-white rounded-lg">
//                                 <div>
//                                   <p className="text-sm text-gray-600">
//                                     Template Baru
//                                   </p>
//                                   <p className="font-medium text-gray-900">
//                                     {calc.newTemplate.name}
//                                   </p>
//                                   <p className="text-xs text-gray-500 mt-1">
//                                     Biaya untuk {calc.daysRemaining} hari
//                                   </p>
//                                 </div>
//                                 <p className="text-lg font-bold text-gray-900">
//                                   {formatCurrency(calc.newTemplateProrateValue)}
//                                 </p>
//                               </div>

//                               <div className="border-t-2 border-dashed border-teal-300 my-2"></div>

//                               {/* Result */}
//                               {calc.isUpgrade ? (
//                                 <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
//                                   <div className="flex items-center justify-between mb-2">
//                                     <p className="text-sm text-orange-900 font-medium">
//                                       Biaya Tambahan
//                                     </p>
//                                     <p className="text-2xl font-bold text-orange-600">
//                                       {formatCurrency(calc.additionalPayment)}
//                                     </p>
//                                   </div>
//                                   <p className="text-xs text-orange-800">
//                                     💳 Anda perlu membayar selisih biaya untuk
//                                     upgrade ke template yang lebih premium
//                                   </p>
//                                 </div>
//                               ) : (
//                                 <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
//                                   <div className="flex items-center justify-between mb-2">
//                                     <p className="text-sm text-green-900 font-medium">
//                                       Deposit Desa
//                                     </p>
//                                     <p className="text-2xl font-bold text-green-600">
//                                       +{formatCurrency(calc.depositAmount)}
//                                     </p>
//                                   </div>
//                                   <p className="text-xs text-green-800 mb-3">
//                                     💰 Selisih akan masuk ke Deposit Desa dan
//                                     dapat digunakan untuk:
//                                   </p>
//                                   <div className="space-y-2">
//                                     <div className="flex items-center gap-2 text-xs text-green-900">
//                                       <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
//                                       <span>
//                                         Tambahan storage untuk Arsip Digital
//                                       </span>
//                                     </div>
//                                     <div className="flex items-center gap-2 text-xs text-green-900">
//                                       <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
//                                       <span>Perpanjangan layanan Klandesa</span>
//                                     </div>
//                                     <div className="flex items-center gap-2 text-xs text-green-900">
//                                       <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
//                                       <span>
//                                         Perpanjangan masa aktif website
//                                       </span>
//                                     </div>
//                                     <div className="flex items-center gap-2 text-xs text-green-900">
//                                       <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
//                                       <span>Biaya custom domain</span>
//                                     </div>
//                                   </div>
//                                 </div>
//                               )}

//                               {/* Info */}
//                               <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
//                                 <p className="text-xs text-blue-900">
//                                   ℹ️ <strong>Catatan:</strong> Masa aktif
//                                   website tetap{" "}
//                                   {getDaysUntilExpiration(
//                                     activeWebsite.expires_at
//                                   )}{" "}
//                                   hari hingga{" "}
//                                   {new Date(
//                                     activeWebsite.expires_at
//                                   ).toLocaleDateString("id-ID", {
//                                     day: "numeric",
//                                     month: "long",
//                                     year: "numeric",
//                                   })}
//                                 </p>
//                               </div>
//                             </div>
//                           );
//                         })()}
//                       </motion.div>
//                     )}
//                   </div>
//                 )}

//                 {/* Step 2: Custom Domain */}
//                 {changeTemplateStep === 2 && selectedNewTemplate && (
//                   <div className="space-y-6">
//                     {/* Domain Options */}
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                       {/* Subdomain Klandesa */}
//                       <div
//                         className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${
//                           !customDomain
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                         onClick={() => setCustomDomain("")}
//                       >
//                         <div className="flex items-start gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
//                               !customDomain
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {!customDomain && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <div className="flex-1">
//                             <p className="font-semibold text-gray-900 mb-1">
//                               Subdomain Klandesa (Gratis)
//                             </p>
//                             <p className="text-sm text-gray-600 mb-2">
//                               Gunakan subdomain default dari Klandesa
//                             </p>
//                             <div className="p-2 bg-white border border-gray-300 rounded text-sm font-mono text-gray-700">
//                               desa-{activeWebsite.domain.split(".")[0]}
//                               .klandesa.com
//                             </div>
//                             <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
//                               <CheckCircle2 className="w-4 h-4" />
//                               <span>
//                                 Otomatis aktif, tidak perlu konfigurasi
//                               </span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Custom Domain */}
//                       <div
//                         className={`p-5 border-2 rounded-lg cursor-pointer transition-all ${
//                           customDomain
//                             ? "border-teal-600 bg-teal-50"
//                             : "border-gray-200 hover:border-gray-300"
//                         }`}
//                         onClick={() =>
//                           document.getElementById("customDomainInput")?.focus()
//                         }
//                       >
//                         <div className="flex items-start gap-3">
//                           <div
//                             className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
//                               customDomain
//                                 ? "border-teal-600"
//                                 : "border-gray-300"
//                             }`}
//                           >
//                             {customDomain && (
//                               <div className="w-3 h-3 bg-teal-600 rounded-full" />
//                             )}
//                           </div>
//                           <div className="flex-1">
//                             <p className="font-semibold text-gray-900 mb-1">
//                               Custom Domain
//                             </p>
//                             <p className="text-sm text-gray-600 mb-2">
//                               Gunakan domain sendiri (contoh: desasejahtera.id)
//                             </p>
//                             <input
//                               id="customDomainInput"
//                               type="text"
//                               placeholder="contoh: desasejahtera.id"
//                               value={customDomain}
//                               onChange={(e) => setCustomDomain(e.target.value)}
//                               className="w-full p-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
//                             />
//                             <div className="mt-3 flex items-center gap-2 text-xs text-blue-700">
//                               <Zap className="w-4 h-4" />
//                               <span>Setup otomatis via DNS management</span>
//                             </div>
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* Custom Domain Setup Guide */}
//                     {customDomain && (
//                       <motion.div
//                         initial={{ opacity: 0, y: 10 }}
//                         animate={{ opacity: 1, y: 0 }}
//                         className="p-5 bg-blue-50 border border-blue-200 rounded-lg"
//                       >
//                         <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
//                           <Settings className="w-5 h-5" />
//                           Panduan Setup Custom Domain (Otomatis)
//                         </h4>
//                         <div className="space-y-3">
//                           <div className="flex gap-3">
//                             <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
//                               1
//                             </div>
//                             <div className="flex-1">
//                               <p className="text-sm font-medium text-blue-900 mb-1">
//                                 Verifikasi Kepemilikan Domain
//                               </p>
//                               <p className="text-xs text-blue-800">
//                                 Sistem akan mengirim kode verifikasi ke email
//                                 pemilik domain yang terdaftar di WHOIS
//                               </p>
//                             </div>
//                           </div>
//                           <div className="flex gap-3">
//                             <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
//                               2
//                             </div>
//                             <div className="flex-1">
//                               <p className="text-sm font-medium text-blue-900 mb-1">
//                                 Konfigurasi DNS Otomatis
//                               </p>
//                               <p className="text-xs text-blue-800">
//                                 Jika domain Anda di registrar yang support API
//                                 (Cloudflare, Niagahoster, dll), setup akan
//                                 otomatis
//                               </p>
//                               <div className="mt-2 p-2 bg-white border border-blue-200 rounded text-xs font-mono">
//                                 <div className="text-gray-600">
//                                   Type:{" "}
//                                   <span className="text-gray-900 font-semibold">
//                                     CNAME
//                                   </span>
//                                 </div>
//                                 <div className="text-gray-600">
//                                   Name:{" "}
//                                   <span className="text-gray-900 font-semibold">
//                                     @
//                                   </span>
//                                 </div>
//                                 <div className="text-gray-600">
//                                   Value:{" "}
//                                   <span className="text-gray-900 font-semibold">
//                                     proxy.klandesa.com
//                                   </span>
//                                 </div>
//                               </div>
//                             </div>
//                           </div>
//                           <div className="flex gap-3">
//                             <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
//                               3
//                             </div>
//                             <div className="flex-1">
//                               <p className="text-sm font-medium text-blue-900 mb-1">
//                                 SSL Certificate Otomatis
//                               </p>
//                               <p className="text-xs text-blue-800">
//                                 Sertifikat SSL akan di-generate otomatis
//                                 menggunakan Let's Encrypt (gratis selamanya)
//                               </p>
//                             </div>
//                           </div>
//                           <div className="flex gap-3">
//                             <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center shrink-0">
//                               <Check className="w-4 h-4" />
//                             </div>
//                             <div className="flex-1">
//                               <p className="text-sm font-medium text-green-900 mb-1">
//                                 Selesai!
//                               </p>
//                               <p className="text-xs text-green-800">
//                                 Website Anda akan otomatis aktif dalam 5-10
//                                 menit setelah DNS propagation
//                               </p>
//                             </div>
//                           </div>
//                         </div>

//                         <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded">
//                           <p className="text-xs text-yellow-900">
//                             <strong>💡 Tips:</strong> Jika registrar domain Anda
//                             tidak support API otomatis, kami akan memberikan
//                             panduan manual via email beserta akses ke DNS
//                             management panel untuk setup sendiri.
//                           </p>
//                         </div>
//                       </motion.div>
//                     )}

//                     {/* Domain Benefits */}
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                       <div className="p-4 bg-linear-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
//                         <Crown className="w-8 h-8 text-purple-600 mb-2" />
//                         <p className="font-semibold text-gray-900 mb-1">
//                           Lebih Profesional
//                         </p>
//                         <p className="text-xs text-gray-600">
//                           Domain sendiri meningkatkan kredibilitas desa di mata
//                           warga
//                         </p>
//                       </div>
//                       <div className="p-4 bg-linear-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
//                         <TrendingUp className="w-8 h-8 text-blue-600 mb-2" />
//                         <p className="font-semibold text-gray-900 mb-1">
//                           SEO Lebih Baik
//                         </p>
//                         <p className="text-xs text-gray-600">
//                           Domain .id atau .desa lebih mudah ditemukan di Google
//                         </p>
//                       </div>
//                       <div className="p-4 bg-linear-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
//                         <Sparkles className="w-8 h-8 text-green-600 mb-2" />
//                         <p className="font-semibold text-gray-900 mb-1">
//                           Branding Kuat
//                         </p>
//                         <p className="text-xs text-gray-600">
//                           Mudah diingat dan memperkuat identitas desa
//                         </p>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* Step 3: Payment */}
//                 {changeTemplateStep === 3 &&
//                   selectedNewTemplate &&
//                   calculateTemplateChange() && (
//                     <div className="space-y-6">
//                       {(() => {
//                         const calc = calculateTemplateChange()!;

//                         return (
//                           <>
//                             {/* Summary */}
//                             <div className="p-5 bg-linear-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg">
//                               <h4 className="font-bold text-gray-900 mb-4">
//                                 Ringkasan Perubahan
//                               </h4>
//                               <div className="space-y-3">
//                                 <div className="flex items-center justify-between">
//                                   <span className="text-sm text-gray-600">
//                                     Template Baru
//                                   </span>
//                                   <span className="font-medium text-gray-900">
//                                     {calc.newTemplate.name}
//                                   </span>
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                   <span className="text-sm text-gray-600">
//                                     Domain
//                                   </span>
//                                   <span className="font-medium text-gray-900">
//                                     {customDomain ||
//                                       `desa-${
//                                         activeWebsite.domain.split(".")[0]
//                                       }.klandesa.com`}
//                                   </span>
//                                 </div>
//                                 <div className="flex items-center justify-between">
//                                   <span className="text-sm text-gray-600">
//                                     Masa Aktif Tersisa
//                                   </span>
//                                   <span className="font-medium text-gray-900">
//                                     {calc.daysRemaining} hari
//                                   </span>
//                                 </div>
//                                 <div className="border-t border-gray-300 my-2"></div>
//                                 {calc.isUpgrade ? (
//                                   <div className="flex items-center justify-between">
//                                     <span className="text-sm font-semibold text-gray-900">
//                                       Total Pembayaran
//                                     </span>
//                                     <span className="text-2xl font-bold text-orange-600">
//                                       {formatCurrency(calc.additionalPayment)}
//                                     </span>
//                                   </div>
//                                 ) : (
//                                   <div className="flex items-center justify-between">
//                                     <span className="text-sm font-semibold text-gray-900">
//                                       Deposit Desa
//                                     </span>
//                                     <span className="text-2xl font-bold text-green-600">
//                                       +{formatCurrency(calc.depositAmount)}
//                                     </span>
//                                   </div>
//                                 )}
//                               </div>
//                             </div>

//                             {/* Payment Method (only if upgrade) */}
//                             {calc.isUpgrade && (
//                               <div>
//                                 <h4 className="font-semibold text-gray-900 mb-3">
//                                   Metode Pembayaran
//                                 </h4>
//                                 <div className="space-y-3">
//                                   <button
//                                     onClick={() => setPaymentMethod("bank")}
//                                     className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                                       paymentMethod === "bank"
//                                         ? "border-teal-600 bg-teal-50"
//                                         : "border-gray-200"
//                                     }`}
//                                   >
//                                     <div className="flex items-center gap-3">
//                                       <CreditCard className="w-5 h-5 text-gray-700" />
//                                       <div>
//                                         <p className="font-medium text-gray-900">
//                                           Transfer Bank / Virtual Account
//                                         </p>
//                                         <p className="text-sm text-gray-600">
//                                           BCA, Mandiri, BNI, BRI
//                                         </p>
//                                       </div>
//                                     </div>
//                                   </button>
//                                   <button
//                                     onClick={() => setPaymentMethod("ewallet")}
//                                     className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
//                                       paymentMethod === "ewallet"
//                                         ? "border-teal-600 bg-teal-50"
//                                         : "border-gray-200"
//                                     }`}
//                                   >
//                                     <div className="flex items-center gap-3">
//                                       <Smartphone className="w-5 h-5 text-gray-700" />
//                                       <div>
//                                         <p className="font-medium text-gray-900">
//                                           E-Wallet / QRIS
//                                         </p>
//                                         <p className="text-sm text-gray-600">
//                                           GoPay, OVO, Dana, ShopeePay
//                                         </p>
//                                       </div>
//                                     </div>
//                                   </button>
//                                 </div>
//                               </div>
//                             )}

//                             {/* Success Info for Downgrade */}
//                             {!calc.isUpgrade && (
//                               <div className="p-5 bg-green-50 border border-green-200 rounded-lg">
//                                 <div className="flex items-start gap-3">
//                                   <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
//                                   <div>
//                                     <p className="font-semibold text-green-900 mb-2">
//                                       Perubahan Tanpa Biaya Tambahan!
//                                     </p>
//                                     <p className="text-sm text-green-800 mb-3">
//                                       Karena template baru lebih murah, Anda
//                                       tidak perlu membayar apapun. Selisih biaya
//                                       sebesar{" "}
//                                       <strong>
//                                         {formatCurrency(calc.depositAmount)}
//                                       </strong>{" "}
//                                       akan masuk ke Deposit Desa.
//                                     </p>
//                                     <div className="p-3 bg-white border border-green-200 rounded">
//                                       <p className="text-xs text-gray-700 font-medium mb-2">
//                                         Deposit dapat digunakan untuk:
//                                       </p>
//                                       <ul className="text-xs text-gray-600 space-y-1">
//                                         <li>• Upgrade storage Arsip Digital</li>
//                                         <li>• Perpanjangan layanan Klandesa</li>
//                                         <li>
//                                           • Perpanjangan website di masa depan
//                                         </li>
//                                         <li>• Biaya custom domain</li>
//                                       </ul>
//                                     </div>
//                                   </div>
//                                 </div>
//                               </div>
//                             )}

//                             {/* Terms */}
//                             <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//                               <p className="text-sm text-yellow-900 font-medium mb-2">
//                                 ⚠️ Ketentuan Ganti Template:
//                               </p>
//                               <ul className="text-sm text-yellow-800 space-y-1">
//                                 <li>
//                                   • Template akan berubah otomatis setelah
//                                   pembayaran dikonfirmasi
//                                 </li>
//                                 <li>
//                                   • Konten website (berita, galeri, dll) akan
//                                   tetap tersimpan
//                                 </li>
//                                 <li>
//                                   • Konfigurasi custom domain membutuhkan waktu
//                                   5-10 menit
//                                 </li>
//                                 <li>• Masa aktif website tidak berubah</li>
//                                 <li>• Hubungi support jika ada kendala</li>
//                               </ul>
//                             </div>
//                           </>
//                         );
//                       })()}
//                     </div>
//                   )}
//               </div>

//               {/* Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between sticky bottom-0">
//                 <button
//                   onClick={() => {
//                     if (changeTemplateStep === 1) {
//                       setShowChangeTemplateModal(false);
//                     } else {
//                       setChangeTemplateStep(changeTemplateStep - 1);
//                     }
//                   }}
//                   className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
//                 >
//                   {changeTemplateStep === 1 ? "Batal" : "Kembali"}
//                 </button>

//                 <button
//                   onClick={() => {
//                     if (changeTemplateStep === 1 && selectedNewTemplate) {
//                       setChangeTemplateStep(2);
//                     } else if (changeTemplateStep === 2) {
//                       setChangeTemplateStep(3);
//                     } else if (changeTemplateStep === 3) {
//                       const calc = calculateTemplateChange();
//                       if (calc?.isUpgrade) {
//                         alert(
//                           "Proses pembayaran... Template akan berubah otomatis setelah pembayaran dikonfirmasi."
//                         );
//                       } else {
//                         alert(
//                           "Template berhasil diganti! Selisih biaya telah masuk ke Deposit Desa."
//                         );
//                       }
//                       setShowChangeTemplateModal(false);
//                       setChangeTemplateStep(1);
//                       setSelectedNewTemplate(null);
//                       setCustomDomain("");
//                     }
//                   }}
//                   disabled={changeTemplateStep === 1 && !selectedNewTemplate}
//                   className={`px-6 py-2 rounded-lg transition-colors font-medium ${
//                     changeTemplateStep === 1 && !selectedNewTemplate
//                       ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                       : "bg-teal-600 text-white hover:bg-teal-700"
//                   }`}
//                 >
//                   {changeTemplateStep === 3
//                     ? calculateTemplateChange()?.isUpgrade
//                       ? "Bayar Sekarang"
//                       : "Konfirmasi Ganti Template"
//                     : "Lanjutkan"}
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* DNS Setup Modal */}
//       <AnimatePresence>
//         {showDnsModal && activeWebsite?.custom_domain && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowDnsModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
//             >
//               {/* Header */}
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">
//                     Setup DNS Custom Domain
//                   </h3>
//                   <p className="text-sm text-gray-600 mt-1">
//                     Konfigurasi DNS untuk domain:{" "}
//                     <span className="font-mono font-semibold text-teal-600">
//                       {activeWebsite.custom_domain}
//                     </span>
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowDnsModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5 text-gray-500" />
//                 </button>
//               </div>

//               {/* Content - Scrollable */}
//               <div className="px-6 py-6 overflow-y-auto flex-1">
//                 {/* Info Banner */}
//                 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
//                   <div className="flex items-start gap-3">
//                     <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
//                     <div>
//                       <p className="text-sm text-blue-900 font-semibold mb-1">
//                         Panduan Setup DNS
//                       </p>
//                       <p className="text-sm text-blue-800">
//                         Untuk mengarahkan domain Anda ke website desa, tambahkan
//                         DNS records berikut di panel domain registrar Anda
//                         (Niagahoster, Rumahweb, Cloudflare, GoDaddy, dll).
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* DNS Records Table */}
//                 <div className="space-y-6">
//                   {/* A Record */}
//                   <div className="border border-gray-200 rounded-lg overflow-hidden">
//                     <div className="bg-linear-to-r from-teal-50 to-teal-100 px-4 py-3 border-b border-teal-200">
//                       <div className="flex items-center gap-2">
//                         <Server className="w-5 h-5 text-teal-600" />
//                         <h4 className="font-semibold text-teal-900">
//                           A Record (IPv4)
//                         </h4>
//                       </div>
//                       <p className="text-sm text-teal-700 mt-1">
//                         Mengarahkan domain utama ke server
//                       </p>
//                     </div>
//                     <div className="p-4 bg-white">
//                       <div className="grid grid-cols-3 gap-4 text-sm">
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Type
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               A
//                             </code>
//                             <button
//                               onClick={() => copyToClipboard("A", "A-type")}
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "A-type" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Name / Host
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               @
//                             </code>
//                             <button
//                               onClick={() => copyToClipboard("@", "A-name")}
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "A-name" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Value / Points to
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               103.123.45.67
//                             </code>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard("103.123.45.67", "A-value")
//                               }
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "A-value" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                       <div className="mt-3 text-xs text-gray-600">
//                         💡 <strong>TTL:</strong> 3600 (1 jam) - biarkan default
//                       </div>
//                     </div>
//                   </div>

//                   {/* CNAME Record for www */}
//                   <div className="border border-gray-200 rounded-lg overflow-hidden">
//                     <div className="bg-linear-to-r from-purple-50 to-purple-100 px-4 py-3 border-b border-purple-200">
//                       <div className="flex items-center gap-2">
//                         <Link2 className="w-5 h-5 text-purple-600" />
//                         <h4 className="font-semibold text-purple-900">
//                           CNAME Record (www)
//                         </h4>
//                       </div>
//                       <p className="text-sm text-purple-700 mt-1">
//                         Redirect www ke domain utama
//                       </p>
//                     </div>
//                     <div className="p-4 bg-white">
//                       <div className="grid grid-cols-3 gap-4 text-sm">
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Type
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               CNAME
//                             </code>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard("CNAME", "CNAME-type")
//                               }
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "CNAME-type" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Name / Host
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               www
//                             </code>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard("www", "CNAME-name")
//                               }
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "CNAME-name" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Value / Points to
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               {activeWebsite.custom_domain}
//                             </code>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard(
//                                   activeWebsite.custom_domain!,
//                                   "CNAME-value"
//                                 )
//                               }
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "CNAME-value" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                       <div className="mt-3 text-xs text-gray-600">
//                         💡 <strong>TTL:</strong> 3600 (1 jam) - biarkan default
//                       </div>
//                     </div>
//                   </div>

//                   {/* TXT Record for Verification */}
//                   <div className="border border-gray-200 rounded-lg overflow-hidden">
//                     <div className="bg-linear-to-r from-green-50 to-green-100 px-4 py-3 border-b border-green-200">
//                       <div className="flex items-center gap-2">
//                         <Shield className="w-5 h-5 text-green-600" />
//                         <h4 className="font-semibold text-green-900">
//                           TXT Record (Verification)
//                         </h4>
//                       </div>
//                       <p className="text-sm text-green-700 mt-1">
//                         Verifikasi kepemilikan domain
//                       </p>
//                     </div>
//                     <div className="p-4 bg-white">
//                       <div className="grid grid-cols-3 gap-4 text-sm">
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Type
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               TXT
//                             </code>
//                             <button
//                               onClick={() => copyToClipboard("TXT", "TXT-type")}
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "TXT-type" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Name / Host
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1">
//                               @
//                             </code>
//                             <button
//                               onClick={() => copyToClipboard("@", "TXT-name")}
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "TXT-name" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                         <div>
//                           <label className="block text-xs font-medium text-gray-500 mb-1">
//                             Value / Content
//                           </label>
//                           <div className="flex items-center gap-2">
//                             <code className="px-3 py-2 bg-gray-100 border border-gray-300 rounded font-mono text-gray-900 flex-1 text-xs overflow-hidden text-ellipsis">
//                               klandesa-verify=a8b9c0d1e2f3
//                             </code>
//                             <button
//                               onClick={() =>
//                                 copyToClipboard(
//                                   "klandesa-verify=a8b9c0d1e2f3",
//                                   "TXT-value"
//                                 )
//                               }
//                               className="p-2 hover:bg-gray-100 rounded transition-colors"
//                               title="Copy"
//                             >
//                               {copiedText === "TXT-value" ? (
//                                 <Check className="w-4 h-4 text-green-600" />
//                               ) : (
//                                 <Copy className="w-4 h-4 text-gray-500" />
//                               )}
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                       <div className="mt-3 text-xs text-gray-600">
//                         💡 <strong>TTL:</strong> 3600 (1 jam) - biarkan default
//                       </div>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Step-by-step Guide */}
//                 <div className="mt-6 p-5 bg-linear-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-lg">
//                   <h4 className="font-semibold text-teal-900 mb-3 flex items-center gap-2">
//                     <CheckCircle2 className="w-5 h-5" />
//                     Langkah-langkah Setup
//                   </h4>
//                   <ol className="space-y-3 text-sm text-teal-800">
//                     <li className="flex gap-3">
//                       <span className="shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                         1
//                       </span>
//                       <div>
//                         <p className="font-medium">
//                           Login ke panel domain registrar Anda
//                         </p>
//                         <p className="text-teal-700 text-xs mt-0.5">
//                           (Niagahoster, Rumahweb, Cloudflare, GoDaddy,
//                           Namecheap, dll)
//                         </p>
//                       </div>
//                     </li>
//                     <li className="flex gap-3">
//                       <span className="shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                         2
//                       </span>
//                       <div>
//                         <p className="font-medium">
//                           Cari menu "DNS Management" atau "DNS Settings"
//                         </p>
//                         <p className="text-teal-700 text-xs mt-0.5">
//                           Biasanya ada di menu domain atau nameserver settings
//                         </p>
//                       </div>
//                     </li>
//                     <li className="flex gap-3">
//                       <span className="shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                         3
//                       </span>
//                       <div>
//                         <p className="font-medium">
//                           Tambahkan 3 DNS records di atas (A, CNAME, TXT)
//                         </p>
//                         <p className="text-teal-700 text-xs mt-0.5">
//                           Gunakan tombol copy untuk mempermudah input
//                         </p>
//                       </div>
//                     </li>
//                     <li className="flex gap-3">
//                       <span className="shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                         4
//                       </span>
//                       <div>
//                         <p className="font-medium">
//                           Tunggu propagasi DNS (5-48 jam, biasanya 1-2 jam)
//                         </p>
//                         <p className="text-teal-700 text-xs mt-0.5">
//                           Website akan otomatis aktif setelah DNS terpropagasi
//                         </p>
//                       </div>
//                     </li>
//                     <li className="flex gap-3">
//                       <span className="shrink-0 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
//                         5
//                       </span>
//                       <div>
//                         <p className="font-medium">
//                           SSL certificate akan otomatis aktif (HTTPS)
//                         </p>
//                         <p className="text-teal-700 text-xs mt-0.5">
//                           Gratis dari Let's Encrypt, tidak perlu konfigurasi
//                           manual
//                         </p>
//                       </div>
//                     </li>
//                   </ol>
//                 </div>

//                 {/* Common Registrars Guide */}
//                 <div className="mt-6 p-5 bg-yellow-50 border border-yellow-200 rounded-lg">
//                   <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
//                     <FileText className="w-5 h-5" />
//                     Panduan per Registrar Populer
//                   </h4>
//                   <div className="space-y-2 text-sm text-yellow-800">
//                     <div>
//                       <p className="font-medium">📍 Niagahoster / Rumahweb</p>
//                       <p className="text-yellow-700 text-xs">
//                         Domain → Kelola DNS → Advanced DNS Zone Editor
//                       </p>
//                     </div>
//                     <div>
//                       <p className="font-medium">📍 Cloudflare</p>
//                       <p className="text-yellow-700 text-xs">
//                         Websites → Your Domain → DNS → Records → Add record
//                       </p>
//                     </div>
//                     <div>
//                       <p className="font-medium">📍 GoDaddy</p>
//                       <p className="text-yellow-700 text-xs">
//                         My Products → Domains → DNS → Manage DNS
//                       </p>
//                     </div>
//                     <div>
//                       <p className="font-medium">📍 Namecheap</p>
//                       <p className="text-yellow-700 text-xs">
//                         Domain List → Manage → Advanced DNS
//                       </p>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Help Section */}
//                 <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
//                   <p className="text-sm text-gray-700">
//                     <strong>Butuh bantuan?</strong> Tim support Klandesa siap
//                     membantu Anda 24/7.
//                   </p>
//                   <div className="flex gap-3 mt-3">
//                     <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
//                       <ExternalLink className="w-4 h-4" />
//                       Tutorial Video
//                     </button>
//                     <button className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center gap-2">
//                       <AlertCircle className="w-4 h-4" />
//                       Hubungi Support
//                     </button>
//                   </div>
//                 </div>
//               </div>

//               {/* Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
//                 <div className="flex items-center gap-2 text-sm text-gray-600">
//                   <Clock className="w-4 h-4" />
//                   <span>Propagasi DNS: 5-48 jam (biasanya 1-2 jam)</span>
//                 </div>
//                 <button
//                   onClick={() => setShowDnsModal(false)}
//                   className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
//                 >
//                   Mengerti
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Statistics Modal */}
//       <AnimatePresence>
//         {showStatsModal && activeWebsite && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//             onClick={() => setShowStatsModal(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.95, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.95, opacity: 0 }}
//               onClick={(e) => e.stopPropagation()}
//               className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col"
//             >
//               {/* Header */}
//               <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
//                 <div>
//                   <h3 className="text-xl font-bold text-gray-900">
//                     Statistik Website
//                   </h3>
//                   <p className="text-sm text-gray-600 mt-1">
//                     {activeWebsite.domain}
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowStatsModal(false)}
//                   className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                 >
//                   <X className="w-5 h-5 text-gray-500" />
//                 </button>
//               </div>

//               {/* Content - Scrollable */}
//               <div className="px-6 py-6 overflow-y-auto flex-1">
//                 {/* Date Range Selector */}
//                 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
//                   <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
//                     {(["24h", "7d", "30d", "90d"] as const).map((range) => (
//                       <button
//                         key={range}
//                         onClick={() => setStatsDateRange(range)}
//                         className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
//                           statsDateRange === range
//                             ? "bg-white text-teal-600 shadow-sm"
//                             : "text-gray-600 hover:text-gray-900"
//                         }`}
//                       >
//                         {range === "24h"
//                           ? "24 Jam"
//                           : range === "7d"
//                           ? "7 Hari"
//                           : range === "30d"
//                           ? "30 Hari"
//                           : "90 Hari"}
//                       </button>
//                     ))}
//                   </div>
//                   <div className="flex gap-2 w-full sm:w-auto">
//                     <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
//                       <Download className="w-4 h-4" />
//                       <span className="hidden sm:inline">Export PDF</span>
//                       <span className="sm:hidden">PDF</span>
//                     </button>
//                     <button className="flex-1 sm:flex-none px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
//                       <Download className="w-4 h-4" />
//                       <span className="hidden sm:inline">Export Excel</span>
//                       <span className="sm:hidden">Excel</span>
//                     </button>
//                   </div>
//                 </div>

//                 {/* Summary Cards */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
//                   <div className="bg-linear-to-br from-teal-50 to-teal-100 border border-teal-200 rounded-xl p-5">
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="p-2 bg-teal-600 rounded-lg">
//                         <Users className="w-5 h-5 text-white" />
//                       </div>
//                       <div className="flex items-center gap-1 text-sm font-medium text-green-600">
//                         <ArrowUpRight className="w-4 h-4" />
//                         +12.5%
//                       </div>
//                     </div>
//                     <p className="text-sm text-teal-700 mb-1">
//                       Total Pengunjung
//                     </p>
//                     <p className="text-2xl font-bold text-teal-900">
//                       {statsDateRange === "24h"
//                         ? "540"
//                         : statsDateRange === "7d"
//                         ? "2,405"
//                         : statsDateRange === "30d"
//                         ? "12,458"
//                         : "31,158"}
//                     </p>
//                   </div>

//                   <div className="bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5">
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="p-2 bg-blue-600 rounded-lg">
//                         <Eye className="w-5 h-5 text-white" />
//                       </div>
//                       <div className="flex items-center gap-1 text-sm font-medium text-green-600">
//                         <ArrowUpRight className="w-4 h-4" />
//                         +8.3%
//                       </div>
//                     </div>
//                     <p className="text-sm text-blue-700 mb-1">
//                       Total Pageviews
//                     </p>
//                     <p className="text-2xl font-bold text-blue-900">
//                       {statsDateRange === "24h"
//                         ? "1,245"
//                         : statsDateRange === "7d"
//                         ? "6,450"
//                         : statsDateRange === "30d"
//                         ? "28,340"
//                         : "72,890"}
//                     </p>
//                   </div>

//                   <div className="bg-linear-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5">
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="p-2 bg-purple-600 rounded-lg">
//                         <Timer className="w-5 h-5 text-white" />
//                       </div>
//                       <div className="flex items-center gap-1 text-sm font-medium text-red-600">
//                         <ArrowDownRight className="w-4 h-4" />
//                         -2.1%
//                       </div>
//                     </div>
//                     <p className="text-sm text-purple-700 mb-1">
//                       Avg. Duration
//                     </p>
//                     <p className="text-2xl font-bold text-purple-900">3m 42s</p>
//                   </div>

//                   <div className="bg-linear-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-5">
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="p-2 bg-orange-600 rounded-lg">
//                         <MousePointer className="w-5 h-5 text-white" />
//                       </div>
//                       <div className="flex items-center gap-1 text-sm font-medium text-green-600">
//                         <ArrowUpRight className="w-4 h-4" />
//                         +5.7%
//                       </div>
//                     </div>
//                     <p className="text-sm text-orange-700 mb-1">Bounce Rate</p>
//                     <p className="text-2xl font-bold text-orange-900">42.3%</p>
//                   </div>
//                 </div>

//                 {/* Visitor Chart */}
//                 <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
//                   <div className="flex items-center justify-between mb-6">
//                     <div>
//                       <h4 className="font-semibold text-gray-900">
//                         Tren Pengunjung
//                       </h4>
//                       <p className="text-sm text-gray-600 mt-1">
//                         Grafik pengunjung website
//                       </p>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <div className="flex items-center gap-2">
//                         <div className="w-3 h-3 bg-teal-600 rounded-full"></div>
//                         <span className="text-sm text-gray-600">
//                           Pengunjung
//                         </span>
//                       </div>
//                       {statsDateRange === "7d" && (
//                         <div className="flex items-center gap-2 ml-4">
//                           <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
//                           <span className="text-sm text-gray-600">
//                             Pageviews
//                           </span>
//                         </div>
//                       )}
//                     </div>
//                   </div>
//                   <ResponsiveContainer width="100%" height={300}>
//                     <AreaChart data={mockVisitorData[statsDateRange]}>
//                       <defs>
//                         <linearGradient
//                           id="colorVisitors"
//                           x1="0"
//                           y1="0"
//                           x2="0"
//                           y2="1"
//                         >
//                           <stop
//                             offset="5%"
//                             stopColor="#0f766e"
//                             stopOpacity={0.3}
//                           />
//                           <stop
//                             offset="95%"
//                             stopColor="#0f766e"
//                             stopOpacity={0}
//                           />
//                         </linearGradient>
//                         <linearGradient
//                           id="colorPageviews"
//                           x1="0"
//                           y1="0"
//                           x2="0"
//                           y2="1"
//                         >
//                           <stop
//                             offset="5%"
//                             stopColor="#3b82f6"
//                             stopOpacity={0.3}
//                           />
//                           <stop
//                             offset="95%"
//                             stopColor="#3b82f6"
//                             stopOpacity={0}
//                           />
//                         </linearGradient>
//                       </defs>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
//                       <XAxis
//                         dataKey={
//                           statsDateRange === "24h"
//                             ? "time"
//                             : statsDateRange === "7d"
//                             ? "day"
//                             : statsDateRange === "30d"
//                             ? "date"
//                             : "month"
//                         }
//                         stroke="#6b7280"
//                         style={{ fontSize: "12px" }}
//                       />
//                       <YAxis stroke="#6b7280" style={{ fontSize: "12px" }} />
//                       <Tooltip
//                         contentStyle={{
//                           backgroundColor: "white",
//                           border: "1px solid #e5e7eb",
//                           borderRadius: "8px",
//                           boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
//                         }}
//                       />
//                       <Area
//                         type="monotone"
//                         dataKey="visitors"
//                         stroke="#0f766e"
//                         strokeWidth={2}
//                         fillOpacity={1}
//                         fill="url(#colorVisitors)"
//                       />
//                       {statsDateRange === "7d" && (
//                         <Area
//                           type="monotone"
//                           dataKey="pageviews"
//                           stroke="#3b82f6"
//                           strokeWidth={2}
//                           fillOpacity={1}
//                           fill="url(#colorPageviews)"
//                         />
//                       )}
//                     </AreaChart>
//                   </ResponsiveContainer>
//                 </div>

//                 {/* Two Column Layout */}
//                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//                   {/* Device Breakdown */}
//                   <div className="bg-white border border-gray-200 rounded-xl p-6">
//                     <h4 className="font-semibold text-gray-900 mb-1">
//                       Device Breakdown
//                     </h4>
//                     <p className="text-sm text-gray-600 mb-6">
//                       Perangkat yang digunakan pengunjung
//                     </p>
//                     <div className="flex items-center justify-center mb-6">
//                       <ResponsiveContainer width="100%" height={200}>
//                         <PieChart>
//                           <Pie
//                             data={mockDeviceData}
//                             cx="50%"
//                             cy="50%"
//                             innerRadius={60}
//                             outerRadius={90}
//                             paddingAngle={5}
//                             dataKey="value"
//                           >
//                             {mockDeviceData.map((entry, index) => (
//                               <Cell
//                                 key={`cell-${index}`}
//                                 fill={CHART_COLORS[index]}
//                               />
//                             ))}
//                           </Pie>
//                           <Tooltip />
//                         </PieChart>
//                       </ResponsiveContainer>
//                     </div>
//                     <div className="space-y-3">
//                       {mockDeviceData.map((device, index) => (
//                         <div
//                           key={device.name}
//                           className="flex items-center justify-between"
//                         >
//                           <div className="flex items-center gap-3">
//                             <div
//                               className="w-3 h-3 rounded-full"
//                               style={{ backgroundColor: CHART_COLORS[index] }}
//                             ></div>
//                             <span className="text-sm font-medium text-gray-700">
//                               {device.name}
//                             </span>
//                           </div>
//                           <div className="flex items-center gap-3">
//                             <span className="text-sm text-gray-600">
//                               {device.value.toLocaleString()}
//                             </span>
//                             <span className="text-sm font-semibold text-gray-900">
//                               {device.percentage}%
//                             </span>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Traffic Sources */}
//                   <div className="bg-white border border-gray-200 rounded-xl p-6">
//                     <h4 className="font-semibold text-gray-900 mb-1">
//                       Traffic Sources
//                     </h4>
//                     <p className="text-sm text-gray-600 mb-6">
//                       Sumber pengunjung website
//                     </p>
//                     <div className="space-y-4">
//                       {mockTrafficSources.map((source, index) => (
//                         <div key={source.source}>
//                           <div className="flex items-center justify-between mb-2">
//                             <span className="text-sm font-medium text-gray-700">
//                               {source.source}
//                             </span>
//                             <div className="flex items-center gap-3">
//                               <span className="text-sm text-gray-600">
//                                 {source.visitors.toLocaleString()}
//                               </span>
//                               <span className="text-sm font-semibold text-gray-900 w-12 text-right">
//                                 {source.percentage}%
//                               </span>
//                             </div>
//                           </div>
//                           <div className="w-full bg-gray-200 rounded-full h-2">
//                             <div
//                               className="h-2 rounded-full transition-all duration-500"
//                               style={{
//                                 width: `${source.percentage}%`,
//                                 backgroundColor: CHART_COLORS[index],
//                               }}
//                             ></div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>
//                 </div>

//                 {/* Top Pages Table */}
//                 <div className="bg-white border border-gray-200 rounded-xl p-6">
//                   <div className="flex items-center justify-between mb-6">
//                     <div>
//                       <h4 className="font-semibold text-gray-900">Top Pages</h4>
//                       <p className="text-sm text-gray-600 mt-1">
//                         Halaman paling banyak dikunjungi
//                       </p>
//                     </div>
//                   </div>
//                   <div className="overflow-x-auto -mx-2 px-2">
//                     <table className="w-full min-w-[600px]">
//                       <thead>
//                         <tr className="border-b border-gray-200">
//                           <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
//                             Halaman
//                           </th>
//                           <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
//                             Pengunjung
//                           </th>
//                           <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
//                             Persentase
//                           </th>
//                           <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
//                             Trend
//                           </th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {mockTopPages.map((page, index) => (
//                           <tr
//                             key={page.page}
//                             className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
//                           >
//                             <td className="py-3 px-4">
//                               <div className="flex items-center gap-2">
//                                 <span className="text-sm font-medium text-gray-500">
//                                   #{index + 1}
//                                 </span>
//                                 <span className="text-sm font-medium text-gray-900">
//                                   {page.page}
//                                 </span>
//                               </div>
//                             </td>
//                             <td className="py-3 px-4 text-right text-sm text-gray-900">
//                               {page.visitors.toLocaleString()}
//                             </td>
//                             <td className="py-3 px-4 text-right">
//                               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
//                                 {page.percentage}%
//                               </span>
//                             </td>
//                             <td className="py-3 px-4 text-center">
//                               {page.trend === "up" ? (
//                                 <div className="inline-flex items-center gap-1 text-green-600">
//                                   <TrendingUp className="w-4 h-4" />
//                                 </div>
//                               ) : (
//                                 <div className="inline-flex items-center gap-1 text-red-600">
//                                   <TrendingDown className="w-4 h-4" />
//                                 </div>
//                               )}
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 </div>
//               </div>

//               {/* Footer */}
//               <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
//                 <p className="text-sm text-gray-600">
//                   Data diperbarui:{" "}
//                   <span className="font-medium">
//                     19 Desember 2024, 14:30 WIB
//                   </span>
//                 </p>
//                 <button
//                   onClick={() => setShowStatsModal(false)}
//                   className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
//                 >
//                   Tutup
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Content Management Modal */}
//       <AnimatePresence>
//         {showContentModal &&
//           activeWebsite &&
//           (() => {
//             const currentTemplate = mockTemplates.find(
//               (t) => t.id === activeWebsite.template_id
//             );
//             const contentTypes = currentTemplate
//               ? getContentTypes(currentTemplate.slug)
//               : [];

//             return (
//               <motion.div
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//                 onClick={() => setShowContentModal(false)}
//               >
//                 <motion.div
//                   initial={{ scale: 0.95, opacity: 0 }}
//                   animate={{ scale: 1, opacity: 1 }}
//                   exit={{ scale: 0.95, opacity: 0 }}
//                   onClick={(e) => e.stopPropagation()}
//                   className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
//                 >
//                   {/* Header */}
//                   <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
//                     <div>
//                       <h3 className="text-xl font-bold text-gray-900">
//                         Kelola Konten Website
//                       </h3>
//                       <p className="text-sm text-gray-600 mt-1">
//                         Template: {currentTemplate?.name}
//                       </p>
//                     </div>
//                     <button
//                       onClick={() => setShowContentModal(false)}
//                       className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                     >
//                       <X className="w-5 h-5 text-gray-500" />
//                     </button>
//                   </div>

//                   {/* Content - Scrollable */}
//                   <div className="px-6 py-6 overflow-y-auto flex-1">
//                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//                       {contentTypes.map((contentType) => {
//                         const IconComponent =
//                           {
//                             Newspaper,
//                             Image: ImageIcon,
//                             CalendarDays,
//                             BookOpen,
//                             Store,
//                             File,
//                             MessageSquare,
//                             Target,
//                             Landmark,
//                             CircleUser,
//                             Building2,
//                             MapPin,
//                             Ticket,
//                             Leaf,
//                             Lightbulb,
//                           }[contentType.icon] || FileText;

//                         const mockContent = getMockContentData(
//                           contentType.slug
//                         );
//                         const publishedCount = mockContent.filter(
//                           (c) => c.status === "published"
//                         ).length;
//                         const draftCount = mockContent.filter(
//                           (c) => c.status === "draft"
//                         ).length;

//                         const colorClasses =
//                           {
//                             blue: "bg-blue-50 border-blue-200 text-blue-600",
//                             purple:
//                               "bg-purple-50 border-purple-200 text-purple-600",
//                             green:
//                               "bg-green-50 border-green-200 text-green-600",
//                             orange:
//                               "bg-orange-50 border-orange-200 text-orange-600",
//                             pink: "bg-pink-50 border-pink-200 text-pink-600",
//                             gray: "bg-gray-50 border-gray-200 text-gray-600",
//                             teal: "bg-teal-50 border-teal-200 text-teal-600",
//                             indigo:
//                               "bg-indigo-50 border-indigo-200 text-indigo-600",
//                             amber:
//                               "bg-amber-50 border-amber-200 text-amber-600",
//                             rose: "bg-rose-50 border-rose-200 text-rose-600",
//                             cyan: "bg-cyan-50 border-cyan-200 text-cyan-600",
//                             emerald:
//                               "bg-emerald-50 border-emerald-200 text-emerald-600",
//                             sky: "bg-sky-50 border-sky-200 text-sky-600",
//                             violet:
//                               "bg-violet-50 border-violet-200 text-violet-600",
//                             lime: "bg-lime-50 border-lime-200 text-lime-600",
//                           }[contentType.color] ||
//                           "bg-gray-50 border-gray-200 text-gray-600";

//                         return (
//                           <motion.div
//                             key={contentType.id}
//                             initial={{ opacity: 0, y: 20 }}
//                             animate={{ opacity: 1, y: 0 }}
//                             className={`p-5 border-2 rounded-xl hover:shadow-lg transition-all cursor-pointer group ${colorClasses}`}
//                             onClick={() => {
//                               setSelectedContentType(contentType);
//                               setShowContentEditor(true);
//                             }}
//                           >
//                             <div className="flex items-start justify-between mb-3">
//                               <div
//                                 className={`p-3 rounded-lg ${colorClasses} bg-opacity-50`}
//                               >
//                                 <IconComponent className="w-6 h-6" />
//                               </div>
//                               {!contentType.isCore && (
//                                 <span className="px-2 py-1 bg-white bg-opacity-50 text-xs font-medium rounded-full">
//                                   Khusus
//                                 </span>
//                               )}
//                             </div>

//                             <h4 className="font-bold text-gray-900 mb-1 group-hover:text-teal-700 transition-colors">
//                               {contentType.name}
//                             </h4>
//                             <p className="text-xs text-gray-600 mb-4">
//                               {contentType.description}
//                             </p>

//                             <div className="flex items-center justify-between text-sm">
//                               <div className="flex items-center gap-3">
//                                 <div className="flex items-center gap-1">
//                                   <CheckCircle2 className="w-4 h-4 text-green-600" />
//                                   <span className="font-semibold text-gray-900">
//                                     {publishedCount}
//                                   </span>
//                                 </div>
//                                 <div className="flex items-center gap-1">
//                                   <Edit className="w-4 h-4 text-orange-600" />
//                                   <span className="font-semibold text-gray-900">
//                                     {draftCount}
//                                   </span>
//                                 </div>
//                               </div>
//                               <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
//                             </div>
//                           </motion.div>
//                         );
//                       })}
//                     </div>

//                     {/* Info Banner */}
//                     <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
//                       <div className="flex items-start gap-3">
//                         <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
//                         <div>
//                           <p className="text-sm text-teal-900 font-medium">
//                             Konten Dinamis Per Template
//                           </p>
//                           <p className="text-xs text-teal-700 mt-1">
//                             Setiap template memiliki tipe konten dasar (core)
//                             dan tipe konten khusus yang sesuai dengan
//                             karakteristik template. Klik kartu untuk mengelola
//                             konten.
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Footer */}
//                   <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
//                     <button
//                       onClick={() => setShowContentModal(false)}
//                       className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
//                     >
//                       Tutup
//                     </button>
//                   </div>
//                 </motion.div>
//               </motion.div>
//             );
//           })()}
//       </AnimatePresence>

//       {/* Content Editor Modal */}
//       <AnimatePresence>
//         {showContentEditor &&
//           selectedContentType &&
//           (() => {
//             const mockContent = getMockContentData(selectedContentType.slug);
//             const IconComponent =
//               {
//                 Newspaper,
//                 Image: ImageIcon,
//                 CalendarDays,
//                 BookOpen,
//                 Store,
//                 File,
//                 MessageSquare,
//                 Target,
//                 Landmark,
//                 CircleUser,
//                 Building2,
//                 MapPin,
//                 Ticket,
//                 Leaf,
//                 Lightbulb,
//               }[selectedContentType.icon] || FileText;

//             return (
//               <motion.div
//                 initial={{ opacity: 0 }}
//                 animate={{ opacity: 1 }}
//                 exit={{ opacity: 0 }}
//                 className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
//                 onClick={() => {
//                   setShowContentEditor(false);
//                   setEditingContent(null);
//                   setContentFormData({
//                     title: "",
//                     content: "",
//                     date: "",
//                     image_url: "",
//                   });
//                 }}
//               >
//                 <motion.div
//                   initial={{ scale: 0.95, opacity: 0 }}
//                   animate={{ scale: 1, opacity: 1 }}
//                   exit={{ scale: 0.95, opacity: 0 }}
//                   onClick={(e) => e.stopPropagation()}
//                   className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col"
//                 >
//                   {/* Header */}
//                   <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
//                     <div className="flex items-center gap-3">
//                       <button
//                         onClick={() => {
//                           setShowContentEditor(false);
//                           setEditingContent(null);
//                           setContentFormData({
//                             title: "",
//                             content: "",
//                             date: "",
//                             image_url: "",
//                           });
//                         }}
//                         className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                       >
//                         <ChevronLeft className="w-5 h-5 text-gray-500" />
//                       </button>
//                       <div className="flex items-center gap-3">
//                         <IconComponent className="w-6 h-6 text-teal-600" />
//                         <div>
//                           <h3 className="text-xl font-bold text-gray-900">
//                             {selectedContentType.name}
//                           </h3>
//                           <p className="text-sm text-gray-600">
//                             {selectedContentType.description}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                     <button
//                       onClick={() => {
//                         setShowContentEditor(false);
//                         setEditingContent(null);
//                         setContentFormData({
//                           title: "",
//                           content: "",
//                           date: "",
//                           image_url: "",
//                         });
//                       }}
//                       className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
//                     >
//                       <X className="w-5 h-5 text-gray-500" />
//                     </button>
//                   </div>

//                   {/* Content - Scrollable */}
//                   <div className="px-6 py-6 overflow-y-auto flex-1">
//                     {!editingContent ? (
//                       <>
//                         {/* Add New Button */}
//                         <button
//                           onClick={() => {
//                             setEditingContent({
//                               id: 0,
//                               title: "",
//                               content: "",
//                               status: "draft",
//                               created_at: "",
//                               updated_at: "",
//                             } as ContentItem);
//                             setContentFormData({
//                               title: "",
//                               content: "",
//                               date: "",
//                               image_url: "",
//                             });
//                           }}
//                           className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all mb-4 flex items-center justify-center gap-2 text-gray-600 hover:text-teal-600 font-medium"
//                         >
//                           <Plus className="w-5 h-5" />
//                           Tambah {selectedContentType.name} Baru
//                         </button>

//                         {/* Content List */}
//                         <div className="space-y-3">
//                           {mockContent.length > 0 ? (
//                             mockContent.map((item) => (
//                               <div
//                                 key={item.id}
//                                 className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all"
//                               >
//                                 <div className="flex items-start justify-between gap-4">
//                                   <div className="flex-1 min-w-0">
//                                     {item.image_url && (
//                                       <img
//                                         src={item.image_url}
//                                         alt={item.title}
//                                         className="w-full h-32 object-cover rounded-lg mb-3"
//                                       />
//                                     )}
//                                     <h4 className="font-semibold text-gray-900 mb-1">
//                                       {item.title}
//                                     </h4>
//                                     {item.content && (
//                                       <p className="text-sm text-gray-600 line-clamp-2 mb-2">
//                                         {item.content}
//                                       </p>
//                                     )}
//                                     <div className="flex items-center gap-4 text-xs text-gray-500">
//                                       {item.date && (
//                                         <span className="flex items-center gap-1">
//                                           <Calendar className="w-3 h-3" />
//                                           {new Date(
//                                             item.date
//                                           ).toLocaleDateString("id-ID")}
//                                         </span>
//                                       )}
//                                       <span
//                                         className={`px-2 py-1 rounded-full font-medium ${
//                                           item.status === "published"
//                                             ? "bg-green-100 text-green-700"
//                                             : "bg-orange-100 text-orange-700"
//                                         }`}
//                                       >
//                                         {item.status === "published"
//                                           ? "Dipublikasi"
//                                           : "Draft"}
//                                       </span>
//                                     </div>
//                                   </div>
//                                   <div className="flex gap-2 shrink-0">
//                                     <button
//                                       onClick={() => {
//                                         setEditingContent(item);
//                                         setContentFormData({
//                                           title: item.title,
//                                           content: item.content || "",
//                                           date: item.date || "",
//                                           image_url: item.image_url || "",
//                                         });
//                                       }}
//                                       className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
//                                     >
//                                       <Edit className="w-4 h-4" />
//                                     </button>
//                                     <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
//                                       <Trash2 className="w-4 h-4" />
//                                     </button>
//                                   </div>
//                                 </div>
//                               </div>
//                             ))
//                           ) : (
//                             <div className="text-center py-12">
//                               <IconComponent className="w-12 h-12 text-gray-300 mx-auto mb-3" />
//                               <p className="text-gray-500">
//                                 Belum ada{" "}
//                                 {selectedContentType.name.toLowerCase()}
//                               </p>
//                               <p className="text-sm text-gray-400 mt-1">
//                                 Klik tombol di atas untuk menambah konten baru
//                               </p>
//                             </div>
//                           )}
//                         </div>
//                       </>
//                     ) : (
//                       /* Editor Form */
//                       <div className="space-y-4">
//                         <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
//                           <p className="text-sm text-teal-900 font-medium">
//                             {editingContent.id === 0 ? "Tambah" : "Edit"}{" "}
//                             {selectedContentType.name}
//                           </p>
//                         </div>

//                         {/* Title Field */}
//                         <div>
//                           <label className="block text-sm font-medium text-gray-700 mb-2">
//                             Judul *
//                           </label>
//                           <input
//                             type="text"
//                             value={contentFormData.title}
//                             onChange={(e) =>
//                               setContentFormData({
//                                 ...contentFormData,
//                                 title: e.target.value,
//                               })
//                             }
//                             placeholder="Masukkan judul..."
//                             className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                           />
//                         </div>

//                         {/* Date Field (for Berita, Agenda, Galeri) */}
//                         {["berita", "agenda", "galeri"].includes(
//                           selectedContentType.slug
//                         ) && (
//                           <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                               Tanggal{" "}
//                               {selectedContentType.slug === "agenda"
//                                 ? "Kegiatan"
//                                 : "Publikasi"}
//                             </label>
//                             <input
//                               type="date"
//                               value={contentFormData.date}
//                               onChange={(e) =>
//                                 setContentFormData({
//                                   ...contentFormData,
//                                   date: e.target.value,
//                                 })
//                               }
//                               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                             />
//                           </div>
//                         )}

//                         {/* Image URL Field (for Galeri, Produk) */}
//                         {["galeri", "produk", "destinasi"].includes(
//                           selectedContentType.slug
//                         ) && (
//                           <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                               URL Gambar
//                             </label>
//                             <div className="space-y-2">
//                               <input
//                                 type="url"
//                                 value={contentFormData.image_url}
//                                 onChange={(e) =>
//                                   setContentFormData({
//                                     ...contentFormData,
//                                     image_url: e.target.value,
//                                   })
//                                 }
//                                 placeholder="https://example.com/image.jpg"
//                                 className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
//                               />
//                               {contentFormData.image_url && (
//                                 <img
//                                   src={contentFormData.image_url}
//                                   alt="Preview"
//                                   className="w-full h-48 object-cover rounded-lg"
//                                   onError={(e) => {
//                                     (e.target as HTMLImageElement).src =
//                                       "https://via.placeholder.com/400x300?text=Invalid+URL";
//                                   }}
//                                 />
//                               )}
//                               <button className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-2">
//                                 <Upload className="w-4 h-4" />
//                                 Upload Gambar
//                               </button>
//                             </div>
//                           </div>
//                         )}

//                         {/* Content/Description Field */}
//                         {selectedContentType.slug !== "galeri" && (
//                           <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-2">
//                               {selectedContentType.slug === "berita"
//                                 ? "Konten Artikel"
//                                 : "Deskripsi"}
//                             </label>
//                             <SimpleRichTextEditor
//                               value={contentFormData.content}
//                               onChange={(value) =>
//                                 setContentFormData({
//                                   ...contentFormData,
//                                   content: value,
//                                 })
//                               }
//                               placeholder={`Tulis ${
//                                 selectedContentType.slug === "berita"
//                                   ? "artikel"
//                                   : "deskripsi"
//                               } di sini...`}
//                               minHeight={
//                                 selectedContentType.slug === "berita"
//                                   ? "400px"
//                                   : "200px"
//                               }
//                             />
//                             <p className="text-xs text-gray-500 mt-2">
//                               {selectedContentType.slug === "berita"
//                                 ? "Gunakan toolbar di atas untuk memformat teks, menambahkan heading, list, dan link"
//                                 : "Format teks Anda dengan toolbar yang tersedia"}
//                             </p>
//                           </div>
//                         )}

//                         {/* Action Buttons */}
//                         <div className="flex gap-3 pt-4">
//                           <button
//                             onClick={() => {
//                               setEditingContent(null);
//                               setContentFormData({
//                                 title: "",
//                                 content: "",
//                                 date: "",
//                                 image_url: "",
//                               });
//                             }}
//                             className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
//                           >
//                             Batal
//                           </button>
//                           <button className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium flex items-center justify-center gap-2">
//                             <Save className="w-4 h-4" />
//                             Simpan sebagai Draft
//                           </button>
//                           <button className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium flex items-center justify-center gap-2">
//                             <CheckCircle2 className="w-4 h-4" />
//                             Publikasikan
//                           </button>
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 </motion.div>
//               </motion.div>
//             );
//           })()}
//       </AnimatePresence>
//     </div>
//   );
// }

// export default WebsiteDesa;

const WebsitePage = () => {
  const router = useRouter();
  return (
    <FullPageStatus
      type="development"
      title="Halaman Website Desa Sedang Dikembangkan"
      message="Kami sedang mengerjakan fitur Website Desa. Nantikan pembaruan selanjutnya!"
      action={{
        label: "Kembali ke Dashboard",
        onClick: () => router.push("/dashboard"),
      }}
    >
      <div className="text-sm text-yellow-800 max-w-md mx-auto">
        <p>
          Fitur Website Desa akan memungkinkan Anda untuk membuat, mengelola,
          dan mempublikasikan konten desa secara online dengan mudah dan
          efektif, serta terintegrasi dengan sistem informasi desa.
        </p>
        <p>
          Kami akan sediakan berbagai template menarik untuk memudahkan Anda
          dalam membuat website desa yang profesional dan informatif.
        </p>
      </div>
    </FullPageStatus>
  );
};

export default WebsitePage;

import type { BillingProductType } from "@/lib/billing/catalog";
import type { SubscriptionMonths } from "@/lib/billing/duration";

export type PaymentMethod = "qris" | "va" | "ewallet";

export const ALL_PAYMENT_METHODS: readonly PaymentMethod[] = ["qris", "va", "ewallet"];

/** Permintaan pembayaran: satu-satunya hal yang perlu diketahui pemanggil. Semua UI & alur LinkQu ada di PaymentProvider. */
export type PaymentRequest = {
  productType: BillingProductType;
  planCode: string;
  /** Judul item di ringkasan, mis. "Kapasitas Absensi 20 Perangkat". */
  title: string;
  /**
   * Total yang ditampilkan SEBELUM tagihan dibuat. Nominal resmi selalu dihitung server.
   * Bila `durations` diisi, ini adalah harga PER BULAN dan dialog menghitung total sesuai durasi yang dipilih.
   */
  amount: number;
  /** Pilihan lama langganan (bulan) untuk produk berlangganan bulanan, mis. [1, 3, 6, 12]. Kosong = tanpa pilihan. */
  durations?: readonly SubscriptionMonths[];
  /** Keterangan di bawah total, mis. "Langganan 1 bulan". */
  note?: string;
  /** Diteruskan apa adanya ke /api/billing/checkout (server yang memvalidasi). */
  metadata?: Record<string, unknown>;
  /** Batasi metode bayar. Default semua. */
  methods?: readonly PaymentMethod[];
  /** Lanjutkan tagihan yang sudah ada (langsung ke langkah bayar) alih-alih membuat baru. */
  resumeInvoiceId?: string;
  /** Teks di layar sukses. */
  successMessage?: string;
  /** Dipanggil sekali ketika tagihan terkonfirmasi lunas (muat ulang data halaman, dsb). */
  onPaid?: () => void | Promise<void>;
};

export type PaymentInvoice = {
  id: string;
  invoiceNumber: string;
  productType: string;
  planCode: string;
  amount: number;
  status: string;
  expiresAt: string | null;
  paymentMethod: string | null;
  paymentUrl: string | null;
  qrContent: string | null;
  qrImageUrl: string | null;
  vaNumber: string | null;
  bankCode: string | null;
  createdAt: string;
};

export type VaBank = {
  id: string;
  label: string;
  linkquBankCode: string;
};

type Availability = { available: boolean; reason?: string };

/** Respons /api/billing/payment-options: apa yang sedang tersedia untuk nominal tertentu. */
export type PaymentOptions = {
  methods: Record<PaymentMethod, Availability>;
  banks: Array<VaBank & Availability>;
  ewallets: Array<{ id: string; label: string; retailCode: "PAYDANA" | "PAYLINKAJA" | "PAYSHOPEEPAY" } & Availability>;
};

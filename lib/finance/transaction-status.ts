/**
 * Status transaksi keuangan desa:
 * - `verified`  : dicatat langsung bendahara (Catat Pendapatan/Belanja/Transaksi) — sudah sah.
 * - `pending`   : SPP diajukan, belum dibayar.
 * - `approved`  : SPP disetujui — dihitung sebagai kas keluar.
 * - `rejected`  : SPP ditolak — tidak pernah terjadi.
 */
const COUNTED = new Set(["verified", "approved"]);
const SPP_FLOW = new Set(["pending", "approved", "rejected"]);

/** Hanya transaksi yang benar-benar terjadi yang masuk realisasi, tren, dan saldo kas. */
export function isCountedTransactionStatus(status: string | null | undefined): boolean {
  return COUNTED.has(String(status ?? ""));
}

/** Belanja langsung berstatus `verified`; yang melewati alur persetujuan SPP berstatus pending/approved/rejected. */
export function isSppFlowStatus(status: string | null | undefined): boolean {
  return SPP_FLOW.has(String(status ?? ""));
}

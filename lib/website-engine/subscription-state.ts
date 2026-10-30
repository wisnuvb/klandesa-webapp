/** Langganan website tayang hanya bila aktif dan belum melewati tanggal berakhir. */
export function isWebsiteSubscriptionLive(
  sub: { isActive: boolean; expiryDate: Date } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!sub || !sub.isActive) return false;
  return sub.expiryDate.getTime() > now.getTime();
}

/** Tanggal berakhir baru setelah pembelian 1 tahun; perpanjangan template yang sama menyambung sisa masa aktif. */
export function nextWebsiteExpiry(params: {
  now: Date;
  currentExpiry: Date | null;
  /** true bila template yang dibayar sama dengan template langganan saat ini */
  sameTemplate: boolean;
}): Date {
  const { now, currentExpiry, sameTemplate } = params;
  const base =
    sameTemplate && currentExpiry && currentExpiry.getTime() > now.getTime()
      ? new Date(currentExpiry)
      : new Date(now);
  base.setFullYear(base.getFullYear() + 1);
  return base;
}

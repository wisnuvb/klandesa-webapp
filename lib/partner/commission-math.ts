/**
 * Hitungan komisi mitra (murni, tanpa DB). Bonus closing mengikuti harga Paket Lengkap yang berlaku, sehingga ikut berubah
 * bila harga paket diubah; nominal tetap hanya dipakai untuk aturan khusus per mitra yang tidak memakai persentase.
 */

export type ClosingRule = {
  /** Persentase dari harga paket. Bila terisi, dipakai lebih dulu. */
  closingBonusPercent: number | null;
  /** Nominal tetap (IDR), cadangan bila persentase kosong. */
  closingBonusAmount: number;
};

export function closingBonusFor(rule: ClosingRule, packagePriceIdr: number): number {
  const pct = rule.closingBonusPercent;
  if (pct != null && Number.isFinite(pct)) {
    if (pct <= 0 || !(packagePriceIdr > 0)) return 0;
    return Math.round((packagePriceIdr * pct) / 100);
  }
  return Number.isFinite(rule.closingBonusAmount) && rule.closingBonusAmount > 0 ? rule.closingBonusAmount : 0;
}

export function subscriptionShareFor(invoiceAmountIdr: number, sharePercent: number): number {
  if (!Number.isFinite(sharePercent) || sharePercent <= 0 || !(invoiceAmountIdr > 0)) return 0;
  return Math.round((invoiceAmountIdr * sharePercent) / 100);
}

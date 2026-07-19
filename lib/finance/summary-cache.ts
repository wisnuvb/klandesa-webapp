/** Cache GET /api/finance/summary — harus di-invalidate saat transaksi berubah */
export const FINANCE_SUMMARY_CACHE_MS = 5 * 60 * 1000;

export const financeSummaryCache = new Map<
  string,
  { data: unknown; timestamp: number }
>();

export function invalidateFinanceSummaryCache(villageId: number): void {
  const prefix = `finance-${villageId}-`;
  for (const key of [...financeSummaryCache.keys()]) {
    if (key.startsWith(prefix)) {
      financeSummaryCache.delete(key);
    }
  }
}

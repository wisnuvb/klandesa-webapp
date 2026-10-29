/** Pembatas laporan crash: tiap pesan hanya sekali dan maksimal `max` laporan per peluncuran, agar loop error tidak membanjiri server. */
export function createCrashGate(max = 5) {
  const seen = new Set<string>();
  return (message: string): boolean => {
    const key = message.slice(0, 120);
    if (seen.has(key) || seen.size >= max) return false;
    seen.add(key);
    return true;
  };
}

export function errorParts(e: unknown): { message: string; stack: string | null } {
  if (e instanceof Error) return { message: e.message || e.name || 'Error', stack: e.stack ?? null };
  if (typeof e === 'string') return { message: e, stack: null };
  try {
    return { message: JSON.stringify(e)?.slice(0, 300) ?? 'Error tidak dikenal', stack: null };
  } catch {
    return { message: 'Error tidak dikenal', stack: null };
  }
}

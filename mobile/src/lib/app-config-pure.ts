/** Bandingkan "2.0.1" vs "2.0.0": -1 | 0 | 1. Segmen non-angka dianggap 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export function needsForceUpdate(current: string, cfg: { minSupportedVersion: string }): boolean {
  return compareVersions(current, cfg.minSupportedVersion) < 0;
}


/** Unduh blob di browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri waktu browser memulai unduhan sebelum URL dicabut.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nama berkas dari header Content-Disposition; null bila tidak ada. */
export function filenameFromDisposition(header: string | null): string | null {
  const m = header?.match(/filename="?([^";]+)"?/i);
  return m ? m[1] : null;
}

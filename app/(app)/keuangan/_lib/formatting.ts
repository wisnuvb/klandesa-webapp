export function formatRupiah(angka: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(angka);
}

export function formatRupiahShort(angka: number) {
  if (angka >= 1000000000) {
    return `Rp ${(angka / 1000000000).toFixed(2)} M`;
  }
  if (angka >= 1000000) {
    return `Rp ${(angka / 1000000).toFixed(2)} Jt`;
  }
  return formatRupiah(angka);
}

export function formatTanggalShort(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTanggalLong(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

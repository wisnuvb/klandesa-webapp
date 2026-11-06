"use client";

import { useEffect, useState } from "react";

/**
 * QR dirender DI PERANGKAT (pustaka `qrcode` dimuat malas): URI otpauth yang memuat rahasia TOTP tidak pernah dikirim
 * ke layanan pihak ketiga. Latar putih tetap agar terbaca pemindai di tema gelap.
 */
export function QrCode({ value, size = 192 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setFailed(false);
    import("qrcode")
      .then((m) => m.toDataURL(value, { margin: 2, width: size * 2, errorCorrectionLevel: "M" }))
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (failed) return <p className="text-sm text-destructive">Kode QR gagal dibuat. Gunakan kunci manual di samping.</p>;
  if (!src) return <div className="animate-pulse rounded-md bg-muted motion-reduce:animate-none" style={{ width: size, height: size }} role="status" aria-label="Membuat kode QR" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="Kode QR untuk ditambahkan ke aplikasi autentikator" className="rounded-md border bg-white" />;
}

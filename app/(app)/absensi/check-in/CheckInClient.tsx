"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";

export default function CheckInClient() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runCheckIn = () => {
    setError(null);
    setSuccess(null);

    if (!navigator.geolocation) {
      setError("Peramban Anda tidak mendukung lokasi GPS.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/attendance/check-in", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "GPS",
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            const msg =
              data && typeof data === "object" && "error" in data
                ? String((data as { error: unknown }).error)
                : "Check-in gagal";
            throw new Error(msg);
          }
          if (data?.alreadyCheckedIn) {
            setSuccess(
              `Sudah absen hari ini pukul ${data.checkInAt ? new Date(data.checkInAt).toLocaleTimeString("id-ID") : ""}.`,
            );
          } else {
            setSuccess(
              `Absensi GPS berhasil. Status: ${data?.status ?? ""}. ${data?.officialName ?? ""}`,
            );
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Check-in gagal");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setError(
          "Izin lokasi ditolak atau tidak tersedia. Aktifkan GPS/akses lokasi untuk browser ini.",
        );
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 p-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 text-teal-700 mb-2">
          <MapPin className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Absensi masuk (GPS)</h1>
        <p className="text-sm text-gray-600">
          Pastikan add-on GPS desa aktif, titik kantor sudah diatur, dan email
          akun Anda sama dengan data di menu Perangkat Desa.
        </p>
      </div>

      <button
        type="button"
        onClick={() => runCheckIn()}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors"
      >
        {loading ? "Memproses…" : "Gunakan lokasi & check-in"}
      </button>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-teal-900 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          {success}
        </div>
      )}
    </div>
  );
}

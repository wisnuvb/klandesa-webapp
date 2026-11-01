"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/hooks/use-permissions";

type Props = {
  initial: boolean;
};

/**
 * Pengaturan desa: produk baru dari warga diperiksa admin dulu (aktif) atau langsung tayang (mati).
 * Produk yang sengaja ditutup admin tetap harus diajukan ulang, apa pun pengaturan ini.
 */
export default function UkmModerationSetting({ initial }: Props) {
  const { can } = usePermissions();
  const [moderation, setModeration] = useState(initial);
  const [saving, setSaving] = useState(false);
  const labelId = useId();
  const descId = useId();
  const canEdit = can("ukm", "update");

  const change = async (next: boolean) => {
    const prev = moderation;
    setModeration(next);
    setSaving(true);
    try {
      const res = await fetch("/api/ukm-products/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderation: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan pengaturan");
      toast.success(next ? "Produk warga akan diperiksa dulu" : "Produk warga langsung tayang");
    } catch (error) {
      setModeration(prev);
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-gray-900">
          Periksa produk warga sebelum tayang
        </p>
        <p id={descId} className="mt-1 text-sm text-gray-600">
          {moderation
            ? "Produk baru dari aplikasi warga menunggu persetujuan Anda. Produk yang sudah tayang bisa diperbaiki pemiliknya tanpa diperiksa ulang."
            : "Produk baru dari aplikasi warga langsung tayang di katalog. Anda tetap bisa menyembunyikan produk kapan saja. Produk yang Anda sembunyikan harus disetujui lagi bila diperbaiki pemiliknya."}
        </p>
      </div>
      <Switch
        checked={moderation}
        onCheckedChange={change}
        disabled={!canEdit || saving}
        aria-labelledby={labelId}
        aria-describedby={descId}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}

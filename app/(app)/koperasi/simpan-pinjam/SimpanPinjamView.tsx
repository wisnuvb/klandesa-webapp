"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinjamanTab } from "./PinjamanTab";
import { ShuTab } from "./ShuTab";
import { SimpananTab } from "./SimpananTab";

const TABS = [
  { id: "simpanan", label: "Simpanan" },
  { id: "pinjaman", label: "Pinjaman" },
  { id: "shu", label: "Hitung SHU" },
] as const;

export function SimpanPinjamView() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("simpanan");
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button asChild variant="ghost" className="min-h-11">
          <Link href="/koperasi">
            <ArrowLeft aria-hidden="true" />
            Kembali ke Koperasi
          </Link>
        </Button>
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">Simpan Pinjam</h1>
          <p className="max-w-prose text-muted-foreground">
            Catat simpanan anggota (pokok, wajib, sukarela) dan pinjaman beserta angsurannya. Ini pencatatan internal koperasi; bukan pengganti pembukuan dan pelaporan resmi kepada pengawas koperasi.
          </p>
        </header>
      </div>
      <div role="tablist" aria-label="Bagian simpan pinjam" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t.id} role="tab" type="button" aria-selected={tab === t.id} variant={tab === t.id ? "default" : "outline"} className="min-h-11" onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>
      <div role="tabpanel">{tab === "simpanan" ? <SimpananTab /> : tab === "pinjaman" ? <PinjamanTab /> : <ShuTab />}</div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { HeartHandshake, ExternalLink, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";

type NationalResource = {
  title: string;
  description: string;
  href: string;
  hint: string;
};

type Locality = {
  villageName: string;
  district: string;
  regency: string;
  province: string;
};

type CheckEntry = {
  programName: string;
  periodLabel: string | null;
  enrollmentSummary: string;
  locality: Locality;
};

type CheckResponse = {
  ok?: boolean;
  error?: string;
  disclaimers?: string[];
  nationalResources?: NationalResource[];
  entries?: CheckEntry[];
  messageForUser?: string;
};

export function CekBantuanProgramKeluargaPublic() {
  const [nik, setNik] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CheckResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/public/social-benefits/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nik: nik.replace(/\D/g, "") }),
      });
      const json = (await res.json().catch(() => ({}))) as CheckResponse;
      setData(json);
    } catch {
      setData({
        ok: false,
        error: "Gagal menghubungi server. Periksa jaringan Anda.",
      });
    } finally {
      setLoading(false);
    }
  };

  const national = data?.nationalResources ?? [];
  const disclaimers = data?.disclaimers ?? [];
  const entries = data?.entries ?? [];

  return (
    <div className="min-h-screen bg-linear-to-b from-teal-50/80 to-white pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
        <header className="text-center space-y-3 sm:space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 mb-1 sm:mb-2">
            <HeartHandshake className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Cek Bantuan Sosial &amp; Program Keluarga
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            Verifikasi ringkas berdasarkan catatan desa yang memanfaatkan
            Klandesa, ditambah arahan ke layanan resmi untuk program nasional.
          </p>
        </header>

        <Card className="border-teal-100 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Masukkan NIK</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Gunakan 16 digit sesuai KTP. Data yang muncul tidak mencantumkan
              nominal bantuan.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-1 sm:space-y-4 flex flex-col sm:flex-row gap-1 sm:gap-3">
              <Input
                inputMode="numeric"
                autoComplete="off"
                placeholder="Contoh: 3201010101010001"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                className="text-base sm:text-lg tracking-wide"
                maxLength={19}
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Memeriksa…
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Cek status
                  </>
                )}
              </Button>
            </form>

            {data?.error ? (
              <p
                className={cn(
                  "mt-4 text-sm",
                  data.ok === false ? "text-amber-800" : "text-red-600",
                )}
              >
                {data.error}
              </p>
            ) : null}

            {data?.messageForUser ? (
              <p className="mt-4 text-sm text-gray-700">
                {data.messageForUser}
              </p>
            ) : null}

            {entries.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {entries.map((row, i) => (
                  <li
                    key={`${row.programName}-${i}`}
                    className="rounded-xl border border-teal-100 bg-white p-4 shadow-xs"
                  >
                    <p className="font-semibold text-gray-900">
                      {row.programName}
                    </p>
                    {row.periodLabel ? (
                      <p className="text-sm text-teal-800 mt-0.5">
                        Periode: {row.periodLabel}
                      </p>
                    ) : null}
                    <p className="text-sm text-gray-600 mt-2">
                      {row.enrollmentSummary}
                    </p>
                    <p className="text-xs text-gray-500 mt-3">
                      {row.locality.villageName}, {row.locality.district},{" "}
                      {row.locality.regency}, {row.locality.province}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        {disclaimers.length > 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-600 space-y-2">
            {disclaimers.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
          </div>
        ) : null}

        {national.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Program nasional &amp; verifikasi resmi
            </h2>
            <p className="text-sm text-gray-600">
              Status kepesertaan PKH, BPNT, BST, dan program kemiskinan pusat
              mengikuti data dan aturan Kementerian Sosial serta instansi
              terkait—silakan gunakan tautan resmi di bawah.
            </p>
            <div className="grid gap-3 sm:grid-cols-1">
              {national.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {n.description}
                    </p>
                    <p className="text-xs text-teal-700 mt-2 uppercase tracking-wide">
                      {n.hint}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

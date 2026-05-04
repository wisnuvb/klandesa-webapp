"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Prospect = {
  id: string;
  villageName: string;
  district: string | null;
  regency: string | null;
  province: string | null;
  picName: string | null;
  picPhone: string | null;
  status: string;
  notes: string | null;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
};

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(d);
}

export default function MitraProspekPage() {
  const [items, setItems] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    villageName: "",
    district: "",
    regency: "",
    province: "",
    picName: "",
    picPhone: "",
    notes: "",
  });

  const canSubmit = useMemo(() => form.villageName.trim().length > 0, [form.villageName]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/partner/prospects", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { prospects?: Prospect[]; error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal memuat prospek");
      setItems(data?.prospects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat prospek");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/partner/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageName: form.villageName,
          district: form.district || null,
          regency: form.regency || null,
          province: form.province || null,
          picName: form.picName || null,
          picPhone: form.picPhone || null,
          notes: form.notes || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan prospek");
      setForm({
        villageName: "",
        district: "",
        regency: "",
        province: "",
        picName: "",
        picPhone: "",
        notes: "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan prospek");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah prospek desa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nama desa</div>
              <Input
                value={form.villageName}
                onChange={(e) => setForm((p) => ({ ...p, villageName: e.target.value }))}
                placeholder="Contoh: Desa Sukamaju"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Kecamatan</div>
              <Input
                value={form.district}
                onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
                placeholder="Contoh: Depok"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Kabupaten/Kota</div>
              <Input
                value={form.regency}
                onChange={(e) => setForm((p) => ({ ...p, regency: e.target.value }))}
                placeholder="Contoh: Sleman"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">Provinsi</div>
              <Input
                value={form.province}
                onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                placeholder="Contoh: DI Yogyakarta"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">PIC (nama)</div>
              <Input
                value={form.picName}
                onChange={(e) => setForm((p) => ({ ...p, picName: e.target.value }))}
                placeholder="Nama kontak"
              />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium">PIC (HP)</div>
              <Input
                value={form.picPhone}
                onChange={(e) => setForm((p) => ({ ...p, picPhone: e.target.value }))}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Catatan</div>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Contoh: Sudah kontak sekdes, minta jadwal demo minggu depan"
              rows={4}
            />
          </div>
          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
          <Button className="w-full md:w-auto" disabled={!canSubmit || isSaving} onClick={submit}>
            {isSaving ? "Menyimpan…" : "Simpan prospek"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daftar prospek</CardTitle>
          <div className="text-sm text-muted-foreground">{loading ? "Memuat…" : `${items.length} item`}</div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada prospek. Tambahkan desa yang sedang Anda prospek.
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {items.map((p) => (
                  <div key={p.id} className="rounded-lg border border-border p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{p.villageName}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {[p.district, p.regency, p.province].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-muted-foreground shrink-0">{p.status}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Dibuat: {formatDate(p.createdAt)} · Next follow-up: {formatDate(p.nextFollowUpAt)}
                    </div>
                    {p.notes ? <div className="text-sm">{p.notes}</div> : null}
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-4 font-medium">Desa</th>
                      <th className="py-2 pr-4 font-medium">Wilayah</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Dibuat</th>
                      <th className="py-2 pr-4 font-medium">Next follow-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.id} className="border-b border-border">
                        <td className="py-2 pr-4 font-medium">{p.villageName}</td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {[p.district, p.regency, p.province].filter(Boolean).join(" · ") || "-"}
                        </td>
                        <td className="py-2 pr-4">{p.status}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatDate(p.createdAt)}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{formatDate(p.nextFollowUpAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

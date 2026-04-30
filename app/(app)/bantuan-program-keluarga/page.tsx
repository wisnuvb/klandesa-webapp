"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HeartHandshake,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

type BenefitEnrollmentApiStatus =
  | "registered"
  | "under_review"
  | "approved"
  | "active"
  | "completed"
  | "withdrawn";

type ProgramRow = {
  id: number;
  name: string;
  periodLabel: string | null;
  internalNote: string | null;
  isActive: boolean;
  sortOrder: number;
  beneficiaryCount: number;
};

type BeneficiaryRow = {
  id: number;
  nikMasked: string;
  publicNote: string | null;
  status: BenefitEnrollmentApiStatus;
};

const STATUS_OPTS: {
  value: BenefitEnrollmentApiStatus;
  label: string;
}[] = [
  { value: "registered", label: "Terdaftar" },
  { value: "under_review", label: "Dalam penilaian" },
  { value: "approved", label: "Disetujui" },
  { value: "active", label: "Aktif mengikuti" },
  { value: "completed", label: "Selesai (periode)" },
  { value: "withdrawn", label: "Dicabut / tidak lagi" },
];

export default function BantuanProgramKeluargaPage() {
  const { appAlert, appConfirm } = useAppDialogs();
  const [publicHref, setPublicHref] = useState("/cek-bantuan-program");

  const [programsLoading, setProgramsLoading] = useState(true);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [bensLoading, setBensLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);

  const [progDialogOpen, setProgDialogOpen] = useState(false);
  const [editingProg, setEditingProg] = useState<ProgramRow | null>(null);
  const [savingProg, setSavingProg] = useState(false);
  const [progForm, setProgForm] = useState({
    name: "",
    periodLabel: "",
    internalNote: "",
    isActive: true,
    sortOrder: 0,
  });

  const [benDialogOpen, setBenDialogOpen] = useState(false);
  const [editingBen, setEditingBen] = useState<BeneficiaryRow | null>(null);
  const [savingBen, setSavingBen] = useState(false);
  const [benForm, setBenForm] = useState({
    nik: "",
    status: "registered" as BenefitEnrollmentApiStatus,
    publicNote: "",
  });

  useEffect(() => {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    setPublicHref(origin ? `${origin}/cek-bantuan-program` : "/cek-bantuan-program");
  }, []);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === selectedId) ?? null,
    [programs, selectedId],
  );

  const loadPrograms = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const res = await fetch("/api/social-benefits/programs");
      if (!res.ok) throw new Error("Gagal memuat program");
      const data = (await res.json()) as { rows: ProgramRow[] };
      setPrograms(data.rows);
      setSelectedId((prev) =>
        prev && data.rows.some((r) => r.id === prev)
          ? prev
          : (data.rows[0]?.id ?? null),
      );
    } catch (e) {
      console.error(e);
      void appAlert("Tidak dapat memuat daftar program.");
    } finally {
      setProgramsLoading(false);
    }
  }, [appAlert]);

  const loadBeneficiaries = useCallback(
    async (programId: number) => {
      setBensLoading(true);
      try {
        const res = await fetch(
          `/api/social-benefits/programs/${programId}/beneficiaries`,
        );
        if (!res.ok) throw new Error("gagal");
        const data = (await res.json()) as { rows: BeneficiaryRow[] };
        setBeneficiaries(data.rows);
      } catch {
        void appAlert("Tidak dapat memuat peserta.");
        setBeneficiaries([]);
      } finally {
        setBensLoading(false);
      }
    },
    [appAlert],
  );

  useEffect(() => {
    void loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    if (!selectedId) {
      setBeneficiaries([]);
      return;
    }
    void loadBeneficiaries(selectedId);
  }, [selectedId, loadBeneficiaries]);

  const openNewProgram = () => {
    setEditingProg(null);
    setProgForm({
      name: "",
      periodLabel: "",
      internalNote: "",
      isActive: true,
      sortOrder: 0,
    });
    setProgDialogOpen(true);
  };

  const openEditProgram = (p: ProgramRow) => {
    setEditingProg(p);
    setProgForm({
      name: p.name,
      periodLabel: p.periodLabel ?? "",
      internalNote: p.internalNote ?? "",
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    });
    setProgDialogOpen(true);
  };

  const saveProgram = async () => {
    setSavingProg(true);
    try {
      if (editingProg) {
        const res = await fetch(
          `/api/social-benefits/programs/${editingProg.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: progForm.name,
              periodLabel: progForm.periodLabel || null,
              internalNote: progForm.internalNote || null,
              isActive: progForm.isActive,
              sortOrder: progForm.sortOrder,
            }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Gagal menyimpan");
        }
      } else {
        const res = await fetch("/api/social-benefits/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: progForm.name,
            periodLabel: progForm.periodLabel || null,
            internalNote: progForm.internalNote || null,
            isActive: progForm.isActive,
            sortOrder: progForm.sortOrder,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Gagal membuat");
        }
      }
      setProgDialogOpen(false);
      await loadPrograms();
    } catch (e: unknown) {
      void appAlert(e instanceof Error ? e.message : "Gagal menyimpan program");
    } finally {
      setSavingProg(false);
    }
  };

  const deleteProgram = async (p: ProgramRow) => {
    const ok = await appConfirm(
      `Hapus program "${p.name}" beserta semua peserta?`,
    );
    if (!ok) return;
    try {
      const res = await fetch(`/api/social-benefits/programs/${p.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      if (selectedId === p.id) setSelectedId(null);
      await loadPrograms();
    } catch {
      void appAlert("Gagal menghapus program.");
    }
  };

  const openNewBeneficiary = () => {
    if (!selectedId) return;
    setEditingBen(null);
    setBenForm({ nik: "", status: "registered", publicNote: "" });
    setBenDialogOpen(true);
  };

  const openEditBeneficiary = (b: BeneficiaryRow) => {
    setEditingBen(b);
    setBenForm({
      nik: "",
      status: b.status,
      publicNote: b.publicNote ?? "",
    });
    setBenDialogOpen(true);
  };

  const saveBeneficiary = async () => {
    if (!selectedId) return;
    setSavingBen(true);
    try {
      if (editingBen) {
        const body: Record<string, unknown> = {
          status: benForm.status,
          publicNote: benForm.publicNote.trim() || null,
        };
        const n = benForm.nik.replace(/\D/g, "");
        if (n.length === 16) body.nik = n;
        const res = await fetch(
          `/api/social-benefits/beneficiaries/${editingBen.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Gagal menyimpan");
        }
      } else {
        const res = await fetch(
          `/api/social-benefits/programs/${selectedId}/beneficiaries`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nik: benForm.nik.replace(/\D/g, ""),
              status: benForm.status,
              publicNote: benForm.publicNote.trim() || null,
            }),
          },
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || "Gagal menyimpan peserta");
        }
      }
      setBenDialogOpen(false);
      await loadBeneficiaries(selectedId);
    } catch (e: unknown) {
      void appAlert(e instanceof Error ? e.message : "Gagal menyimpan peserta");
    } finally {
      setSavingBen(false);
    }
  };

  const deleteBeneficiary = async (b: BeneficiaryRow) => {
    const ok = await appConfirm(`Hapus peserta (${b.nikMasked})?`);
    if (!ok || !selectedId) return;
    try {
      const res = await fetch(`/api/social-benefits/beneficiaries/${b.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await loadBeneficiaries(selectedId);
    } catch {
      void appAlert("Gagal menghapus peserta.");
    }
  };

  return (
    <div className="space-y-8 container mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-xl bg-teal-100 p-3 text-teal-700">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Bantuan sosial &amp; program keluarga
            </h2>
            <p className="text-sm text-gray-600 max-w-xl">
              Kelola program desa/APBDes dan peserta tercatat. Warga memeriksa
              status umum (tanpa nominal) lewat halaman publik Klandesa.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/cek-bantuan-program" target="_blank">
              <ExternalLink className="w-4 h-4 mr-1" />
              Lihat halaman publik
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(publicHref);
              void appAlert("Tautan publik disalin.");
            }}
          >
            <Copy className="w-4 h-4 mr-1" />
            Salin tautan
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Program</CardTitle>
              <CardDescription>
                Satu program bisa punya banyak peserta (per NIK).
              </CardDescription>
            </div>
            <Button size="sm" onClick={openNewProgram}>
              <Plus className="w-4 h-4 mr-1" />
              Baru
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {programsLoading ? (
              <div className="flex justify-center py-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : programs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Belum ada program. Tambahkan program pertama Anda.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {programs.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full text-left rounded-lg border px-3 py-3 transition-colors ${
                        selectedId === p.id
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between gap-2 items-start">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {p.name}
                          </p>
                          {p.periodLabel ? (
                            <p className="text-xs text-teal-800 mt-0.5">
                              {p.periodLabel}
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-500 mt-1">
                            {p.beneficiaryCount} peserta •{" "}
                            {p.isActive ? "Aktif publik" : "Disembunyikan"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditProgram(p);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              void deleteProgram(p);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Peserta (NIK)</CardTitle>
              <CardDescription>
                {selectedProgram
                  ? selectedProgram.name
                  : "Pilih program di kiri."}
              </CardDescription>
            </div>
            <Button
              size="sm"
              disabled={!selectedId}
              onClick={openNewBeneficiary}
            >
              <Plus className="w-4 h-4 mr-1" />
              Peserta
            </Button>
          </CardHeader>
          <CardContent>
            {!selectedId ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                Pilih program untuk melihat daftar NIK.
              </p>
            ) : bensLoading ? (
              <div className="flex justify-center py-12 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : beneficiaries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">
                Belum ada peserta.
              </p>
            ) : (
              <ul className="space-y-2 max-h-[420px] overflow-y-auto">
                {beneficiaries.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{b.nikMasked}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {STATUS_OPTS.find((s) => s.value === b.status)?.label ??
                          b.status}
                      </p>
                      {b.publicNote ? (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          Catatan publik: {b.publicNote}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditBeneficiary(b)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => void deleteBeneficiary(b)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-sm">Akuntabilitas minimal</CardTitle>
          <CardDescription>
            Pembaruan tercermin dari kolom pembaruan di basis data sistem.
            Rekomendasikan pembukuan manual APBDes atas tiap penyaluran.
          </CardDescription>
        </CardHeader>
      </Card>

      <Dialog open={progDialogOpen} onOpenChange={setProgDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingProg ? "Ubah program" : "Program baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="p-name">Nama program</Label>
              <Input
                id="p-name"
                value={progForm.name}
                onChange={(e) =>
                  setProgForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder='mis. BLT penyaluran 2026'
              />
            </div>
            <div>
              <Label htmlFor="p-period">Label periode (opsional)</Label>
              <Input
                id="p-period"
                value={progForm.periodLabel}
                onChange={(e) =>
                  setProgForm((f) => ({ ...f, periodLabel: e.target.value }))
                }
                placeholder="mis. Tahap I / Mei 2026"
              />
            </div>
            <div>
              <Label htmlFor="p-note">Catatan internal (tidak ditampilkan)</Label>
              <Textarea
                id="p-note"
                value={progForm.internalNote}
                onChange={(e) =>
                  setProgForm((f) => ({ ...f, internalNote: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Urutan</Label>
                <Input
                  type="number"
                  value={progForm.sortOrder}
                  onChange={(e) =>
                    setProgForm((f) => ({
                      ...f,
                      sortOrder: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={progForm.isActive}
                    onChange={(e) =>
                      setProgForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                  />
                  Program aktif (bisa dicek publik)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void saveProgram()} disabled={savingProg}>
              {savingProg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={benDialogOpen} onOpenChange={setBenDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBen ? "Ubah peserta" : "Peserta baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div>
              <Label htmlFor="b-nik">NIK (16 digit)</Label>
              <Input
                id="b-nik"
                inputMode="numeric"
                value={benForm.nik}
                onChange={(e) =>
                  setBenForm((f) => ({ ...f, nik: e.target.value }))
                }
                placeholder={editingBen ? "Kosongkan jika tidak diubah" : ""}
                disabled={false}
              />
              {editingBen ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Saat ini tidak ditampilkan penuh di panel; isi ulang hanya jika
                  mengganti NIK.
                </p>
              ) : null}
            </div>
            <div>
              <Label>Status ringkas</Label>
              <Select
                value={benForm.status}
                onValueChange={(v) =>
                  setBenForm((f) => ({
                    ...f,
                    status: v as BenefitEnrollmentApiStatus,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="b-pub">Catatan publik singkat (opsional)</Label>
              <Textarea
                id="b-pub"
                value={benForm.publicNote}
                onChange={(e) =>
                  setBenForm((f) => ({ ...f, publicNote: e.target.value }))
                }
                rows={2}
                maxLength={240}
                placeholder="Override teks status untuk warga"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => void saveBeneficiary()}
              disabled={
                savingBen ||
                (!editingBen && benForm.nik.replace(/\D/g, "").length !== 16)
              }
            >
              {savingBen ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Simpan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

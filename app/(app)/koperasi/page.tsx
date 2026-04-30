"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Landmark, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/app/(app)/anggaran/_lib/currency";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import { useKoperasi } from "./_hooks/useKoperasi";
import { CoopStatsCards } from "./_components/CoopStatsCards";
import { CoopMemberDialog } from "./_components/CoopMemberDialog";
import { CoopProfileDialog } from "./_components/CoopProfileDialog";
import { CoopLedgerDialog } from "./_components/CoopLedgerDialog";
import type { CoopMemberRow } from "./_lib/types";

function roleLabel(role: string) {
  if (role === "manager") return "Manager";
  if (role === "board") return "Pengurus";
  return "Anggota (app)";
}

export default function KoperasiPage() {
  const k = useKoperasi();
  const { appConfirm } = useAppDialogs();
  const [memberDlg, setMemberDlg] = useState(false);
  const [editMember, setEditMember] = useState<CoopMemberRow | null>(null);
  const [profileDlg, setProfileDlg] = useState(false);
  const [ledgerDlg, setLedgerDlg] = useState(false);

  const coop = k.summary?.cooperative;
  const name = coop && typeof coop.name === "string" ? coop.name : "Koperasi";

  async function removeMember(row: CoopMemberRow) {
    const ok = await appConfirm({
      title: "Hapus anggota?",
      description: `${row.name} akan dihapus dari daftar anggota.`,
    });
    if (!ok) return;
    const res = await fetch(`/api/coop/members/${row.id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j?.error ?? "Gagal menghapus");
      return;
    }
    await k.refreshMembers();
    await k.refreshSummary();
  }

  async function removeLedger(id: number) {
    const ok = await appConfirm({
      title: "Hapus transaksi?",
      description: "Entri buku kas akan dihapus permanen dari catatan aplikasi.",
    });
    if (!ok) return;
    const res = await fetch(`/api/coop/ledger/${id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j?.error ?? "Gagal menghapus");
      return;
    }
    await k.refreshLedger();
    await k.refreshSummary();
  }

  if (k.loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Memuat…
      </div>
    );
  }

  if (k.blocked) {
    return (
      <Alert variant="destructive" className="max-w-xl">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Akses ditolak</AlertTitle>
        <AlertDescription>
          Akun Anda tidak memiliki akses modul Koperasi. Hubungi admin desa atau
          pengurus koperasi jika Anda seharusnya dapat masuk.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Landmark className="h-4 w-4" />
        <AlertTitle>Pencatatan internal</AlertTitle>
        <AlertDescription>
          Fitur ini untuk operasional desa; bukan pengganti pelaporan resmi kepada
          instansi pengawas koperasi. Pisahkan pembukuan koperasi dari APBDes.
        </AlertDescription>
      </Alert>

      {k.summary?.needsBootstrap ? (
        <Card>
          <CardHeader>
            <CardTitle>Belum ada koperasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Buat satu entri koperasi untuk desa ini. Anda dapat mengisi profil dan
              anggota setelahnya.
            </p>
            <Button
              onClick={() => void k.bootstrapCoop()}
              className="gap-2"
            >
              <Landmark className="h-4 w-4" />
              Aktifkan koperasi untuk desa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
              <p className="text-sm text-muted-foreground">
                Ringkasan anggota dan buku kas sederhana
              </p>
            </div>
            {k.canManage && coop && (
              <Button variant="outline" onClick={() => setProfileDlg(true)}>
                Edit profil
              </Button>
            )}
          </div>

          <CoopStatsCards summary={k.summary} loading={false} />

          <Tabs value={k.tab} onValueChange={(v) => k.setTab(v as typeof k.tab)}>
            <TabsList className="grid w-full grid-cols-3 md:w-[420px]">
              <TabsTrigger value="overview">Ringkasan</TabsTrigger>
              <TabsTrigger value="members">Anggota</TabsTrigger>
              <TabsTrigger value="ledger">Buku kas</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anggota terbaru</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {k.members.length} anggota terdaftar
                  </p>
                  <ul className="text-sm space-y-1">
                    {k.members.slice(0, 5).map((m) => (
                      <li key={m.id}>
                        {m.name}
                        {m.boardTitle ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {m.boardTitle}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {k.members.length > 5 && (
                    <Button
                      variant="link"
                      className="px-0 h-auto mt-2"
                      onClick={() => k.setTab("members")}
                    >
                      Lihat semua
                    </Button>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Transaksi terakhir</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2">
                    {k.ledger.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex justify-between gap-2">
                        <span>
                          {new Date(e.entryDate).toLocaleDateString("id-ID")}{" "}
                          {e.category}
                        </span>
                        <span
                          className={
                            e.direction === "income"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }
                        >
                          {e.direction === "income" ? "+" : "−"}
                          {formatCurrency(Number(e.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {k.ledger.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Belum ada transaksi.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="members" className="mt-4 space-y-4">
              {k.canManage && (
                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      setEditMember(null);
                      void k.refreshLinkUsers();
                      setMemberDlg(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Anggota baru
                  </Button>
                </div>
              )}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Akses</TableHead>
                        <TableHead>Jabatan</TableHead>
                        <TableHead>Akun</TableHead>
                        {k.canManage && <TableHead className="w-[100px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {k.members.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell>{roleLabel(m.coopAppRole)}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {m.boardTitle ?? "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {m.linkedUser
                              ? m.linkedUser.name
                              : "—"}
                          </TableCell>
                          {k.canManage && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditMember(m);
                                    void k.refreshLinkUsers();
                                    setMemberDlg(true);
                                  }}
                                  aria-label={`Edit ${m.name}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => void removeMember(m)}
                                  aria-label={`Hapus ${m.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {k.members.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={k.canManage ? 5 : 4}
                            className="text-center text-muted-foreground py-8"
                          >
                            Belum ada anggota.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ledger" className="mt-4 space-y-4">
              {k.canManage && (
                <div className="flex justify-end">
                  <Button className="gap-2" onClick={() => setLedgerDlg(true)}>
                    <Plus className="h-4 w-4" />
                    Transaksi
                  </Button>
                </div>
              )}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead>Oleh</TableHead>
                        {k.canManage && <TableHead className="w-[60px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {k.ledger.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            {new Date(e.entryDate).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell>
                            {e.direction === "income" ? "Masuk" : "Keluar"}
                          </TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell
                            className={`text-right tabular-nums ${
                              e.direction === "income"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {formatCurrency(Number(e.amount))}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {e.createdUser?.name ?? "—"}
                          </TableCell>
                          {k.canManage && (
                            <TableCell>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => void removeLedger(e.id)}
                                aria-label="Hapus transaksi"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {k.ledger.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={k.canManage ? 6 : 5}
                            className="text-center text-muted-foreground py-8"
                          >
                            Belum ada transaksi.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <CoopMemberDialog
        open={memberDlg}
        onOpenChange={setMemberDlg}
        linkUsers={k.linkUsers}
        editing={editMember}
        onSaved={async () => {
          await k.refreshMembers();
          await k.refreshSummary();
        }}
      />
      {coop && (
        <CoopProfileDialog
          open={profileDlg}
          onOpenChange={setProfileDlg}
          cooperative={coop}
          onSaved={async () => {
            await k.refreshSummary();
          }}
        />
      )}
      <CoopLedgerDialog
        open={ledgerDlg}
        onOpenChange={setLedgerDlg}
        onSaved={async () => {
          await k.refreshLedger();
          await k.refreshSummary();
        }}
      />

      <p className="text-xs text-muted-foreground">
        Butuh data warga?{" "}
        <Link href="/data-warga" className="underline underline-offset-2">
          Data Warga
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type RegionalUserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  scopeProvince: string | null;
  scopeRegency: string;
  scopeDistrict: string | null;
  scopeKodeProvinsi: string | null;
  scopeKodeKabKota: string | null;
  isActive: boolean;
  lastLogin: string | null;
};

const ROLES = [
  { value: "regional_provinsi", label: "Provinsi" },
  { value: "regional_kabupaten", label: "Kabupaten/Kota" },
  { value: "regional_kecamatan", label: "Kecamatan" },
];

export default function AdminPemdaPage() {
  const [rows, setRows] = useState<RegionalUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "regional_kabupaten",
    scopeProvince: "",
    scopeRegency: "",
    scopeDistrict: "",
    scopeKodeProvinsi: "",
    scopeKodeKabKota: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/regional-users", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as {
        users?: RegionalUserRow[];
        error?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error || "Gagal memuat");
      setRows(data?.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/regional-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json().catch(() => null)) as { error?: string };
      if (!res.ok) throw new Error(data?.error || "Gagal membuat akun");
      setShowForm(false);
      setForm({
        email: "",
        password: "",
        name: "",
        role: "regional_kabupaten",
        scopeProvince: "",
        scopeRegency: "",
        scopeDistrict: "",
        scopeKodeProvinsi: "",
        scopeKodeKabKota: "",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat akun");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: number, isActive: boolean) => {
    const res = await fetch(`/api/admin/regional-users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) await load();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <Link
            href="/admin"
            className="text-xs text-muted-foreground hover:underline"
          >
            ← Admin
          </Link>
          <h1 className="text-xl md:text-2xl font-semibold mt-1">
            Akun Pemda / Wilayah
          </h1>
          <p className="text-sm text-muted-foreground">
            Provisioning dashboard kabupaten, kecamatan, dan provinsi.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Batal" : "Tambah akun"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Akun baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scopeProvince">Provinsi (teks)</Label>
                <Input
                  id="scopeProvince"
                  value={form.scopeProvince}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scopeProvince: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scopeRegency">Kabupaten/Kota</Label>
                <Input
                  id="scopeRegency"
                  value={form.scopeRegency}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scopeRegency: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scopeDistrict">Kecamatan</Label>
                <Input
                  id="scopeDistrict"
                  value={form.scopeDistrict}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scopeDistrict: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kodeProv">Kode provinsi (BPS)</Label>
                <Input
                  id="kodeProv"
                  placeholder="e.g. 33"
                  value={form.scopeKodeProvinsi}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      scopeKodeProvinsi: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kodeKab">Kode kab/kota (BPS)</Label>
                <Input
                  id="kodeKab"
                  placeholder="e.g. 33.01"
                  value={form.scopeKodeKabKota}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      scopeKodeKabKota: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan akun"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Daftar akun ({loading ? "…" : rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>BPS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{u.role}</TableCell>
                  <TableCell className="text-xs max-w-[180px]">
                    {[u.scopeProvince, u.scopeRegency, u.scopeDistrict]
                      .filter(Boolean)
                      .join(" · ")}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {[u.scopeKodeProvinsi, u.scopeKodeKabKota]
                      .filter(Boolean)
                      .join(" / ") || "—"}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge>Aktif</Badge>
                    ) : (
                      <Badge variant="secondary">Nonaktif</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void toggleActive(u.id, u.isActive)}
                    >
                      {u.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

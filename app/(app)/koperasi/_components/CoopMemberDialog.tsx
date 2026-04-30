"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CoopMemberRow, LinkUserOption } from "../_lib/types";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkUsers: LinkUserOption[];
  editing: CoopMemberRow | null;
  onSaved: () => Promise<void>;
};

const ROLES_APP = [
  { value: "none", label: "Anggota (tanpa akses dashboard)" },
  { value: "board", label: "Pengurus (baca)" },
  { value: "manager", label: "Manager (kelola)" },
];

export function CoopMemberDialog({
  open,
  onOpenChange,
  linkUsers,
  editing,
  onSaved,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [nik, setNik] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [residentId, setResidentId] = useState("");
  const [status, setStatus] = useState("active");
  const [linkedUserId, setLinkedUserId] = useState<string>("none");
  const [coopAppRole, setCoopAppRole] = useState("none");
  const [boardTitle, setBoardTitle] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setNik(editing.nik ?? "");
      setMembershipNumber(editing.membershipNumber ?? "");
      setResidentId(editing.resident ? String(editing.resident.id) : "");
      setStatus(editing.status);
      setLinkedUserId(
        editing.linkedUserId ? String(editing.linkedUserId) : "none",
      );
      setCoopAppRole(editing.coopAppRole);
      setBoardTitle(editing.boardTitle ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setName("");
      setNik("");
      setMembershipNumber("");
      setResidentId("");
      setStatus("active");
      setLinkedUserId("none");
      setCoopAppRole("none");
      setBoardTitle("");
      setNotes("");
    }
  }, [open, editing]);

  async function submit() {
    if (!name.trim()) {
      toast.error("Nama anggota wajib diisi");
      return;
    }

    const body: Record<string, unknown> = {
      name: name.trim(),
      nik: nik.trim() || undefined,
      membershipNumber: membershipNumber.trim() || undefined,
      status,
      coopAppRole,
      boardTitle: boardTitle.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const rid = residentId.trim()
      ? parseInt(residentId.trim(), 10)
      : undefined;
    if (rid !== undefined && Number.isFinite(rid)) body.residentId = rid;

    if (editing) {
      body.linkedUserId =
        linkedUserId === "none"
          ? null
          : Number.isFinite(parseInt(linkedUserId, 10))
            ? parseInt(linkedUserId, 10)
            : null;
    } else {
      const linkId =
        linkedUserId !== "none" ? parseInt(linkedUserId, 10) : undefined;
      if (linkId !== undefined && Number.isFinite(linkId))
        body.linkedUserId = linkId;
    }

    if (!editing) {
      const linkId =
        linkedUserId !== "none" ? parseInt(linkedUserId, 10) : undefined;
      if (!linkId && coopAppRole !== "none") {
        toast.error("Pilih akun pengguna untuk peran Pengurus atau Manager");
        return;
      }
    } else {
      const lid =
        linkedUserId !== "none" ? parseInt(linkedUserId, 10) : undefined;
      if (!lid && coopAppRole !== "none") {
        toast.error("Pilih akun pengguna untuk peran Pengurus atau Manager");
        return;
      }
    }

    setSubmitting(true);
    try {
      const url = editing ? `/api/coop/members/${editing.id}` : "/api/coop/members";
      const method = editing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j?.error ?? "Gagal menyimpan");
        return;
      }
      toast.success(j?.message ?? "Tersimpan");
      onOpenChange(false);
      await onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Ubah anggota" : "Anggota baru"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nama</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>NIK (opsional)</Label>
              <Input value={nik} onChange={(e) => setNik(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>No. anggota (opsional)</Label>
              <Input
                value={membershipNumber}
                onChange={(e) => setMembershipNumber(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>ID warga Resident (opsional)</Label>
            <Input
              placeholder="mis. dari Data Warga"
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Tidak aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Akun dashboard (untuk akses aplikasi)</Label>
            <Select value={linkedUserId} onValueChange={setLinkedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Tanpa tautan akun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa tautan akun</SelectItem>
                {linkUsers.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Akses modul di aplikasi</Label>
            <Select value={coopAppRole} onValueChange={setCoopAppRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES_APP.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Jabatan pengurus / informasi struktur</Label>
            <Input
              placeholder="Mis. Ketua, Bendahara, Sekretaris"
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Catatan internal</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

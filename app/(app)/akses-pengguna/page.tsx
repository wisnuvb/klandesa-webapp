"use client";

import { useState } from "react";
import { Info, Loader2, UserPlus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AccountList } from "./_components/AccountList";
import { CreateAccountDialog } from "./_components/CreateAccountDialog";
import { PermissionEditorSheet } from "./_components/PermissionEditorSheet";
import { InviteResultDialog, type InviteNotice } from "@/components/permissions/InviteResultDialog";
import { useAccessUsers } from "./_hooks/useAccessUsers";
import type { AccountView } from "./_lib/types";

export default function AksesPenggunaPage() {
  const access = useAccessUsers();
  const [editing, setEditing] = useState<AccountView | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<InviteNotice | null>(null);

  // Sheet selalu memakai data terbaru dari daftar (mis. setelah reset kata sandi).
  const editingFresh = editing ? (access.users.find((u) => u.id === editing.id) ?? editing) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Akses Pengguna</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">Atur siapa yang boleh masuk dan apa saja yang boleh dilakukan tiap akun. Halaman ini hanya bisa dibuka Admin Desa.</p>
        </div>
        <Button type="button" className="h-11" onClick={() => setShowCreate(true)}>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          Buat akun dari perangkat
        </Button>
      </header>

      <Alert>
        <Info className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Cara kerjanya</AlertTitle>
        <AlertDescription>
          Setiap akun punya <strong>peran</strong> sebagai titik awal (Admin, Kepala Desa, Sekretaris, Staf). Dua staf boleh berbeda: buka “Atur akses” lalu tambah atau cabut izin per modul. Admin selalu punya akses penuh.
        </AlertDescription>
      </Alert>

      {access.isLoading ? (
        <p role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Memuat akun…
        </p>
      ) : access.error ? (
        <div role="alert" className="space-y-3 rounded-lg border border-destructive/40 p-4 text-sm">
          <p>{access.error}</p>
          <Button type="button" variant="outline" className="h-11" onClick={() => void access.reload()}>
            Coba lagi
          </Button>
        </div>
      ) : (
        <AccountList users={access.users} onEdit={setEditing} />
      )}

      <PermissionEditorSheet
        account={editingFresh}
        onClose={() => setEditing(null)}
        onSave={access.update}
        onNotice={setNotice}
      />

      <CreateAccountDialog
        open={showCreate}
        officials={access.officials}
        onOpenChange={setShowCreate}
        onCreate={async (body) => {
          const r = await access.create(body);
          return r.ok ? { ok: true as const, email: r.email, delivery: r.delivery } : r;
        }}
        onCreated={(c) => c.delivery && setNotice({ email: c.email, name: c.officialName, kind: "invite", delivery: c.delivery })}
      />

      <InviteResultDialog notice={notice} onClose={() => setNotice(null)} />
    </div>
  );
}

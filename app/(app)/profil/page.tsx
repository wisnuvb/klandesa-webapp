"use client";

import { User } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useNextAuthSession } from "@/hooks/use-nextauth-session";

export default function ProfilPage() {
  const { user, isLoading } = useNextAuthSession();
  const sessionUser = user as
    | {
        name?: string | null;
        email?: string | null;
        role?: string | null;
        village?: { name?: string | null } | null;
        villageCode?: string | null;
      }
    | null
    | undefined;
  const role = sessionUser?.role ?? "—";

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil akun</h1>
        <p className="text-sm text-muted-foreground">
          Informasi akun Anda yang masuk ke aplikasi admin desa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Data pengguna</CardTitle>
              <CardDescription>Diambil dari sesi login Anda.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoading ? (
            <p className="text-muted-foreground">Memuat…</p>
          ) : (
            <>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium text-right">
                  {sessionUser?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Email</span>
                <span className="text-right break-all">
                  {sessionUser?.email ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Peran</span>
                <span className="font-medium text-right">{role}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Desa</span>
                <span className="font-medium text-right">
                  {sessionUser?.village?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Kode desa</span>
                <span className="font-mono text-right">
                  {sessionUser?.villageCode ?? "—"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
